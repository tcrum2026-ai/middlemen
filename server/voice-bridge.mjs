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
 * Next's App Router cannot hold a long-lived WebSocket, so this can't be a
 * route. It normally runs inside server/index.mjs — the same process and port
 * as the site, at /voice-relay — so a single-service host like Render needs
 * nothing extra. It can still run on its own port for anyone who wants the
 * two apart:
 *
 *   node server/voice-bridge.mjs
 *
 * Protocol: https://www.twilio.com/docs/voice/twiml/connect/conversationrelay
 */

import { pathToFileURL } from "node:url";
import { WebSocketServer } from "ws";
import { splitSentences } from "./sentences.mjs";
import { callTokenValid } from "./call-token.mjs";

/**
 * One socket is exactly one phone call.
 *
 * @param {import("ws").WebSocket} socket
 * @param {{ appUrl: string, secret: string }} options
 */
export function handleRelayConnection(socket, { appUrl, secret }) {
  async function callApp(path, payload) {
    const response = await fetch(`${appUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-bridge-secret": secret },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`${path} returned ${response.status}`);
    return response.json();
  }

  /** Per-call state. One socket is exactly one phone call. */
  const call = {
    startedAt: Date.now(),
    businessId: "",
    callSid: "",
    from: "",
    conversationId: null,
    /** Only true once setup carried a token /api/voice/incoming minted for this call. */
    verified: false,
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
        // One call, one setup. A second could otherwise re-point a verified
        // socket at a different workspace.
        if (call.verified) return;
        call.callSid = message.callSid ?? "";
        call.from = message.from ?? "";
        call.businessId = message.customParameters?.businessId ?? "";
        call.from = message.customParameters?.from || call.from;
        if (!call.businessId) {
          console.error("Setup arrived without a businessId parameter");
          endCall("error", "misconfigured");
          return;
        }
        if (!callTokenValid(secret, call.businessId, call.callSid, message.customParameters?.token)) {
          console.warn(`Refused a relay connection claiming workspace ${call.businessId}: no valid call token.`);
          socket.close(1008, "unauthorized");
          return;
        }
        call.verified = true;
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
        if (!call.verified) return;
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
        if (!call.verified) return;
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
}

/**
 * Serves the relay on an existing HTTP server — the site's own — at `path`.
 * Any other upgrade request is refused, since nothing else here speaks WebSocket.
 *
 * @param {import("node:http").Server} httpServer
 * @param {{ path: string, appUrl: string, secret: string }} options
 */
export function attachVoiceRelay(httpServer, { path, appUrl, secret }) {
  const relay = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
  relay.on("connection", (socket) => handleRelayConnection(socket, { appUrl, secret }));
  httpServer.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url ?? "/", "http://relay").pathname;
    if (pathname !== path) {
      socket.destroy();
      return;
    }
    relay.handleUpgrade(request, socket, head, (ws) => relay.emit("connection", ws, request));
  });
  return relay;
}

// Standalone: `node server/voice-bridge.mjs`, on its own port.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.VOICE_BRIDGE_PORT ?? 8080);
  const appUrl = (process.env.VOICE_APP_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
  const secret = process.env.VOICE_BRIDGE_SECRET ?? "";
  if (!secret) {
    console.error("VOICE_BRIDGE_SECRET is not set. The bridge refuses to start without it.");
    process.exit(1);
  }
  const server = new WebSocketServer({ port, maxPayload: 64 * 1024 });
  server.on("connection", (socket) => handleRelayConnection(socket, { appUrl, secret }));
  console.log(`Voice bridge listening on :${port}, app at ${appUrl}`);
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      console.log(`\n${signal} — closing the bridge.`);
      server.close(() => process.exit(0));
    });
  }
}
