import { z } from "zod";
import { ensureSeeded } from "@/lib/seed";
import { QUOTAS, clientIp, rateLimitAll, tooManyRequests } from "@/lib/rate-limit";
import { entitlement } from "@/lib/entitlement";
import { notifyOperator } from "@/lib/notify";
import { streamAssistantTurn } from "@/lib/assistant";
import {
  addMessage,
  createApproval,
  updateConversation,
  createConversation,
  getBusinessByWidgetKey,
  getConversation,
  listMessages,
} from "@/lib/repo";

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
  return new Response(null, { status: 204, headers: CORS });
}

/** Server-sent events: `tool` while it works, `text` as it writes, `done` at the end. */
export async function POST(request: Request) {
  ensureSeeded();

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request body" }, { status: 400, headers: CORS });
  }
  const { widgetKey, conversationId, message, channel } = parsed.data;

  const business = getBusinessByWidgetKey(widgetKey);
  if (!business) {
    return Response.json({ error: "Unknown widget key" }, { status: 404, headers: CORS });
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
  const thread = conversation;

  addMessage({ conversation_id: thread.id, role: "customer", body: message });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      send("open", { conversationId: thread.id });

      if (!entitled.canAnswer) {
        // Same contract as the non-streaming route: capture, hand over, be honest.
        const reply = "Thanks — I've passed this to the team and someone will follow up shortly.";
        for (const word of reply.split(" ")) send("text", { chunk: word + " " });
        addMessage({ conversation_id: thread.id, role: "assistant", body: reply });
        updateConversation(thread.id, { status: "waiting", handled_by: "human" });
        createApproval({
          business_id: business.id,
          conversation_id: thread.id,
          kind: "reply",
          title: entitled.blockedTitle ?? "Needs a reply",
          summary: entitled.blockedReason ?? "The assistant is not answering right now.",
          draft: "",
          risk: "low",
          confidence: 0,
        });
        // The assistant has stopped answering for a reason the operator can
        // fix. Leaving that to be discovered by opening the dashboard is how
        // a lapsed card turns into a week of silently captured messages.
        await notifyOperator(business, {
          title: entitled.blockedTitle ?? "A message is waiting for you",
          summary: `${entitled.blockedReason ?? ""}\n\nThey wrote: "${message.slice(0, 200)}"`,
          path: "/dashboard/approvals",
        });
        send("done", { conversationId: thread.id, escalated: true, actions: [] });
        controller.close();
        return;
      }

      // A teammate has this thread; the assistant stays out of it. Same
      // reasoning as the non-streaming route: two voices answering a
      // complaint is the failure the takeover exists to prevent.
      if (thread.handled_by === "human" && thread.status !== "closed") {
        updateConversation(thread.id, { status: "waiting" });
        await notifyOperator(business, {
          title: "A reply on a thread you took over",
          summary: `They wrote: "${message.slice(0, 200)}"\n\nThe assistant is staying out of this one.`,
          path: `/dashboard/inbox/${thread.id}`,
        });
        send("done", { conversationId: thread.id, escalated: true, actions: [], waiting: true });
        controller.close();
        return;
      }

      try {
        const turn = await streamAssistantTurn({
          business,
          conversation: thread,
          history: listMessages(thread.id),
          onText: (chunk) => send("text", { chunk }),
          onTool: (action) => send("tool", action),
        });

        addMessage({
          conversation_id: thread.id,
          role: "assistant",
          body: turn.reply,
          actions: turn.actions,
        });

        send("done", {
          conversationId: thread.id,
          escalated: turn.escalated,
          actions: turn.actions,
        });
      } catch (error) {
        console.error("Chat stream failed:", error);
        send("error", { message: "The assistant is unavailable. A teammate has been notified." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...CORS,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Nginx and similar proxies buffer by default, which defeats streaming.
      "X-Accel-Buffering": "no",
    },
  });
}
