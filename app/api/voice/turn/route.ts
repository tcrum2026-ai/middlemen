import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { ensureSeeded } from "@/lib/seed";
import { runAssistantTurn } from "@/lib/assistant";
import { QUOTAS, rateLimit } from "@/lib/rate-limit";
import { formatPhone } from "@/lib/twilio-signature";
import { canAnswerCalls } from "@/lib/entitlement";
import { reportVoiceOverage, voiceMeterConfigured } from "@/lib/billing";
import { TRIAL_ALLOWANCE, planById } from "@/lib/marketing";
import { allowanceFor, overage } from "@/lib/plan-rules";
import {
  addMessage,
  createConversation,
  getBusiness,
  getConversation,
  listMessages,
  monthStart,
  monthlyVoiceSeconds,
  setCallDuration,
  updateConversation,
  upsertContact,
} from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  /** Sent once when the call ends, so answered minutes can be metered. */
  endedSeconds: z.number().int().min(0).max(14_400).optional(),
  businessId: z.string().min(3),
  callSid: z.string().min(3).max(64),
  from: z.string().max(40).default(""),
  /** Empty on the first call of a session, which only opens the conversation. */
  text: z.string().max(4000).default(""),
  conversationId: z.string().nullish(),
});

/**
 * The thinking half of a phone call.
 *
 * The WebSocket bridge is a separate process, so it reaches the assistant — and
 * the database — through here. Keeping every write in the Next process means
 * SQLite still has exactly one writer, and the bridge stays a dumb pipe that
 * can be restarted without touching state.
 */
export async function POST(request: Request) {
  ensureSeeded();

  // Shared secret rather than a signature: this endpoint is not reachable by
  // Twilio, only by our own bridge, and it must never be callable by anyone else.
  const secret = process.env.VOICE_BRIDGE_SECRET?.trim();
  if (!secret) {
    console.error("Voice turn rejected: VOICE_BRIDGE_SECRET is not set.");
    return Response.json({ error: "Voice is not configured" }, { status: 503 });
  }
  const provided = request.headers.get("x-bridge-secret") ?? "";
  if (provided.length !== secret.length || !timingSafeEqual(Buffer.from(provided), Buffer.from(secret))) {
    return Response.json({ error: "Bad secret" }, { status: 403 });
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request body" }, { status: 400 });
  const { businessId, callSid, from, text, conversationId } = parsed.data;

  const business = getBusiness(businessId);
  if (!business) return Response.json({ error: "Unknown workspace" }, { status: 404 });

  // The bridge sends this once, as the socket closes. It is a meter reading for
  // minutes already served, so it is recorded before the entitlement check —
  // otherwise a subscription that lapsed mid-call would lose the call's usage.
  if (typeof parsed.data.endedSeconds === "number") {
    const ended = conversationId ? getConversation(conversationId) : null;
    // Guards against reporting the same call's usage twice: the bridge posts
    // this once as the socket closes, but if it were ever retried, a second
    // POST would find duration_seconds already non-zero and skip both the
    // overwrite and the Stripe report rather than billing the minutes again.
    if (ended && ended.business_id === business.id && ended.duration_seconds === 0) {
      const since = monthStart();
      const secondsBefore = monthlyVoiceSeconds(business.id, since);
      const seconds = Math.max(0, Math.round(parsed.data.endedSeconds));
      setCallDuration(ended.id, seconds);

      const trialing = business.subscription_status === "trialing";
      // A trial is never charged for overage — `overage().minutes` still
      // counts minutes past the trial allowance for display purposes (the
      // billing page shows "10 minutes over" at $0 owed), so this has to be
      // its own guard rather than trusting that count to mean "billable".
      if (!trialing && voiceMeterConfigured() && business.stripe_customer_id) {
        const plan = planById(business.plan);
        const allowance = allowanceFor(
          trialing,
          { conversations: plan.conversations, voiceMinutes: plan.voiceMinutes },
          TRIAL_ALLOWANCE,
        );
        // Report only the minutes this call newly pushed past the allowance —
        // never the whole call, or a workspace deep in overage gets billed
        // for every minute of every call all over again each time one ends.
        const before = overage(Math.ceil(secondsBefore / 60), allowance, plan.overagePerMinute, trialing).minutes;
        const after = overage(
          Math.ceil((secondsBefore + seconds) / 60),
          allowance,
          plan.overagePerMinute,
          trialing,
        ).minutes;
        const newlyBillable = after - before;

        if (newlyBillable > 0) {
          const result = await reportVoiceOverage({
            customerId: business.stripe_customer_id,
            minutes: newlyBillable,
            identifier: `voice-${ended.id}`,
          });
          if (!result.ok) {
            console.error(`Voice usage report failed for ${business.id} (${ended.id}): ${result.error}`);
          }
        }
      }
    }
    return Response.json({ conversationId: ended?.id ?? null, reply: "", signal: { kind: "continue" } });
  }

  if (!canAnswerCalls(business)) {
    return Response.json({ error: "This workspace cannot answer calls right now" }, { status: 409 });
  }

  // A call is many turns; bound the whole call, not each utterance.
  const limit = rateLimit(`voiceturn:${callSid}`, QUOTAS.voiceTurnsPerCall);
  if (!limit.ok) {
    return Response.json(
      {
        reply: "I'm sorry, I have to let you go — please call back and someone will help.",
        signal: { kind: "hangup", reason: "Turn limit reached" },
        conversationId: conversationId ?? null,
      },
      { status: 200 },
    );
  }

  let conversation = conversationId ? getConversation(conversationId) : null;
  if (!conversation || conversation.business_id !== business.id) {
    // The caller has not told us their name yet — capture_lead fills it in if
    // they do. Until then a readable number beats echoing raw E.164 into a
    // field labelled "name".
    const pretty = from ? formatPhone(from) : "";
    const contact = from ? upsertContact(business.id, { name: `Caller ${pretty}`, phone: from }) : null;
    conversation = createConversation({
      business_id: business.id,
      contact_id: contact?.id ?? null,
      channel: "voice",
      subject: pretty ? `Call from ${pretty}` : "Call from a withheld number",
    });
  }
  const thread = conversation;

  if (!text.trim()) {
    return Response.json({ conversationId: thread.id, reply: "", signal: { kind: "continue" } });
  }

  addMessage({ conversation_id: thread.id, role: "customer", body: text });

  const turn = await runAssistantTurn({
    business,
    conversation: thread,
    history: listMessages(thread.id),
    mode: "voice",
  });

  addMessage({
    conversation_id: thread.id,
    role: "assistant",
    body: turn.reply,
    actions: turn.actions,
  });

  if (turn.signal?.kind === "transfer" || turn.signal?.kind === "hangup") {
    updateConversation(thread.id, { status: turn.signal.kind === "transfer" ? "waiting" : "closed" });
  }

  return Response.json({
    conversationId: thread.id,
    reply: turn.reply,
    actions: turn.actions,
    signal: turn.signal ?? { kind: "continue" },
  });
}
