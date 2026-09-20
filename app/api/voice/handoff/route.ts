import { ensureSeeded } from "@/lib/seed";
import { credentials } from "@/lib/integrations";
import { getBusiness } from "@/lib/repo";
import { publicUrl, twiml, twilioSignatureValid, xmlEscape } from "@/lib/twilio-signature";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Twilio requests this when the ConversationRelay session ends — either because
 * the assistant asked to transfer, or because it hung up. `handoffData` is the
 * JSON the bridge sent with its `end` message.
 */
export async function POST(request: Request) {
  ensureSeeded();

  const form = await request.formData().catch(() => null);
  if (!form) return twiml("<Hangup/>");

  const params: Record<string, string> = {};
  for (const [key, value] of form.entries()) if (typeof value === "string") params[key] = value;

  let businessId = "";
  let reasonCode = "";
  try {
    const parsed = JSON.parse(params.HandoffData ?? "{}");
    businessId = typeof parsed.businessId === "string" ? parsed.businessId : "";
    reasonCode = typeof parsed.reasonCode === "string" ? parsed.reasonCode : "";
  } catch {
    // Malformed handoff data just means we fall through to hanging up.
  }

  const business = businessId ? getBusiness(businessId) : null;
  if (!business) return twiml("<Hangup/>");

  const creds = credentials(business.id, "twilio");
  const signature = request.headers.get("x-twilio-signature");
  if (!creds?.auth_token || !signature || !twilioSignatureValid(publicUrl(request), params, creds.auth_token, signature)) {
    return new Response("Bad signature", { status: 403 });
  }

  if (reasonCode === "transfer" && business.call_handoff_number) {
    // The caller was told they are being put through, so connect them rather
    // than dropping the call. A missed transfer is worse than no transfer.
    return twiml(
      `<Say>Connecting you now.</Say><Dial timeout="25">${xmlEscape(business.call_handoff_number)}</Dial>` +
        `<Say>Sorry, nobody picked up. We have your details and will call you back.</Say><Hangup/>`,
    );
  }

  if (reasonCode === "transfer") {
    return twiml(
      "<Say>Sorry, I could not put you through to anyone right now. " +
        "I have taken your details and someone will call you back.</Say><Hangup/>",
    );
  }

  return twiml("<Hangup/>");
}
