import "server-only";

/**
 * Twilio request helpers that need the framework's Request and Response.
 * The signature check itself is in lib/signatures.ts, and the string helpers
 * in lib/text.ts, so both can be tested without pulling Next in.
 */

export { twilioSignatureValid } from "./signatures";
export { formatPhone, xmlEscape } from "./text";

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

export function twiml(body: string): Response {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<Response>${body}</Response>`, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}
