import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaTool } from "@anthropic-ai/sdk/helpers/beta/json-schema";
import {
  availableSlots,
  createAppointment,
  createApproval,
  createCallRequest,
  createLead,
  createQuote,
  logEvent,
  searchKb,
  updateConversation,
  upsertContact,
} from "./repo";
import type { AssistantAction, Business, Conversation, Message } from "./types";

/** Customer-facing chat: Opus 5 at medium effort keeps replies quick without dropping judgement. */
const MODEL = "claude-opus-5";

export interface AssistantTurn {
  reply: string;
  actions: AssistantAction[];
  /** True when the turn put a human in the loop (callback queue or approval queue). */
  escalated: boolean;
  /** False when the reply came from the offline fallback rather than the API. */
  live: boolean;
}

export function assistantConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatSlot(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function systemPrompt(business: Business): string {
  const hours = Object.entries(business.hours)
    .map(([day, value]) => `${day}: ${value}`)
    .join(", ");

  return [
    `You are ${business.assistant_name}, the virtual assistant for ${business.name}, a ${business.industry} business.`,
    `You handle inbound customer conversations across web chat, email and SMS on the business's behalf.`,
    ``,
    `BUSINESS PROFILE`,
    `- Services: ${business.services.join(", ") || "see knowledge base"}`,
    `- Office hours: ${hours}`,
    `- Timezone: ${business.timezone}`,
    `- Contact: ${business.email ?? "n/a"} / ${business.phone ?? "n/a"}`,
    ``,
    `WHAT YOU DO`,
    `- Answer questions using search_knowledge. Never invent a price, policy, warranty term or availability.`,
    `  If the knowledge base does not cover it, say so and offer a human follow-up.`,
    `- Book, move and confirm appointments with check_availability and book_appointment.`,
    `- Capture and qualify leads with capture_lead, and draft pricing with draft_quote.`,
    ``,
    `WHAT YOU NEVER DO`,
    `- You cannot make or take phone calls. Never say you will call someone, never claim to be on a call,`,
    `  and never imply a voice conversation with you is possible. A person at ${business.name} makes every call.`,
    `  When a customer wants to talk to someone, or the situation clearly needs a voice conversation, use`,
    `  request_human_callback and tell them a teammate will call.`,
    `- Do not approve refunds, credits, warranty claims, legal or safety commitments, or discounts you were not`,
    `  given. Route those through send_to_human_review and tell the customer a teammate is reviewing it.`,
    ``,
    `WHEN TO PUT A HUMAN IN THE LOOP`,
    `- request_human_callback: the customer asks to speak to someone, an emergency or safety issue,`,
    `  an active leak/outage/hazard, or a negotiation that needs a voice.`,
    `- send_to_human_review: refunds, warranty disputes, anything above the business's approval limits,`,
    `  an angry customer, or any answer you are not confident in.`,
    `Always write the brief or summary so the teammate can act without re-reading the thread.`,
    ``,
    `STYLE`,
    `- Tone: ${business.tone}. Plain language, no corporate filler, no emoji unless the customer uses them.`,
    `- Keep replies under about 120 words. One question at a time.`,
    `- Confirm concrete details back to the customer (date, time, price, address) whenever you act.`,
  ].join("\n");
}

/** Tool implementations write straight to the business's records, so a chat turn is real work. */
function buildTools(
  business: Business,
  conversation: Conversation,
  record: (action: AssistantAction) => void,
  markEscalated: () => void,
) {
  const searchKnowledge = betaTool({
    name: "search_knowledge",
    description:
      "Search this business's knowledge base for prices, policies, services, hours and warranty terms. " +
      "Use before answering any factual question about the business.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "What to look up, in the customer's own words" } },
      required: ["query"],
      additionalProperties: false,
    },
    run: (input) => {
      const articles = searchKb(business.id, input.query);
      record({
        tool: "search_knowledge",
        label: "Checked knowledge base",
        detail: articles.length ? articles.map((a) => a.title).join(" · ") : `No match for "${input.query}"`,
      });
      if (articles.length === 0) {
        return "No knowledge base article matched. Do not guess — offer a human follow-up instead.";
      }
      return articles.map((a) => `## ${a.title}\n${a.body}`).join("\n\n");
    },
  });

  const checkAvailability = betaTool({
    name: "check_availability",
    description: "List open appointment slots over the next few days, honouring the business's working hours.",
    inputSchema: {
      type: "object",
      properties: {
        days_ahead: { type: "integer", description: "How many days out to search (1-14). Defaults to 7." },
      },
      required: [],
      additionalProperties: false,
    },
    run: (input) => {
      const days = Math.min(Math.max(input.days_ahead ?? 7, 1), 14);
      const slots = availableSlots(business.id, days).slice(0, 12);
      record({
        tool: "check_availability",
        label: "Checked calendar",
        detail: `${slots.length} open slot${slots.length === 1 ? "" : "s"} in the next ${days} days`,
      });
      if (slots.length === 0) return "No open slots. Offer a callback so a teammate can find a time.";
      return slots.map((s) => `${s} (${formatSlot(s)})`).join("\n");
    },
  });

  const bookAppointment = betaTool({
    name: "book_appointment",
    description: "Book a confirmed appointment. Only call this once the customer has agreed to a specific time.",
    inputSchema: {
      type: "object",
      properties: {
        customer_name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        service: { type: "string", description: "What the visit is for" },
        starts_at: { type: "string", description: "ISO 8601 start time, taken from check_availability" },
        duration_min: { type: "integer" },
        location: { type: "string" },
        notes: { type: "string", description: "Anything the technician should know before arriving" },
      },
      required: ["customer_name", "service", "starts_at"],
      additionalProperties: false,
    },
    run: (input) => {
      const contact = upsertContact(business.id, {
        name: input.customer_name,
        email: input.email ?? null,
        phone: input.phone ?? null,
      });
      const appointment = createAppointment({
        business_id: business.id,
        contact_id: contact.id,
        title: `${input.service} — ${input.customer_name}`,
        starts_at: input.starts_at,
        duration_min: input.duration_min ?? 60,
        location: input.location ?? "On site",
        notes: input.notes ?? null,
      });
      updateConversation(conversation.id, { contact_id: contact.id });
      logEvent({
        business_id: business.id,
        kind: "appointment_booked",
        summary: `Booked ${input.service} for ${input.customer_name}`,
        minutes_saved: 12,
      });
      record({
        tool: "book_appointment",
        label: "Booked appointment",
        detail: `${formatSlot(appointment.starts_at)} · ${input.service}`,
      });
      return `Booked ${appointment.id} for ${formatSlot(appointment.starts_at)}. Confirm this time back to the customer.`;
    },
  });

  const captureLead = betaTool({
    name: "capture_lead",
    description:
      "Record a sales opportunity in the CRM with a qualification score. Use whenever a customer shows " +
      "buying intent, even if nothing is booked yet.",
    inputSchema: {
      type: "object",
      properties: {
        customer_name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        intent: { type: "string", description: "What they want, in one line" },
        estimated_value_usd: { type: "number" },
        score: { type: "integer", description: "0-100 qualification score based on urgency, budget and fit" },
        notes: { type: "string" },
      },
      required: ["customer_name", "intent"],
      additionalProperties: false,
    },
    run: (input) => {
      const contact = upsertContact(business.id, {
        name: input.customer_name,
        email: input.email ?? null,
        phone: input.phone ?? null,
      });
      const lead = createLead({
        business_id: business.id,
        contact_id: contact.id,
        source: conversation.channel,
        intent: input.intent,
        score: Math.min(Math.max(input.score ?? 50, 0), 100),
        value_cents: Math.round((input.estimated_value_usd ?? 0) * 100),
        notes: input.notes ?? null,
      });
      updateConversation(conversation.id, { contact_id: contact.id });
      logEvent({
        business_id: business.id,
        kind: "lead_captured",
        summary: `Captured lead: ${input.intent}`,
        minutes_saved: 7,
      });
      record({ tool: "capture_lead", label: "Captured lead", detail: `${input.customer_name} · ${input.intent}` });
      return `Lead ${lead.id} saved.`;
    },
  });

  const draftQuote = betaTool({
    name: "draft_quote",
    description:
      "Draft a priced quote from knowledge base pricing. Quotes above the business's limit are held for review " +
      "rather than sent automatically.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        line_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              quantity: { type: "number" },
              unit_price_usd: { type: "number" },
            },
            required: ["description", "quantity", "unit_price_usd"],
            additionalProperties: false,
          },
        },
      },
      required: ["title", "line_items"],
      additionalProperties: false,
    },
    run: (input) => {
      const quote = createQuote({
        business_id: business.id,
        title: input.title,
        line_items: input.line_items.map((li) => ({
          description: li.description,
          quantity: li.quantity,
          unit_price_cents: Math.round(li.unit_price_usd * 100),
        })),
      });
      logEvent({
        business_id: business.id,
        kind: "quote_drafted",
        summary: `Drafted quote: ${input.title}`,
        minutes_saved: 18,
      });
      record({ tool: "draft_quote", label: "Drafted quote", detail: `${input.title} · ${usd(quote.total_cents)}` });

      if (quote.total_cents > 100_000) {
        markEscalated();
        createApproval({
          business_id: business.id,
          conversation_id: conversation.id,
          kind: "quote",
          title: `Quote over $1,000 — ${input.title}`,
          summary: `Quote totals ${usd(quote.total_cents)}, above the auto-send limit.`,
          draft: input.line_items
            .map((li) => `${li.quantity} × ${li.description} @ $${li.unit_price_usd.toFixed(2)}`)
            .join("\n"),
          risk: "medium",
          confidence: 0.8,
        });
        return `Quote ${quote.id} totals ${usd(quote.total_cents)} and is held for teammate review. Tell the customer it is being finalised and they will have it shortly.`;
      }
      return `Quote ${quote.id} drafted, total ${usd(quote.total_cents)}. You may share these numbers with the customer.`;
    },
  });

  const requestHumanCallback = betaTool({
    name: "request_human_callback",
    description:
      "Put the customer in the human callback queue. This is the ONLY way a phone call happens — you cannot " +
      "call anyone yourself. Write a brief that lets a teammate pick up the phone without reading the thread.",
    inputSchema: {
      type: "object",
      properties: {
        customer_name: { type: "string" },
        phone: { type: "string" },
        reason: { type: "string", description: "One line on why a call is needed" },
        urgency: { type: "string", enum: ["low", "normal", "urgent"] },
        preferred_window: { type: "string", description: "When the customer wants the call" },
        brief: {
          type: "string",
          description:
            "Everything the teammate needs: who, what happened, what was already promised, what is still open, " +
            "and the decision the call must reach.",
        },
      },
      required: ["customer_name", "reason", "brief"],
      additionalProperties: false,
    },
    run: (input) => {
      const contact = upsertContact(business.id, {
        name: input.customer_name,
        phone: input.phone ?? null,
      });
      createCallRequest({
        business_id: business.id,
        contact_id: contact.id,
        conversation_id: conversation.id,
        reason: input.reason,
        urgency: (input.urgency as "low" | "normal" | "urgent") ?? "normal",
        preferred_window: input.preferred_window ?? "Any time",
        brief: input.brief,
      });
      updateConversation(conversation.id, { contact_id: contact.id, status: "waiting" });
      logEvent({
        business_id: business.id,
        kind: "call_queued",
        summary: `Call queued: ${input.reason}`,
        handled_by: "ai",
        minutes_saved: 4,
      });
      markEscalated();
      record({
        tool: "request_human_callback",
        label: "Queued a human callback",
        detail: `${input.reason} · ${input.urgency ?? "normal"}`,
      });
      return "Callback queued with a teammate. Tell the customer a person will call them, and when.";
    },
  });

  const sendToHumanReview = betaTool({
    name: "send_to_human_review",
    description:
      "Hold an answer or commitment for a teammate to approve. Use for refunds, warranty disputes, discounts, " +
      "anything above your limits, and any answer you are not confident in.",
    inputSchema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["reply", "quote", "booking", "refund", "other"] },
        title: { type: "string" },
        summary: { type: "string", description: "What the customer wants and what is at stake" },
        draft: { type: "string", description: "The reply you would send if approved" },
        risk: { type: "string", enum: ["low", "medium", "high"] },
        confidence: { type: "number", description: "0-1 confidence in your draft" },
      },
      required: ["kind", "title", "summary", "draft"],
      additionalProperties: false,
    },
    run: (input) => {
      createApproval({
        business_id: business.id,
        conversation_id: conversation.id,
        kind: input.kind as "reply" | "quote" | "booking" | "refund" | "other",
        title: input.title,
        summary: input.summary,
        draft: input.draft,
        risk: (input.risk as "low" | "medium" | "high") ?? "medium",
        confidence: input.confidence ?? 0.5,
      });
      updateConversation(conversation.id, { status: "waiting" });
      markEscalated();
      record({ tool: "send_to_human_review", label: "Sent for teammate approval", detail: input.title });
      return "Held for approval. Tell the customer a teammate is reviewing and when to expect an answer — promise nothing else.";
    },
  });

  return [
    searchKnowledge,
    checkAvailability,
    bookAppointment,
    captureLead,
    draftQuote,
    requestHumanCallback,
    sendToHumanReview,
  ];
}

function toApiMessages(history: Message[]): Anthropic.Beta.BetaMessageParam[] {
  return history
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "customer" ? ("user" as const) : ("assistant" as const),
      content: m.body,
    }));
}

/**
 * Runs one assistant turn against the live API, falling back to a scripted
 * engine when no API credentials are present so the product still demos.
 */
export async function runAssistantTurn(args: {
  business: Business;
  conversation: Conversation;
  history: Message[];
}): Promise<AssistantTurn> {
  const { business, conversation, history } = args;
  const actions: AssistantAction[] = [];
  let escalated = false;
  const record = (a: AssistantAction) => actions.push(a);
  const markEscalated = () => {
    escalated = true;
  };

  if (!assistantConfigured()) {
    return simulateTurn({ business, conversation, history, record, markEscalated, actions, escalatedRef: () => escalated });
  }

  const client = new Anthropic();
  const tools = buildTools(business, conversation, record, markEscalated);
  const messages = toApiMessages(history);

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return { reply: business.greeting, actions, escalated, live: true };
  }

  // Volatile context rides as a trailing system message so the cached prefix
  // (profile + policy + tool list) stays byte-identical between turns.
  messages.push({
    role: "system",
    content:
      `Current time: ${new Date().toISOString()} (${business.timezone}). ` +
      `Channel: ${conversation.channel}. Thread subject: ${conversation.subject}.`,
  } as Anthropic.Beta.BetaMessageParam);

  try {
    const runner = client.beta.messages.toolRunner({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: "medium" },
      system: [
        { type: "text", text: systemPrompt(business), cache_control: { type: "ephemeral" } },
      ],
      tools,
      messages,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    } as Parameters<typeof client.beta.messages.toolRunner>[0]);

    const final = await runner;

    if (final.stop_reason === "refusal") {
      createApproval({
        business_id: business.id,
        conversation_id: conversation.id,
        kind: "reply",
        title: "Assistant declined to answer",
        summary: "The model declined this request. A teammate should read the thread and reply.",
        draft: "",
        risk: "high",
        confidence: 0,
      });
      return {
        reply: "I'd rather have a teammate take this one. I've passed the thread to them and they'll follow up shortly.",
        actions: [...actions, { tool: "send_to_human_review", label: "Sent for teammate approval", detail: "Assistant declined" }],
        escalated: true,
        live: true,
      };
    }

    const reply = final.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    logEvent({
      business_id: business.id,
      kind: escalated ? "chat_escalated" : "chat_resolved",
      summary: `${conversation.channel} · ${conversation.subject}`,
      handled_by: "ai",
      minutes_saved: escalated ? 4 : 9,
    });

    return {
      reply: reply || "Let me get a teammate to confirm that for you.",
      actions,
      escalated,
      live: true,
    };
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error(`Assistant API error (${error.status}):`, error.message);
    } else {
      console.error("Assistant error:", error);
    }
    createApproval({
      business_id: business.id,
      conversation_id: conversation.id,
      kind: "reply",
      title: "Assistant could not reach the model",
      summary: "The API call failed, so this thread needs a human reply.",
      draft: "",
      risk: "medium",
      confidence: 0,
    });
    return {
      reply:
        "I'm having trouble on my end right now. I've flagged this for a teammate so you're not left waiting — " +
        "they'll pick it up shortly.",
      actions: [...actions, { tool: "send_to_human_review", label: "Sent for teammate approval", detail: "Assistant unavailable" }],
      escalated: true,
      live: false,
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Offline fallback                                                            */
/* -------------------------------------------------------------------------- */

const CALL_WORDS = ["call me", "speak to someone", "talk to a person", "on the phone", "human", "representative"];
const URGENT_WORDS = ["emergency", "urgent", "flooding", "leaking", "no heat", "burst", "spraying", "sewage"];
const BOOK_WORDS = ["book", "appointment", "schedule", "come out", "visit", "slot"];
const PRICE_WORDS = ["price", "cost", "quote", "how much", "pricing", "rate", "fee"];
const REFUND_WORDS = ["refund", "money back", "warranty", "complaint", "lawyer", "dispute"];

function hits(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w));
}

/**
 * Keyword routing over the same tools as the live engine. It keeps every screen
 * functional without API credentials — replies are scripted, not generated.
 */
function simulateTurn(args: {
  business: Business;
  conversation: Conversation;
  history: Message[];
  record: (a: AssistantAction) => void;
  markEscalated: () => void;
  actions: AssistantAction[];
  escalatedRef: () => boolean;
}): AssistantTurn {
  const { business, conversation, history, record, markEscalated, actions } = args;
  const last = [...history].reverse().find((m) => m.role === "customer");
  const text = (last?.body ?? "").toLowerCase();
  let reply: string;
  let escalated = false;

  const articles = searchKb(business.id, text);
  if (articles.length > 0) {
    record({
      tool: "search_knowledge",
      label: "Checked knowledge base",
      detail: articles.map((a) => a.title).join(" · "),
    });
  }

  if (hits(text, REFUND_WORDS)) {
    createApproval({
      business_id: business.id,
      conversation_id: conversation.id,
      kind: "refund",
      title: "Refund or warranty request",
      summary: `Customer message: "${last?.body ?? ""}"`,
      draft: "I'm sorry about this. Our labor guarantee covers the return visit, and a teammate is reviewing the refund.",
      risk: "high",
      confidence: 0.4,
    });
    record({ tool: "send_to_human_review", label: "Sent for teammate approval", detail: "Refund / warranty request" });
    markEscalated();
    escalated = true;
    reply =
      "I'm sorry about that. Refunds and warranty claims go to a teammate rather than to me, so I've passed the " +
      "details over and someone will come back to you today.";
  } else if (hits(text, CALL_WORDS) || hits(text, URGENT_WORDS)) {
    createCallRequest({
      business_id: business.id,
      conversation_id: conversation.id,
      reason: hits(text, URGENT_WORDS) ? "Possible emergency raised in chat" : "Customer asked to speak to a person",
      urgency: hits(text, URGENT_WORDS) ? "urgent" : "normal",
      preferred_window: "As soon as possible",
      brief: `Customer wrote: "${last?.body ?? ""}". Channel: ${conversation.channel}. No commitments made yet.`,
    });
    record({ tool: "request_human_callback", label: "Queued a human callback", detail: "Human call requested" });
    markEscalated();
    escalated = true;
    reply =
      "I can't take calls myself, but I've put you at the front of our callback queue with the details so far — " +
      "a teammate will ring you shortly.";
  } else if (hits(text, BOOK_WORDS)) {
    const slots = availableSlots(business.id, 7).slice(0, 3);
    record({ tool: "check_availability", label: "Checked calendar", detail: `${slots.length} slots offered` });
    reply = slots.length
      ? `Happy to get you on the schedule. I have ${slots
          .map(formatSlot)
          .join(", or ")}. Which works best? Once you pick one I'll confirm it by email.`
      : "I don't see open slots this week — I've asked a teammate to call you with the next opening.";
  } else if (hits(text, PRICE_WORDS) && articles.length > 0) {
    reply = `Here's what I have on that:\n\n${articles[0].body}\n\nWant me to check availability for a visit?`;
  } else if (articles.length > 0) {
    reply = `${articles[0].body}\n\nAnything else I can pull up for you?`;
  } else {
    createApproval({
      business_id: business.id,
      conversation_id: conversation.id,
      kind: "reply",
      title: "Question outside the knowledge base",
      summary: `Customer message: "${last?.body ?? ""}"`,
      draft: "",
      risk: "low",
      confidence: 0.3,
    });
    record({ tool: "send_to_human_review", label: "Sent for teammate approval", detail: "No knowledge base match" });
    markEscalated();
    escalated = true;
    reply =
      "That one isn't in my notes, so I'd rather not guess. I've flagged it for a teammate and they'll follow up " +
      "with an answer shortly.";
  }

  logEvent({
    business_id: business.id,
    kind: escalated ? "chat_escalated" : "chat_resolved",
    summary: `${conversation.channel} · ${conversation.subject}`,
    handled_by: "ai",
    minutes_saved: escalated ? 4 : 9,
  });

  return { reply, actions, escalated, live: false };
}
