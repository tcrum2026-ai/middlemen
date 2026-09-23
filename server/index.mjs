/**
 * The production server: the Next app and the phone-call relay in one
 * process, on one port.
 *
 * Phone calls need a long-lived WebSocket for Twilio's ConversationRelay,
 * which a Next route can't hold. Running the relay as a second process meant a
 * second public port with its own TLS — something a single-service host like
 * Render doesn't give you, so on those hosts calls had nowhere to connect.
 * Here the relay rides the site's own port at /voice-relay, so whatever
 * already serves https://your-site serves wss://your-site/voice-relay too.
 *
 *   node server/index.mjs        (what `npm run start` runs)
 */

import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";

process.env.NODE_ENV ??= "production";

// The relay reaches the app over loopback with this secret. Both ends live in
// this process, so when nobody configured one a per-boot secret is enough —
// one fewer thing to set before calls work.
if (!process.env.VOICE_BRIDGE_SECRET?.trim()) {
  process.env.VOICE_BRIDGE_SECRET = randomBytes(32).toString("base64url");
}

const { default: next } = await import("next");
const { attachVoiceRelay } = await import("./voice-bridge.mjs");

const port = Number(process.env.PORT ?? 3000);
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const app = next({ dev: false, dir, port });
const handle = app.getRequestHandler();
await app.prepare();

const server = createServer((request, response) => handle(request, response));
attachVoiceRelay(server, {
  path: "/voice-relay",
  appUrl: `http://127.0.0.1:${port}`,
  secret: process.env.VOICE_BRIDGE_SECRET,
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Lobby ready on :${port} — phone-call relay at /voice-relay`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    // Open call sockets would otherwise hold the process until they hang up.
    setTimeout(() => process.exit(0), 5_000).unref();
  });
}
