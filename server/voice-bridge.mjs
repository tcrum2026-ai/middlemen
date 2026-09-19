/**
 * ConversationRelay bridge.
 *
 * Twilio does the speech-to-text and text-to-speech; this process sits between
 * that and the app, one WebSocket per live call. It is deliberately a dumb pipe:
 * every decision, every database write and the Claude call itself happen in the
 * Next app behind POST /api/voice/turn. That keeps SQLite to a single writer and
 * means this process can be restarted without losing anything but calls in
 * flight.
 *
 * Next's App Router cannot hold a long-lived WebSocket, which is why this is a
 * separate process at all.
 *
 *   node server/voice-bridge.mjs
 *
 * Protocol: https://www.twilio.com/docs/voice/twiml/connect/conversationrelay
 */

import { WebSocketServer } from "ws";

const PORT = Number(process.env.VOICE_BRIDGE_PORT ?? 8080);
const APP_URL = (process.env.VOICE_APP_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const SECRET = process.env.VOICE_BRIDGE_SECRET ?? "";

if (!SECRET) {
  console.error("VOICE_BRIDGE_SECRET is not set. The bridge refuses to start without it.");
  process.exit(1);
}

/**
 * Sentences, not tokens.
 *
 * ConversationRelay speaks each `text` message as it arrives, so sending raw
 * model tokens makes the voice stutter word by word. Sending the whole reply at
 * once adds the full generation time to the pause before the caller hears
 * anything. Splitting on sentence boundaries gets speech started after the first
 * clause while keeping prosody intact.
 */
function splitSentences(buffer) {
  const out = [];
  let rest = buffer;
  const boundary = /([.!?]+["')\]]*\s+|\n+)/;
  for (;;) {
    const match = boundary.exec(rest);
    if (!match) break;
    const end = match.index + match[0].length;
    const sentence = rest.slice(0, end).trim();
    if (sentence) out.push(sentence);
    rest = rest.slice(end);
  }
  return { sentences: out, rest };
}

async function callApp(path, payload) {
  const response = await fetch(`${APP_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-bridge-secret": SECRET },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json();
}

const server = new WebSocketServer({ port: PORT });
console.log(`Voice bridge listening on :${PORT}, app at ${APP_URL}`);

server.on("connection", (socket) => {
  /** Per-call state. One socket is exactly one phone call. */
  const call = {
    startedAt: Date.now(),
    businessId: "",
    callSid: "",
    from: "",
    conversationId: null,
    /** Set while a turn is in flight so a barge-in can discard its output. */
    generation: 0,
    busy: false,
    /** Utterances that arrived while we were still answering the last one. */
    queue: [],
  };

  const send = (message) => {
    if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
  };

  const speak = (text, { last = false } = {}) => {
    send({ type: "text", token: text, last, interruptible: true, preemptible: false });
  };

  const endCall = (reasonCode, reason) => {
    send({
      type: "end",
      handoffData: JSON.stringify({ businessId: call.businessId, reasonCode, reason: reason ?? "" }),
    });
  };

  async function handleUtterance(text) {
    if (call.busy) {
      // Twilio can deliver a second final prompt before we've answered the
      // first; queue it rather than running two turns against one history.
      call.queue.push(text);
      return;
    }
    call.busy = true;
    const generation = call.generation;

    try {
      const result = await callApp("/api/voice/turn", {
        businessId: call.businessId,
        callSid: call.callSid,
        from: call.from,
        text,
        conversationId: call.conversationId,
      });

      // The caller interrupted while we were thinking: their new utterance is
      // already queued, and this reply now answers a question they moved on from.
      if (generation !== call.generation) return;

      call.conversationId = result.conversationId ?? call.conversationId;

      if (result.reply) {
        const { sentences, rest } = splitSentences(`${result.reply} `);
        for (const sentence of sentences) speak(sentence);
        if (rest.trim()) speak(rest.trim());
        speak("", { last: true });
      }

      const signal = result.signal ?? { kind: "continue" };
      if (signal.kind === "transfer") endCall("transfer", signal.reason);
      else if (signal.kind === "hangup") endCall("completed", signal.reason);
    } catch (error) {
      console.error(`Turn failed on call ${call.callSid}:`, error.message);
      if (generation === call.generation) {
        speak("Sorry, I'm having trouble on my end. Let me put you through to someone.");
        speak("", { last: true });
        endCall("transfer", "Assistant error");
      }
    } finally {
      call.busy = false;
      const next = call.queue.shift();
      if (next) void handleUtterance(next);
    }
  }

  socket.on("message", async (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      console.warn("Bridge received non-JSON frame");
      return;
    }

    switch (message.type) {
      case "setup": {
        call.callSid = message.callSid ?? "";
        call.from = message.from ?? "";
        call.businessId = message.customParameters?.businessId ?? "";
        call.from = message.customParameters?.from || call.from;
        if (!call.businessId) {
          console.error("Setup arrived without a businessId parameter");
          endCall("error", "misconfigured");
          return;
        }
        console.log(`Call ${call.callSid} from ${call.from} → workspace ${call.businessId}`);
        // Opens the conversation record so the greeting Twilio already spoke
        // has somewhere to belong.
        try {
          const opened = await callApp("/api/voice/turn", {
            businessId: call.businessId,
            callSid: call.callSid,
            from: call.from,
            text: "",
            conversationId: null,
          });
          call.conversationId = opened.conversationId ?? null;
        } catch (error) {
          console.error("Could not open the call's conversation:", error.message);
        }
        return;
      }

      case "prompt": {
        // Interim results arrive with last:false; only act on the final one.
        if (message.last === false) return;
        const text = (message.voicePrompt ?? "").trim();
        if (text) await handleUtterance(text);
        return;
      }

      case "interrupt": {
        // Barge-in. Bump the generation so an in-flight turn's reply is dropped
        // instead of being spoken over what the caller just said.
        call.generation += 1;
        return;
      }

      case "dtmf": {
        const digit = message.digit ?? "";
        if (digit) await handleUtterance(`[caller pressed ${digit}]`);
        return;
      }

      case "error": {
        console.error(`ConversationRelay error on ${call.callSid}: ${message.description ?? "unknown"}`);
        return;
      }

      default:
        return;
    }
  });

  socket.on("close", () => {
    if (!call.callSid) return;
    const seconds = Math.round((Date.now() - call.startedAt) / 1000);
    console.log(`Call ${call.callSid} closed after ${seconds}s`);
    // Metered minutes come from the session we actually held, not from the
    // transcript's timestamps, which say nothing about silence.
    if (call.conversationId) {
      void callApp("/api/voice/turn", {
        businessId: call.businessId,
        callSid: call.callSid,
        from: call.from,
        text: "",
        conversationId: call.conversationId,
        endedSeconds: seconds,
      }).catch((error) => console.error("Could not record call duration:", error.message));
    }
  });

  socket.on("error", (error) => console.error("Socket error:", error.message));
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    console.log(`\n${signal} — closing the bridge.`);
    server.close(() => process.exit(0));
  });
}
