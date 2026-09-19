import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureSeeded } from "@/lib/seed";
import { QUOTAS, clientIp, rateLimitAll, tooManyRequests } from "@/lib/rate-limit";
import { entitlement } from "@/lib/entitlement";
import { notifyOperator } from "@/lib/notify";
import {
  addMessage,
  createApproval,
  updateConversation,
  createConversation,
  getBusinessByWidgetKey,
  getConversation,
  listMessages,
} from "@/lib/repo";
import { runAssistantTurn } from "@/lib/assistant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  widgetKey: z.string().min(3),
  conversationId: z.string().nullish(),
  message: z.string().min(1).max(4000),
  channel: z.enum(["web", "email", "sms", "whatsapp"]).default("web"),
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/**
 * The single endpoint the embeddable widget (and any customer channel) posts to.
 * The widget key identifies the business, so a site owner only pastes one snippet.
 */
export async function POST(request: Request) {
  ensureSeeded();

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400, headers: CORS });
  }
  const { widgetKey, conversationId, message, channel } = parsed.data;

  const business = getBusinessByWidgetKey(widgetKey);
  if (!business) {
    return NextResponse.json({ error: "Unknown widget key" }, { status: 404, headers: CORS });
  }

  // Checked after the key resolves so an unknown key can't be used to probe the
  // limiter, and before any model call so a flood costs nothing.
  // Out of allowance: capture the message and hand it to a person rather than
  // dropping it. The terms promise exactly this, and a silent failure would be
  // worse for the business than an honest "someone will follow up".
  const entitled = entitlement(business);

  const limit = rateLimitAll([
    { key: `chat:ip:${clientIp(request)}`, quota: QUOTAS.chatPerIp },
    { key: `chat:biz:${business.id}`, quota: QUOTAS.chatPerWorkspace },
  ]);
  if (!limit.ok) {
    return tooManyRequests(limit, "Too many messages just now. Try again shortly.", CORS);
  }

  let conversation = conversationId ? getConversation(conversationId) : null;
  if (!conversation || conversation.business_id !== business.id) {
    conversation = createConversation({
      business_id: business.id,
      channel,
      subject: message.slice(0, 60),
    });
  }

  addMessage({ conversation_id: conversation.id, role: "customer", body: message });

  if (!entitled.canAnswer) {
    // Capture it, hand it to a person, tell the customer the truth.
    const reply = "Thanks — I've passed this to the team and someone will follow up shortly.";
    addMessage({ conversation_id: conversation.id, role: "assistant", body: reply });
    updateConversation(conversation.id, { status: "waiting", handled_by: "human" });
    createApproval({
      business_id: business.id,
      conversation_id: conversation.id,
      kind: "reply",
      title: entitled.blockedTitle ?? "Needs a reply",
      summary: entitled.blockedReason ?? "The assistant is not answering right now.",
      draft: "",
      risk: "low",
      confidence: 0,
    });
    // The assistant has stopped answering for a reason the operator can fix.
    // Leaving that to be discovered by opening the dashboard is how a lapsed
    // card turns into a week of silently captured messages.
    await notifyOperator(business, {
      title: entitled.blockedTitle ?? "A message is waiting for you",
      summary: `${entitled.blockedReason ?? ""}\n\nThey wrote: "${message.slice(0, 200)}"`,
      path: "/dashboard/approvals",
    });
    return NextResponse.json(
      { conversationId: conversation.id, reply, actions: [], escalated: true },
      { headers: CORS },
    );
  }

  const turn = await runAssistantTurn({
    business,
    conversation,
    history: listMessages(conversation.id),
  });

  addMessage({
    conversation_id: conversation.id,
    role: "assistant",
    body: turn.reply,
    actions: turn.actions,
  });

  return NextResponse.json(
    {
      conversationId: conversation.id,
      reply: turn.reply,
      actions: turn.actions,
      escalated: turn.escalated,
    },
    { headers: CORS },
  );
}
