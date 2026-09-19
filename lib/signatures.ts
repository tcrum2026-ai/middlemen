/**
 * Webhook signature verification for the two providers that can spend money
 * on a workspace's behalf.
 *
 * Deliberately free of `server-only` and of every other import in this
 * codebase: no database, no environment, no secrets baked in — each secret
 * arrives as an argument. That keeps these two functions runnable by the test
 * suite, which matters more here than anywhere else in the app. An inbound
 * SMS or call costs money at the model, and a billing webhook that accepts an
 * unsigned request is a way for a stranger to hand themselves a paid plan.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

/** Constant-time compare of two hex/base64 digests. */
function digestsMatch(expected: string, given: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Twilio signs the full URL plus the POST body's parameters, sorted by key and
 * concatenated without separators.
 * https://www.twilio.com/docs/usage/security#validating-requests
 */
export function twilioSignatureValid(
  url: string,
  params: Record<string, string>,
  authToken: string,
  signature: string,
): boolean {
  if (!authToken || !signature) return false;
  const payload = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  const expected = createHmac("sha1", authToken).update(Buffer.from(payload, "utf8")).digest("base64");
  return digestsMatch(expected, signature);
}

/**
 * Stripe signs `timestamp.payload` with HMAC-SHA256 and sends it as
 * `t=<unix>,v1=<hex>`. The timestamp is inside the signed material, so an
 * attacker cannot backdate a captured event — but they could still replay it
 * unchanged, which is what the tolerance window is for.
 */
export function stripeSignatureValid(
  rawBody: string,
  header: string | null,
  secret: string,
  toleranceSeconds = 300,
  nowMs: number = Date.now(),
): boolean {
  if (!header || !secret) return false;

  const parts: Record<string, string> = {};
  for (const piece of header.split(",")) {
    const index = piece.indexOf("=");
    if (index < 0) continue;
    const key = piece.slice(0, index).trim();
    // Stripe may send several v1 signatures during a secret rotation; the
    // first is the current one, and taking only the first keeps this simple
    // without accepting anything extra.
    if (!(key in parts)) parts[key] = piece.slice(index + 1).trim();
  }

  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const age = Math.abs(nowMs / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return digestsMatch(expected, signature);
}
