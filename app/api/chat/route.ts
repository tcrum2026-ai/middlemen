import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureSeeded } from "@/lib/seed";
import { QUOTAS, clientIp, rateLimitAll, tooManyRequests } from "@/lib/rate-limit";
import {
  addMessage,
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
