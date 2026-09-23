/**
 * Places a fake phone call.
 *
 * Speaks to the voice bridge exactly as Twilio's ConversationRelay does, so the
 * whole path — bridge, /api/voice/turn, the assistant, transfer and hangup
 * signals, and the metered duration — can be exercised without a phone number,
 * a Twilio account, or a person to talk to.
 *
 *   node scripts/call.mjs <businessId> [utterance...]
 *
 * Needs the app running (`npm run start` — the relay is part of it), the
 * workspace's "Answer incoming calls with AI" switched on, and a
 * VOICE_BRIDGE_SECRET you set yourself, and the same value exported here, so
 * this can sign the call the way /api/voice/incoming does for a real one.
 * Exits non-zero if the assistant never says anything.
 */

import { WebSocket } from "ws";
import { issueCallToken } from "../server/call-token.mjs";

const [, , businessId, ...rest] = process.argv;
if (!businessId) {
  console.error("Usage: node scripts/call.mjs <businessId> [utterance...]");
  process.exit(2);
}

const SCRIPT = rest.length
  ? rest
  : [
      "Hi, how much is a boiler service?",
      "Great, can you book me in on Thursday morning?",
      "Actually, can I speak to a person?",
    ];

const url = process.env.VOICE_BRIDGE_WS ?? "ws://127.0.0.1:3000/voice-relay";
const secret = process.env.VOICE_BRIDGE_SECRET ?? "";
if (!secret) {
  console.error("Set VOICE_BRIDGE_SECRET to the value the app was started with.");
  process.exit(2);
}
const callSid = `CA${Date.now()}`;
const socket = new WebSocket(url);
const spoken = [];
let ended = null;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

socket.on("open", async () => {
  console.log(`→ call connected to ${url}`);
  socket.send(
    JSON.stringify({
      type: "setup",
      sessionId: "sim-session",
      callSid,
      from: "+15551234567",
      to: "+15557654321",
      customParameters: { businessId, from: "+15551234567", token: issueCallToken(secret, businessId, callSid) },
    }),
  );
  await wait(1500);

  for (const line of SCRIPT) {
    if (ended) break;
    console.log(`\n  caller: ${line}`);
    socket.send(JSON.stringify({ type: "prompt", voicePrompt: line, lang: "en-US", last: true }));
    // Long enough for a real model call, not just the scripted fallback.
    await wait(12_000);
  }

  await wait(1000);
  socket.close();
});

socket.on("message", (raw) => {
  const message = JSON.parse(raw.toString());
  if (message.type === "text") {
    if (message.token) {
      spoken.push(message.token);
      console.log(`  assistant: ${message.token}`);
    }
  } else if (message.type === "end") {
    ended = JSON.parse(message.handoffData ?? "{}");
    console.log(`\n→ call ended: ${ended.reasonCode}${ended.reason ? ` — ${ended.reason}` : ""}`);
  }
});

socket.on("close", () => {
  console.log(`\n${spoken.length} utterance${spoken.length === 1 ? "" : "s"} spoken.`);
  process.exit(spoken.length ? 0 : 1);
});

socket.on("error", (error) => {
  console.error("Bridge connection failed:", error.message);
  process.exit(1);
});
