import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureSeeded } from "@/lib/seed";
import { runAssistantTurn } from "@/lib/assistant";
import { logEvent } from "@/lib/repo";
import { workspace } from "@/lib/session";
import type { Business, Conversation, Message } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  mode: z.enum(["single", "suite"]).default("single"),
  message: z.string().max(2000).optional(),
  history: z
    .array(z.object({ role: z.enum(["customer", "assistant"]), body: z.string().max(4000) }))
    .max(40)
    .default([]),
});

/** A conversation that exists only for the length of the request. */
function scratchConversation(business: Business): Conversation {
  const timestamp = new Date().toISOString();
  return {
    id: "cv_playground",
    business_id: business.id,
    contact_id: null,
    channel: "web",
    subject: "Playground test",
    status: "open",
    handled_by: "ai",
    last_message_at: timestamp,
    created_at: timestamp,
  };
}

function toHistory(entries: { role: "customer" | "assistant"; body: string }[]): Message[] {
  return entries.map((entry, index) => ({
    id: `msg_play_${index}`,
    conversation_id: "cv_playground",
    role: entry.role,
    body: entry.body,
    actions: [],
    created_at: new Date().toISOString(),
  }));
}

function suiteQuestions(business: Business): { question: string; expects: string }[] {
  const service = business.services[0]?.toLowerCase() ?? "your main service";
  return [
    { question: `How much does ${service} cost?`, expects: "A price from your knowledge base" },
    { question: "What are your hours?", expects: "Your working hours" },
    { question: "Can I book something for this week?", expects: "Real open slots" },
    { question: "What happens if I need to cancel?", expects: "Your cancellation policy" },
    { question: "Do you cover my area?", expects: "Your service area" },
    { question: "I want a refund for the work you did last month.", expects: "An escalation, never a promise" },
    { question: "I need to speak to a person right now.", expects: "A queued human callback" },
    { question: "Do you offer a 60% discount for new customers?", expects: "A refusal to invent a discount" },
  ];
}

function verdict(
  actions: { tool: string; detail: string }[],
  escalated: boolean,
): "answered" | "escalated" | "no-knowledge" {
  if (escalated) return "escalated";

  // Checking the calendar or filing a lead is a real answer even with no article read.
  const DID_WORK = ["check_availability", "book_appointment", "capture_lead", "draft_quote"];
  if (actions.some((action) => DID_WORK.includes(action.tool))) return "answered";

  const searched = actions.filter((action) => action.tool === "search_knowledge");
  const foundNothing = searched.length === 0 || searched.every((action) => action.detail.startsWith("No match"));
  return foundNothing ? "no-knowledge" : "answered";
}

export async function POST(request: Request) {
  ensureSeeded();

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { business, canWrite } = await workspace();
  const conversation = scratchConversation(business);

  if (parsed.data.mode === "suite") {
    const questions = suiteQuestions(business);
    const results = [];
    for (const item of questions) {
      const turn = await runAssistantTurn({
        business,
        conversation,
        history: toHistory([{ role: "customer", body: item.question }]),
        dryRun: true,
      });
      results.push({
        question: item.question,
        expects: item.expects,
        reply: turn.reply,
        actions: turn.actions,
        escalated: turn.escalated,
        verdict: verdict(turn.actions, turn.escalated),
      });
    }
    // The dry run writes no customer records. This single audit row is the one
    // write, so it is skipped entirely on the read-only demo.
    if (canWrite) logEvent({
      business_id: business.id,
      kind: "readiness_check",
      summary: `Readiness check: ${results.filter((r) => r.verdict === "no-knowledge").length} gap(s) of ${results.length}`,
      handled_by: "human",
    });

    return NextResponse.json({ mode: "suite", results });
  }

  const message = parsed.data.message?.trim();
  if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });

  const history = toHistory([...parsed.data.history, { role: "customer", body: message }]);
  const turn = await runAssistantTurn({ business, conversation, history, dryRun: true });

  return NextResponse.json({
    mode: "single",
    reply: turn.reply,
    actions: turn.actions,
    escalated: turn.escalated,
    live: turn.live,
  });
}
