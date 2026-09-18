import { z } from "zod";
import { ensureSeeded } from "@/lib/seed";
import { streamAssistantTurn } from "@/lib/assistant";
import {
  addMessage,
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
