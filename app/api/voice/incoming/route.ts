import { ensureSeeded } from "@/lib/seed";
import { credentials } from "@/lib/integrations";
import { listBusinesses } from "@/lib/repo";
import { QUOTAS, rateLimitAll } from "@/lib/rate-limit";
import { canAnswerCalls } from "@/lib/entitlement";
import { publicUrl, twiml, twilioSignatureValid, xmlEscape } from "@/lib/twilio-signature";
import type { Business } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Finds the workspace whose Twilio number was dialled. */
function businessForNumber(to: string): Business | null {
  const digits = to.replace(/\D/g, "");
  if (!digits) return null;
  for (const business of listBusinesses()) {
    const creds = credentials(business.id, "twilio");
    if (creds?.from_number && creds.from_number.replace(/\D/g, "") === digits) return business;
  }
  return null;
}

/** Where the bridge listens. Same host by default, `wss` scheme, voice path. */
function bridgeUrl(request: Request): string {
  const configured = process.env.VOICE_BRIDGE_URL?.trim();
  if (configured) return configured;
  const url = new URL(publicUrl(request));
  const port = process.env.VOICE_BRIDGE_PORT?.trim() || "8080";
  return `wss://${url.hostname}:${port}`;
}

/**
 * Twilio hits this when someone calls the workspace's number. It answers with
 * TwiML that connects the caller to our WebSocket bridge through
 * ConversationRelay, which does the speech-to-text and text-to-speech.
 */
export async function POST(request: Request) {
  ensureSeeded();

  const form = await request.formData().catch(() => null);
  if (!form) return twiml("<Say>Sorry, something went wrong.</Say><Hangup/>");

  const params: Record<string, string> = {};
  for (const [key, value] of form.entries()) if (typeof value === "string") params[key] = value;

  const to = params.To ?? "";
  const from = params.From ?? "";
  const business = businessForNumber(to);
  if (!business) {
    console.warn(`Voice call to ${to} matched no workspace.`);
    return twiml("<Say>This number is not in service.</Say><Hangup/>");
  }

  // Signed with the workspace's own auth token, so an unsigned or forged
  // request can never make this app answer a call and spend model tokens.
  const creds = credentials(business.id, "twilio");
  const signature = request.headers.get("x-twilio-signature");
  if (!creds?.auth_token || !signature || !twilioSignatureValid(publicUrl(request), params, creds.auth_token, signature)) {
    return new Response("Bad signature", { status: 403 });
  }

  if (!canAnswerCalls(business)) {
    // Voice is off, out of allowance, or the subscription has lapsed. Ring the
    // human line rather than answering with something we cannot back.
    return business.call_handoff_number
      ? twiml(`<Dial>${xmlEscape(business.call_handoff_number)}</Dial>`)
      : twiml("<Say>Sorry, nobody is available to take your call right now.</Say><Hangup/>");
  }

  const limit = rateLimitAll([
    { key: `voice:from:${from}`, quota: QUOTAS.voicePerCaller },
    { key: `voice:biz:${business.id}`, quota: QUOTAS.voicePerWorkspace },
  ]);
  if (!limit.ok) {
    return business.call_handoff_number
      ? twiml(`<Dial>${xmlEscape(business.call_handoff_number)}</Dial>`)
      : twiml("<Say>We are taking more calls than usual. Please try again shortly.</Say><Hangup/>");
  }

  // Disclosure is spoken before anything else and is not configurable away —
  // several jurisdictions require telling a caller they reached an AI, and it
  // is the right thing to do regardless.
  //
  // The sentence after it is the important one. The most common complaint
  // about AI receptionists is not that they are AI; it is that the caller
  // could not work out how to reach a person. Knowing you may ask is not the
  // same as knowing the words, so the words are said out loud, at the start,
  // before anyone is frustrated enough to need them.
  //
  // Only when a transfer is actually possible. Offering to put someone
  // through to a number that does not exist is worse than not offering.
  const escapeHatch = business.call_handoff_number
    ? "Say \"real person\" at any point and I'll put you through."
    : "";

  const greeting = [
    business.voice_disclosure,
    escapeHatch,
    business.voice_greeting || `Thanks for calling ${business.name}. How can I help?`,
  ]
    .filter(Boolean)
    .join(" ");

  const action = new URL("/api/voice/handoff", publicUrl(request)).toString();

  return twiml(
    `<Connect action="${xmlEscape(action)}">` +
      `<ConversationRelay ` +
      `url="${xmlEscape(bridgeUrl(request))}" ` +
      `welcomeGreeting="${xmlEscape(greeting)}" ` +
      `voice="${xmlEscape(business.voice_name)}" ` +
      `interruptible="speech" ` +
      `dtmfDetection="true" ` +
      `reportInputDuringAgentSpeech="false">` +
      `<Parameter name="businessId" value="${xmlEscape(business.id)}"/>` +
      `<Parameter name="from" value="${xmlEscape(from)}"/>` +
      `</ConversationRelay>` +
      `</Connect>`,
  );
}
