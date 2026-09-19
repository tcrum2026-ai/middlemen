import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Twilio signs each request with the full URL plus the sorted POST body.
 * https://www.twilio.com/docs/usage/security#validating-requests
 *
 * Shared by the SMS and voice webhooks — both are public URLs that cause the
 * app to spend money, so neither may act on an unsigned request.
 */
export function twilioSignatureValid(
  url: string,
  params: Record<string, string>,
  authToken: string,
  signature: string,
): boolean {
  const payload = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  const expected = createHmac("sha1", authToken).update(Buffer.from(payload, "utf8")).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * The URL Twilio signed. Behind a proxy the request URL is the internal one, so
 * the forwarded host and protocol have to be reapplied or every signature fails.
 */
export function publicUrl(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  if (host) {
    url.host = host;
    url.protocol = `${proto}:`;
  }
  return url.toString();
}

/** XML-escapes a value for interpolation into a TwiML attribute or node. */
export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function twiml(body: string): Response {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<Response>${body}</Response>`, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

/**
 * Renders E.164 as people actually read it. Falls back to the raw string for
 * anything that isn't a plain NANP number, because a wrong guess at grouping is
 * worse than no grouping.
 */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return raw.trim();
}
