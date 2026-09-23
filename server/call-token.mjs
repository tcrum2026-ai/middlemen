/**
 * Proof that a voice-relay WebSocket belongs to a real call.
 *
 * The relay has to be publicly reachable — Twilio connects to it — so on its
 * own it would take a connection from anyone and believe whatever workspace
 * id the first message claimed, then run model turns on that workspace's
 * bill. /api/voice/incoming only answers requests Twilio signed, so it mints
 * this token for the one call it just answered; the relay refuses any call
 * that doesn't carry it.
 *
 * Plain JS with no imports beyond node:crypto, because both the relay (plain
 * Node) and the Next route (TypeScript) need the exact same bytes.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

/** Long enough for Twilio to open the socket; short enough to be useless later. */
const TTL_MS = 2 * 60_000;

function sign(secret, businessId, callSid, expires) {
  return createHmac("sha256", secret).update(`voice-relay.${businessId}.${callSid}.${expires}`).digest("base64url");
}

/**
 * @param {string} secret
 * @param {string} businessId
 * @param {string} callSid
 * @param {number} [now]
 * @returns {string}
 */
export function issueCallToken(secret, businessId, callSid, now = Date.now()) {
  const expires = now + TTL_MS;
  return `${expires}.${sign(secret, businessId, callSid, expires)}`;
}

/**
 * @param {string} secret
 * @param {string} businessId
 * @param {string} callSid
 * @param {unknown} token
 * @param {number} [now]
 * @returns {boolean}
 */
export function callTokenValid(secret, businessId, callSid, token, now = Date.now()) {
  if (!secret || !businessId || !callSid || typeof token !== "string") return false;
  const dot = token.indexOf(".");
  if (dot < 1) return false;
  const expires = Number(token.slice(0, dot));
  if (!Number.isFinite(expires) || expires < now || expires > now + TTL_MS) return false;
  const expected = Buffer.from(sign(secret, businessId, callSid, expires));
  const given = Buffer.from(token.slice(dot + 1));
  return expected.length === given.length && timingSafeEqual(expected, given);
}
