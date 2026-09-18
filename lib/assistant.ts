import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { BetaMessageStream } from "@anthropic-ai/sdk/lib/BetaMessageStream";
import { betaTool } from "@anthropic-ai/sdk/helpers/beta/json-schema";
import {
  availableSlots,
  hasConfidentKbMatch,
  recordKbGap,
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
import { notifySlack, sendEmail } from "./delivery";
import type { AssistantAction, Business, Conversation, Message } from "./types";

/** Customer-facing chat: Opus 5 at medium effort keeps replies quick without dropping judgement. */
const MODEL = "claude-opus-5";

/** What the voice bridge should do once the turn's audio has been spoken. */
export interface CallSignal {
  kind: "continue" | "transfer" | "hangup";
  reason?: string;
  brief?: string;
  urgency?: "normal" | "urgent";
}

export interface AssistantTurn {
  reply: string;
  actions: AssistantAction[];
  /** True when the turn put a human in the loop (callback queue or approval queue). */
  escalated: boolean;
  /** False when the reply came from the offline fallback rather than the API. */
  live: boolean;
  /** Only set on voice turns: whether to transfer or hang up after speaking. */
  signal?: CallSignal;
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

export type TurnMode = "text" | "voice";

/**
 * Spoken replies are a different medium, not the same text read aloud: the
 * caller cannot re-read a sentence, cannot see a bulleted list, and will talk
 * over anything that runs long.
 */
function voiceStyle(): string[] {
  return [
    `YOU ARE ON A LIVE PHONE CALL`,
    `- Everything you say is spoken aloud by a text-to-speech voice, and the caller hears it as you write it.`,
    `- Two or three sentences at a time, maximum. Then stop and let them speak.`,
    `- No markdown, no bullet points, no URLs, no emoji, no headings. None of it can be heard.`,
    `- Write numbers the way they are said: "eighty-nine dollars", "two to four p.m.", "five five five, one two one two".`,
    `- One question per turn. Never stack two questions.`,
    `- Read back anything you are about to commit to — date, time, price, address, spelling of a name —`,
    `  and wait for a yes before you act on it.`,
    `- The caller's words reach you through speech recognition and will sometimes be wrong. If something`,
    `  reads as nonsense or a name looks mangled, ask them to repeat or spell it rather than guessing.`,
    `- If they interrupt you, drop what you were saying and answer what they just asked.`,
    `- Never say you will "send a link" unless you also offer to text it.`,
    ``,
    `ENDING OR HANDING OFF THE CALL`,
    `- transfer_to_human: the caller asks for a person, is upset, raises an emergency or safety issue, or wants`,
    `  something you are not allowed to decide. Tell them you are putting them through, then call the tool.`,
    `- end_call: only once the caller's business is genuinely finished and they have said goodbye or confirmed`,
    `  there is nothing else. Say goodbye first, then call the tool.`,
    `- If a transfer is not possible, say so plainly and take a message instead.`,
  ];
}

function systemPrompt(business: Business, mode: TurnMode = "text"): string {
  const hours = Object.entries(business.hours)
    .map(([day, value]) => `${day}: ${value}`)
    .join(", ");

  return [
    `You are ${business.assistant_name}, the virtual assistant for ${business.name}, a ${business.industry} business.`,
    mode === "voice"
      ? `You are speaking with a caller on the telephone, right now, on the business's behalf.`
      : `You handle inbound customer conversations across web chat, email and SMS on the business's behalf.`,
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
    `- Do not approve refunds, credits, warranty claims, legal or safety commitments, or discounts you were not`,
    `  given. Route those through send_to_human_review and tell the customer a teammate is reviewing it.`,
    ...(mode === "voice"
      ? [
          `- Never claim to be a human being. If the caller asks whether you are a person or a robot, tell them`,
          `  plainly that you are an AI assistant for ${business.name}, then carry on.`,
        ]
      : [
          `- You cannot make or take phone calls. Never say you will call someone, never claim to be on a call,`,
          `  and never imply a voice conversation with you is possible. A person at ${business.name} makes every call.`,
          `  When a customer wants to talk to someone, or the situation clearly needs a voice conversation, use`,
          `  request_human_callback and tell them a teammate will call.`,
        ]),
    ``,
    `WHEN TO PUT A HUMAN IN THE LOOP`,
    ...(mode === "voice"
      ? [`- transfer_to_human: see the call rules below.`]
      : [
          `- request_human_callback: the customer asks to speak to someone, an emergency or safety issue,`,
          `  an active leak/outage/hazard, or a negotiation that needs a voice.`,
        ]),
    `- send_to_human_review: refunds, warranty disputes, anything above the business's approval limits,`,
    `  an angry customer, or any answer you are not confident in.`,
    `Always write the brief or summary so the teammate can act without re-reading the thread.`,
    ``,
    ...(mode === "voice"
      ? voiceStyle()
      : [
          `STYLE`,
          `- Tone: ${business.tone}. Plain language, no corporate filler, no emoji unless the customer uses them.`,
          `- Keep replies under about 120 words. One question at a time.`,
          `- Confirm concrete details back to the customer (date, time, price, address) whenever you act.`,
        ]),
  ].join("\n");
}

/** Tool implementations write straight to the business's records, so a chat turn is real work. */
function buildTools(
  business: Business,
  conversation: Conversation,
  record: (action: AssistantAction) => void,
  markEscalated: () => void,
  /** In dry-run the write tools report what they would do and persist nothing. */
  dryRun = false,
  mode: TurnMode = "text",
  /** Live-call control, mutated by the voice tools and read after the turn. */
  signal: CallSignal = { kind: "continue" },
) {
  const wouldHave = (text: string) => (dryRun ? `[dry run — nothing was saved] ${text}` : text);
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
        if (!dryRun) recordKbGap(business.id, input.query);
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
    run: async (input) => {
      if (dryRun) {
        record({
          tool: "book_appointment",
          label: "Would book appointment",
          detail: `${formatSlot(input.starts_at)} · ${input.service}`,
        });
        return wouldHave(`Would book ${input.service} for ${formatSlot(input.starts_at)}.`);
      }
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
      if (input.email) {
        const delivery = await sendEmail({
          businessId: business.id,
          to: input.email,
          subject: `Confirmed: ${input.service} on ${formatSlot(appointment.starts_at)}`,
          body:
            `Hi ${input.customer_name.split(" ")[0]},\n\n` +
            `You're booked with ${business.name} for ${input.service} on ` +
            `${formatSlot(appointment.starts_at)}${input.location ? ` at ${input.location}` : ""}.\n\n` +
            `Reply to this email if you need to change it.\n\n${business.name}`,
        });
        if (delivery.status === "sent") {
          record({ tool: "book_appointment", label: "Sent confirmation email", detail: input.email });
        }
      }
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
      if (dryRun) {
        record({ tool: "capture_lead", label: "Would capture lead", detail: `${input.customer_name} · ${input.intent}` });
        return wouldHave(`Would file a lead: ${input.intent}.`);
      }
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
      if (dryRun) {
        const total = input.line_items.reduce((sum, li) => sum + li.quantity * li.unit_price_usd * 100, 0);
        record({ tool: "draft_quote", label: "Would draft quote", detail: `${input.title} · ${usd(total)}` });
        return wouldHave(`Would draft a quote totalling ${usd(total)}.`);
      }
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
    run: async (input) => {
      if (dryRun) {
        markEscalated();
        record({
          tool: "request_human_callback",
          label: "Would queue a human callback",
          detail: `${input.reason} · ${input.urgency ?? "normal"}`,
        });
        return wouldHave(`Would queue a callback: ${input.reason}.`);
      }
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
      await notifySlack({
        businessId: business.id,
        text:
          `:telephone_receiver: *Callback queued* (${input.urgency ?? "normal"})\n` +
          `*${input.customer_name}*${input.phone ? ` · ${input.phone}` : ""}\n` +
          `${input.reason}\n\n${input.brief}`,
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
    run: async (input) => {
      if (dryRun) {
        markEscalated();
        record({ tool: "send_to_human_review", label: "Would send for teammate approval", detail: input.title });
        return wouldHave(`Would hold this for approval: ${input.title}.`);
      }
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
      await notifySlack({
        businessId: business.id,
        text: `:shield: *Needs approval* (${input.risk ?? "medium"} risk)\n*${input.title}*\n${input.summary}`,
      });
      return "Held for approval. Tell the customer a teammate is reviewing and when to expect an answer — promise nothing else.";
    },
  });

  /**
   * Live-call control. These two don't write records — they signal the voice
   * bridge, which owns the actual telephony. `signal` is read by the caller of
   * runAssistantTurn once the turn finishes.
   */
  const transferToHuman = betaTool({
    name: "transfer_to_human",
    description:
      "Hand the live call to a person. Use when the caller asks for someone, is upset, raises an emergency, " +
      "or wants a decision you are not allowed to make. Say you are putting them through BEFORE calling this.",
    inputSchema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "One line a teammate can read while the call rings" },
        urgency: { type: "string", enum: ["normal", "urgent"] },
        brief: {
          type: "string",
          description: "What the caller wants, what you already told them, and what is still undecided",
        },
      },
      required: ["reason", "brief"],
      additionalProperties: false,
    },
    run: (input) => {
      signal.kind = "transfer";
      signal.reason = input.reason;
      signal.brief = input.brief;
      signal.urgency = input.urgency === "urgent" ? "urgent" : "normal";
      markEscalated();
      record({ tool: "transfer_to_human", label: "Transferred to a teammate", detail: input.reason });
      if (!dryRun) {
        createCallRequest({
          business_id: business.id,
          conversation_id: conversation.id,
          reason: input.reason,
          urgency: signal.urgency,
          preferred_window: "Live transfer, in progress",
          brief: input.brief,
        });
      }
      return wouldHave("Transfer is being connected. Say one short reassuring line and then stop talking.");
    },
  });

  const endCall = betaTool({
    name: "end_call",
    description:
      "Hang up. Only once the caller's business is finished and they have said goodbye or confirmed there is " +
      "nothing else. Say goodbye BEFORE calling this — nothing you write after it will be heard.",
    inputSchema: {
      type: "object",
      properties: { summary: { type: "string", description: "One line on how the call was resolved" } },
      required: ["summary"],
      additionalProperties: false,
    },
    run: (input) => {
      signal.kind = "hangup";
      signal.reason = input.summary;
      record({ tool: "end_call", label: "Ended the call", detail: input.summary });
      return wouldHave("Call ending.");
    },
  });

  const shared = [searchKnowledge, checkAvailability, bookAppointment, captureLead, draftQuote, sendToHumanReview];
  // On a live call a queued callback is the wrong shape — the caller is already
  // on the line, so the handoff is a transfer.
  return mode === "voice"
    ? [...shared, transferToHuman, endCall]
    : [...shared, requestHumanCallback];
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
  /** Test-bench mode: tools report what they would do and write nothing. */
  dryRun?: boolean;
  /** "voice" swaps in spoken style and the live-call control tools. */
  mode?: TurnMode;
}): Promise<AssistantTurn> {
  const { business, conversation, history, dryRun = false, mode = "text" } = args;
  const actions: AssistantAction[] = [];
  const signal: CallSignal = { kind: "continue" };
  let escalated = false;
  const record = (a: AssistantAction) => actions.push(a);
  const markEscalated = () => {
    escalated = true;
  };

  if (!assistantConfigured()) {
    return await simulateTurn({ business, conversation, history, record, markEscalated, actions, dryRun, mode, signal });
  }

  const client = new Anthropic();
  const tools = buildTools(business, conversation, record, markEscalated, dryRun, mode, signal);
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
      output_config: { effort: business.effort },
      system: [
        { type: "text", text: systemPrompt(business, mode), cache_control: { type: "ephemeral" } },
      ],
      tools,
      messages,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    } as Parameters<typeof client.beta.messages.toolRunner>[0]);

    const final = await runner;

    if (final.stop_reason === "refusal") {
      if (!dryRun) createApproval({
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

    if (!dryRun) {
      logEvent({
        business_id: business.id,
        kind: escalated ? "chat_escalated" : "chat_resolved",
        summary: `${conversation.channel} · ${conversation.subject}`,
        handled_by: "ai",
        minutes_saved: escalated ? 4 : 9,
      });
    }

    return {
      reply: reply || "Let me get a teammate to confirm that for you.",
      actions,
      escalated,
      live: true,
      signal,
    };
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error(`Assistant API error (${error.status}):`, error.message);
    } else {
      console.error("Assistant error:", error);
    }
    if (!dryRun) createApproval({
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

/**
 * Streams one assistant turn. Text arrives as it is generated; tool calls still
 * run to completion first, so `onText` may stay quiet while the assistant reads
 * the knowledge base or checks the calendar — `onTool` reports that instead of
 * leaving the customer looking at a dead cursor.
 */
export async function streamAssistantTurn(args: {
  business: Business;
  conversation: Conversation;
  history: Message[];
  onText: (chunk: string) => void;
  onTool: (action: AssistantAction) => void;
}): Promise<AssistantTurn> {
  const { business, conversation, history, onText, onTool } = args;
  const actions: AssistantAction[] = [];
  let escalated = false;
  const record = (action: AssistantAction) => {
    actions.push(action);
    onTool(action);
  };
  const markEscalated = () => {
    escalated = true;
  };

  if (!assistantConfigured()) {
    const turn = await simulateTurn({
      business,
      conversation,
      history,
      record: (action) => actions.push(action),
      markEscalated,
      actions,
      dryRun: false,
    });
    for (const action of turn.actions) onTool(action);
    // Typed out rather than dumped, so the scripted path feels the same shape.
    for (const word of turn.reply.split(/(\s+)/)) {
      onText(word);
      await new Promise((resolve) => setTimeout(resolve, 12));
    }
    return turn;
  }

  const client = new Anthropic();
  const tools = buildTools(business, conversation, record, markEscalated, false);
  const messages = toApiMessages(history);

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    onText(business.greeting);
    return { reply: business.greeting, actions, escalated, live: true };
  }

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
      output_config: { effort: business.effort },
      system: [{ type: "text", text: systemPrompt(business), cache_control: { type: "ephemeral" } }],
      tools,
      messages,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      stream: true,
    } as Parameters<typeof client.beta.messages.toolRunner>[0]);

    let reply = "";
    // The params cast above erases the `stream: true` discriminant, so the
    // runner's iteration type widens to message-or-stream; it is a stream here.
    for await (const item of runner) {
      const messageStream = item as BetaMessageStream;
      for await (const event of messageStream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          reply += event.delta.text;
          onText(event.delta.text);
        }
      }
      const message = await messageStream.finalMessage();
      if (message.stop_reason === "refusal") {
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
        const handoff =
          "I'd rather have a teammate take this one. I've passed the thread to them and they'll follow up shortly.";
        onText(handoff);
        return { reply: handoff, actions, escalated: true, live: true };
      }
    }

    logEvent({
      business_id: business.id,
      kind: escalated ? "chat_escalated" : "chat_resolved",
      summary: `${conversation.channel} · ${conversation.subject}`,
      handled_by: "ai",
      minutes_saved: escalated ? 4 : 9,
    });

    return { reply: reply.trim(), actions, escalated, live: true };
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error(`Assistant stream error (${error.status}):`, error.message);
    } else {
      console.error("Assistant stream error:", error);
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
    const fallback =
      "I'm having trouble on my end right now. I've flagged this for a teammate so you're not left waiting.";
    onText(fallback);
    return { reply: fallback, actions, escalated: true, live: false };
  }
}

/* -------------------------------------------------------------------------- */
/* Offline fallback                                                            */
/* -------------------------------------------------------------------------- */

const GOODBYE_WORDS = [
  "goodbye", "good bye", "bye", "that's all", "thats all", "that's it", "thats it",
  "nothing else", "we're done", "were done", "thank you, bye", "have a good",
];

const CALL_WORDS = [
  "call me",
  "give me a call",
  "speak to a person",
  "speak to someone",
  "speak with someone",
  "talk to a person",
  "talk to someone",
  "talk to a human",
  "real person",
  "on the phone",
  "phone call",
  "representative",
  "manager",
  "owner",
];
const URGENT_WORDS = ["emergency", "urgent", "flooding", "leaking", "no heat", "burst", "spraying", "sewage"];
const BOOK_WORDS = ["book", "appointment", "schedule", "come out", "visit", "slot"];
const PRICE_WORDS = ["price", "cost", "quote", "how much", "pricing", "rate", "fee", "charge", "estimate", "ballpark", "$"];
const REFUND_WORDS = ["refund", "money back", "warranty", "complaint", "lawyer", "dispute"];

/**
 * Pulls the sentences of an article that actually answer the question, so a long
 * policy doesn't arrive as a wall of text. Sentences are quoted verbatim — nothing
 * is rewritten — and the whole body is returned when nothing clearly matches.
 */
function relevantSentences(body: string, question: string, words: string[]): string {
  if (body.length <= 260) return body;
  const sentences = body.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
  const asked = words.filter((w) => question.includes(w));
  const picked = sentences.filter((sentence) => {
    const lower = sentence.toLowerCase();
    return asked.some((w) => lower.includes(w)) || /\$\d/.test(sentence);
  });
  if (picked.length === 0 || picked.length === sentences.length) return body;
  return picked.slice(0, 3).join(" ");
}

function hits(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w));
}

/**
 * Keyword routing over the same tools as the live engine. It keeps every screen
 * functional without API credentials — replies are scripted, not generated.
 */
async function simulateTurn(args: {
  business: Business;
  conversation: Conversation;
  history: Message[];
  record: (a: AssistantAction) => void;
  markEscalated: () => void;
  actions: AssistantAction[];
  dryRun: boolean;
  mode?: TurnMode;
  signal?: CallSignal;
}): Promise<AssistantTurn> {
  const { business, conversation, history, record, markEscalated, actions, dryRun, mode = "text" } = args;
  const signal: CallSignal = args.signal ?? { kind: "continue" };
  const last = [...history].reverse().find((m) => m.role === "customer");
  const text = (last?.body ?? "").toLowerCase();
  let reply: string;
  let escalated = false;

  if (mode === "voice" && hits(text, GOODBYE_WORDS)) {
    signal.kind = "hangup";
    signal.reason = "Caller said goodbye";
    record({ tool: "end_call", label: "Ended the call", detail: "Caller said goodbye" });
    return {
      reply: "Thanks for calling. Goodbye.",
      actions,
      escalated: false,
      live: false,
      signal,
    };
  }

  const confident = hasConfidentKbMatch(business.id, text);
  const articles = confident ? searchKb(business.id, text) : [];
  if (articles.length > 0) {
    record({
      tool: "search_knowledge",
      label: "Checked knowledge base",
      detail: articles.map((a) => a.title).join(" · "),
    });
  }

  if (hits(text, REFUND_WORDS)) {
    if (!dryRun) createApproval({
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
    if (!dryRun) {
      createCallRequest({
      business_id: business.id,
      conversation_id: conversation.id,
      reason: hits(text, URGENT_WORDS) ? "Possible emergency raised in chat" : "Customer asked to speak to a person",
      urgency: hits(text, URGENT_WORDS) ? "urgent" : "normal",
      preferred_window: "As soon as possible",
        brief: `Customer wrote: "${last?.body ?? ""}". Channel: ${conversation.channel}. No commitments made yet.`,
      });
      await notifySlack({
        businessId: business.id,
        text: `:telephone_receiver: *Callback queued*\n${last?.body ?? ""}`,
      });
    }
    record({ tool: "request_human_callback", label: "Queued a human callback", detail: "Human call requested" });
    markEscalated();
    escalated = true;
    reply =
      "I can't take calls myself, but I've put you at the front of our callback queue with the details so far — " +
      "a teammate will ring you shortly.";
  } else if (hits(text, PRICE_WORDS) && articles.length > 0) {
    reply = `Here's what I have on that:\n\n${relevantSentences(
      articles[0].body,
      text,
      PRICE_WORDS,
    )}\n\nWant me to check availability for a visit?`;
  } else if (hits(text, BOOK_WORDS)) {
    const slots = availableSlots(business.id, 7).slice(0, 3);
    record({ tool: "check_availability", label: "Checked calendar", detail: `${slots.length} slots offered` });
    reply = slots.length
      ? `Happy to get you on the schedule. I have ${slots
          .map(formatSlot)
          .join(", or ")}. Which works best? Once you pick one I'll confirm it by email.`
      : "I don't see open slots this week — I've asked a teammate to call you with the next opening.";
  } else if (articles.length > 0) {
    reply = `${articles[0].body}\n\nAnything else I can pull up for you?`;
  } else {
    if (!dryRun) recordKbGap(business.id, last?.body ?? "");
    if (!dryRun) createApproval({
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

  if (!dryRun) {
    logEvent({
      business_id: business.id,
      kind: escalated ? "chat_escalated" : "chat_resolved",
      summary: `${conversation.channel} · ${conversation.subject}`,
      handled_by: "ai",
      minutes_saved: escalated ? 4 : 9,
    });
  }

  // On a live call the scripted path still has to be able to let the caller go:
  // without this, a workspace running without an API key answers the phone and
  // then never transfers or hangs up.
  if (mode === "voice" && escalated && signal.kind === "continue") {
    signal.kind = "transfer";
    signal.reason = "Scripted mode escalation";
    signal.brief = `Caller said: "${last?.body ?? ""}"`;
    record({ tool: "transfer_to_human", label: "Transferred to a teammate", detail: "Scripted mode" });
    reply = "Let me put you through to someone who can help with that.";
  }

  return { reply, actions, escalated, live: false, signal: mode === "voice" ? signal : undefined };
}
