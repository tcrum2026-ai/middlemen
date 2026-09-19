import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { ensureSeeded } from "@/lib/seed";
import { runAssistantTurn } from "@/lib/assistant";
import { QUOTAS, rateLimit } from "@/lib/rate-limit";
import { formatPhone } from "@/lib/twilio-signature";
import {
  addMessage,
  createConversation,
  getBusiness,
  getConversation,
  listMessages,
  updateConversation,
  upsertContact,
} from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
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
  if (!business.voice_enabled) return Response.json({ error: "Voice is off for this workspace" }, { status: 409 });

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
