import "server-only";
import { randomBytes } from "node:crypto";
import { getDb, id, now } from "./db";
import type {
  ActivityEvent,
  AutomationKind,
  AutomationRule,
  FollowUp,
  KbGap,
  Teammate,
  Appointment,
  Approval,
  Business,
  CallRequest,
  Channel,
  Contact,
  Conversation,
  Integration,
  KbArticle,
  Lead,
  Message,
  Quote,
  QuoteLineItem,
} from "./types";

type Row = Record<string, unknown>;

function json<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toBusiness(row: Row): Business {
  return {
    ...(row as unknown as Business),
    hours: json(row.hours, {} as Record<string, string>),
    services: json(row.services, [] as string[]),
  };
}

function toMessage(row: Row): Message {
  return { ...(row as unknown as Message), actions: json(row.actions, []) };
}

function toQuote(row: Row): Quote {
  return { ...(row as unknown as Quote), line_items: json(row.line_items, []) };
}

/* ---------------------------------------------------------------- business */

export function listBusinesses(ownerId?: string | null): Business[] {
  const db = getDb();
  const rows =
    ownerId === undefined
      ? db.prepare("SELECT * FROM businesses ORDER BY created_at").all()
      : ownerId === null
        ? db.prepare("SELECT * FROM businesses WHERE owner_id IS NULL ORDER BY created_at").all()
        : db.prepare("SELECT * FROM businesses WHERE owner_id = ? ORDER BY created_at").all(ownerId);
  return rows.map((r) => toBusiness(r as Row));
}

/** The unowned workspace anyone can explore without an account. */
export function demoBusiness(): Business | null {
  return listBusinesses(null)[0] ?? null;
}

export function getBusiness(businessId: string): Business | null {
  const row = getDb().prepare("SELECT * FROM businesses WHERE id = ?").get(businessId);
  return row ? toBusiness(row as Row) : null;
}

export function getBusinessByWidgetKey(key: string): Business | null {
  const row = getDb().prepare("SELECT * FROM businesses WHERE widget_key = ?").get(key);
  return row ? toBusiness(row as Row) : null;
}

export interface CreateBusinessInput {
  owner_id?: string | null;
  effort?: Business["effort"];
  model?: Business["model"];
  name: string;
  industry: string;
  website?: string;
  email?: string;
  phone?: string;
  timezone?: string;
  assistant_name?: string;
  tone?: string;
  greeting?: string;
  services?: string[];
  autonomy?: Business["autonomy"];
  call_handoff_number?: string;
  hours?: Record<string, string>;
}

export function createBusiness(input: CreateBusinessInput): Business {
  const db = getDb();
  const slugBase = input.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "business";
  let slug = slugBase;
  let n = 1;
  while (db.prepare("SELECT 1 FROM businesses WHERE slug = ?").get(slug)) {
    slug = `${slugBase}-${++n}`;
  }

  const business: Business = {
    id: id("biz"),
    owner_id: input.owner_id ?? null,
    slug,
    name: input.name,
    industry: input.industry,
    website: input.website ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    timezone: input.timezone ?? "America/New_York",
    hours: input.hours ?? {
      mon: "9:00-17:00",
      tue: "9:00-17:00",
      wed: "9:00-17:00",
      thu: "9:00-17:00",
      fri: "9:00-17:00",
      sat: "closed",
      sun: "closed",
    },
    assistant_name: input.assistant_name ?? "Ava",
    tone: input.tone ?? "friendly-professional",
    greeting: input.greeting ?? `Hi! Thanks for reaching out to ${input.name}. How can I help?`,
    services: input.services ?? [],
    autonomy: input.autonomy ?? "balanced",
    auto_send_threshold: input.autonomy === "autonomous" ? 0.6 : input.autonomy === "cautious" ? 0.9 : 0.75,
    effort: input.effort ?? "medium",
    model: input.model ?? "claude-sonnet-5",
    plan: "pro",
    subscription_status: "trialing",
    trial_ends_at: new Date(Date.now() + 14 * 86_400_000).toISOString(),
    stripe_customer_id: null,
    stripe_subscription_id: null,
    call_handoff_number: input.call_handoff_number ?? null,
    voice_enabled: 0,
    voice_disclosure: "Just so you know, you are speaking with an AI assistant.",
    voice_name: "en-US-Journey-O",
    voice_greeting: "",
    // The widget key is the only credential /api/chat accepts, so it must not
    // come from a predictable PRNG.
    widget_key: `mm_${randomBytes(18).toString("base64url")}`,
    created_at: now(),
  };

  db.prepare(
    `INSERT INTO businesses (id, owner_id, slug, name, industry, website, email, phone, timezone, hours,
       assistant_name, tone, greeting, services, autonomy, auto_send_threshold, effort, model,
       plan, subscription_status, trial_ends_at, stripe_customer_id, stripe_subscription_id,
       call_handoff_number, voice_enabled, voice_disclosure, voice_name, voice_greeting,
       widget_key, created_at)
     VALUES (@id, @owner_id, @slug, @name, @industry, @website, @email, @phone, @timezone, @hours,
       @assistant_name, @tone, @greeting, @services, @autonomy, @auto_send_threshold, @effort, @model,
       @plan, @subscription_status, @trial_ends_at, @stripe_customer_id, @stripe_subscription_id,
       @call_handoff_number, @voice_enabled, @voice_disclosure, @voice_name, @voice_greeting,
       @widget_key, @created_at)`,
  ).run({
    ...business,
    hours: JSON.stringify(business.hours),
    services: JSON.stringify(business.services),
  });

  return business;
}

export function updateBusiness(businessId: string, patch: Partial<CreateBusinessInput> & {
  auto_send_threshold?: number;
  effort?: Business["effort"];
  model?: Business["model"];
  voice_enabled?: number;
  voice_disclosure?: string;
  voice_name?: string;
  voice_greeting?: string;
}): void {
  const current = getBusiness(businessId);
  if (!current) return;
  const merged = { ...current, ...patch };
  getDb()
    .prepare(
      `UPDATE businesses SET name=@name, industry=@industry, website=@website, email=@email,
         phone=@phone, timezone=@timezone, hours=@hours, assistant_name=@assistant_name,
         tone=@tone, greeting=@greeting, services=@services, autonomy=@autonomy,
         auto_send_threshold=@auto_send_threshold, effort=@effort, model=@model,
         call_handoff_number=@call_handoff_number, voice_enabled=@voice_enabled,
         voice_disclosure=@voice_disclosure, voice_name=@voice_name, voice_greeting=@voice_greeting
       WHERE id=@id`,
    )
    .run({
      ...merged,
      hours: JSON.stringify(merged.hours),
      services: JSON.stringify(merged.services),
      id: businessId,
    });
}

/* --------------------------------------------------------------- knowledge */

export function listKb(businessId: string): KbArticle[] {
  return getDb()
    .prepare("SELECT * FROM kb_articles WHERE business_id = ? ORDER BY updated_at DESC")
    .all(businessId) as KbArticle[];
}

export function addKbArticle(businessId: string, title: string, body: string, source = "manual"): KbArticle {
  const article: KbArticle = {
    id: id("kb"),
    business_id: businessId,
    title,
    body,
    source,
    updated_at: now(),
  };
  getDb()
    .prepare(
      `INSERT INTO kb_articles (id, business_id, title, body, source, updated_at)
       VALUES (@id, @business_id, @title, @body, @source, @updated_at)`,
    )
    .run(article);
  return article;
}

export function deleteKbArticle(articleId: string): void {
  getDb().prepare("DELETE FROM kb_articles WHERE id = ?").run(articleId);
}

/** Marker written into starter outlines so unedited stubs are recognisable. */
export const PLACEHOLDER_MARKER = "TODO —";

export function isPlaceholder(article: Pick<KbArticle, "body">): boolean {
  return article.body.includes(PLACEHOLDER_MARKER);
}

/**
 * Customers and knowledge bases rarely pick the same word for the same thing:
 * people ask what you *charge*, owners write down their *prices*. Each term is
 * matched against its alternatives too, so one vocabulary gap doesn't turn an
 * answerable question into an escalation.
 */
const SYNONYMS: Record<string, string[]> = {
  charge: ["pricing", "price", "cost", "fee", "rate"],
  charges: ["pricing", "price", "cost", "fee", "rate"],
  cost: ["pricing", "price", "fee", "rate"],
  costs: ["pricing", "price", "fee", "rate"],
  price: ["pricing", "cost", "fee", "rate"],
  prices: ["pricing", "cost", "fee", "rate"],
  quote: ["pricing", "price", "cost", "estimate"],
  estimate: ["quote", "pricing", "price", "cost"],
  expensive: ["pricing", "price", "cost"],
  much: ["pricing", "price", "cost"],
  open: ["hours", "schedule"],
  closed: ["hours", "schedule"],
  hours: ["open", "schedule"],
  area: ["serve", "service area", "coverage"],
  cover: ["serve", "area", "coverage"],
  refund: ["warranty", "guarantee", "money back"],
  guarantee: ["warranty", "refund"],
  warranty: ["guarantee", "refund"],
  cancel: ["cancellation", "reschedule"],
  reschedule: ["cancellation", "cancel", "booking"],
  book: ["booking", "appointment", "schedule"],
  booking: ["book", "appointment", "schedule"],
  appointment: ["booking", "schedule"],
  emergency: ["urgent", "after-hours"],
};

function variants(term: string): string[] {
  return [term, ...(SYNONYMS[term] ?? [])];
}

/** Plenty of price lists name no prices — they just list dollar figures. */
const MONEY_WORDS = new Set([
  "charge", "charges", "cost", "costs", "price", "prices", "pricing",
  "quote", "estimate", "expensive", "fee", "rate", "much",
]);

/** Keyword scoring is enough here: knowledge bases are per-business and small. */
export function searchKbRanked(
  businessId: string,
  query: string,
  limit = 4,
): { article: KbArticle; score: number; terms: number }[] {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
  // An unedited stub is worse than no article: it reads like an answer.
  const articles = listKb(businessId).filter((article) => !isPlaceholder(article));
  if (terms.length === 0) {
    return articles.slice(0, limit).map((article) => ({ article, score: 0, terms: 0 }));
  }

  return articles
    .map((article) => {
      const haystack = `${article.title} ${article.body}`.toLowerCase();
      // A hit in the title has to outweigh two in a body, or a long article that
      // mentions everything in passing beats the one actually about the subject:
      // "do you cover my area?" was answering out of the pricing article because
      // it happened to contain both words.
      const title = article.title.toLowerCase();
      const quotesFigures = /\$\d/.test(article.body);
      const score = terms.reduce((sum, term) => {
        const forms = variants(term);
        if (forms.some((form) => title.includes(form))) return sum + 3;
        if (forms.some((form) => haystack.includes(form))) return sum + 1;
        return sum + (MONEY_WORDS.has(term) && quotesFigures ? 1 : 0);
      }, 0);
      return { article, score, terms: terms.length };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function searchKb(businessId: string, query: string, limit = 4): KbArticle[] {
  return searchKbRanked(businessId, query, limit).map((result) => result.article);
}

/**
 * True when the best match is strong enough to answer from without a model's
 * judgement — used by the scripted fallback, which has none.
 */
export function hasConfidentKbMatch(businessId: string, query: string): boolean {
  const [best] = searchKbRanked(businessId, query, 1);
  if (!best) return false;
  if (best.terms <= 2) return best.score >= 2;
  // Either a lot of overlap in absolute terms, or a decent share of what was asked.
  return best.score >= 4 || (best.score >= 2 && best.score / best.terms >= 0.4);
}

/* ---------------------------------------------------------------- contacts */

export function listContacts(businessId: string): Contact[] {
  return getDb()
    .prepare("SELECT * FROM contacts WHERE business_id = ? ORDER BY created_at DESC")
    .all(businessId) as Contact[];
}

export function getContact(contactId: string): Contact | null {
  return (getDb().prepare("SELECT * FROM contacts WHERE id = ?").get(contactId) as Contact) ?? null;
}

export function upsertContact(
  businessId: string,
  input: { name: string; email?: string | null; phone?: string | null; company?: string | null },
): Contact {
  const db = getDb();
  const existing = input.email
    ? (db
        .prepare("SELECT * FROM contacts WHERE business_id = ? AND email = ?")
        .get(businessId, input.email) as Contact | undefined)
    : undefined;

  if (existing) {
    db.prepare("UPDATE contacts SET name = ?, phone = COALESCE(?, phone), company = COALESCE(?, company) WHERE id = ?")
      .run(input.name || existing.name, input.phone ?? null, input.company ?? null, existing.id);
    return getContact(existing.id)!;
  }

  const contact: Contact = {
    id: id("ct"),
    business_id: businessId,
    name: input.name,
    email: input.email ?? null,
    phone: input.phone ?? null,
    company: input.company ?? null,
    created_at: now(),
  };
  db.prepare(
    `INSERT INTO contacts (id, business_id, name, email, phone, company, created_at)
     VALUES (@id, @business_id, @name, @email, @phone, @company, @created_at)`,
  ).run(contact);
  return contact;
}

/* ----------------------------------------------------------- conversations */

export function listConversations(businessId: string): Conversation[] {
  return getDb()
    .prepare("SELECT * FROM conversations WHERE business_id = ? ORDER BY last_message_at DESC")
    .all(businessId) as Conversation[];
}

export function getConversation(conversationId: string): Conversation | null {
  return (
    (getDb().prepare("SELECT * FROM conversations WHERE id = ?").get(conversationId) as Conversation) ?? null
  );
}

/** The only writer of subscription state; everything else reads it. */
export function setSubscription(
  businessId: string,
  patch: {
    plan?: Business["plan"];
    subscription_status?: Business["subscription_status"];
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
  },
): void {
  const current = getBusiness(businessId);
  if (!current) return;
  getDb()
    .prepare(
      `UPDATE businesses SET plan = ?, subscription_status = ?, stripe_customer_id = ?, stripe_subscription_id = ?
       WHERE id = ?`,
    )
    .run(
      patch.plan ?? current.plan,
      patch.subscription_status ?? current.subscription_status,
      patch.stripe_customer_id ?? current.stripe_customer_id,
      patch.stripe_subscription_id ?? current.stripe_subscription_id,
      businessId,
    );
}

/** Records how long an answered call ran, for metering voice minutes. */
export function setCallDuration(conversationId: string, seconds: number): void {
  getDb()
    .prepare("UPDATE conversations SET duration_seconds = ? WHERE id = ?")
    .run(Math.max(0, Math.round(seconds)), conversationId);
}

export function createConversation(input: {
  business_id: string;
  contact_id?: string | null;
  channel: Channel;
  subject: string;
}): Conversation {
  const conversation: Conversation = {
    id: id("cv"),
    business_id: input.business_id,
    contact_id: input.contact_id ?? null,
    channel: input.channel,
    duration_seconds: 0,
    subject: input.subject,
    status: "open",
    handled_by: "ai",
    last_message_at: now(),
    created_at: now(),
  };
  getDb()
    .prepare(
      `INSERT INTO conversations (id, business_id, contact_id, channel, subject, status, handled_by,
         last_message_at, created_at)
       VALUES (@id, @business_id, @contact_id, @channel, @subject, @status, @handled_by,
         @last_message_at, @created_at)`,
    )
    .run(conversation);
  return conversation;
}

export function updateConversation(
  conversationId: string,
  patch: Partial<Pick<Conversation, "status" | "handled_by" | "subject" | "contact_id">>,
): void {
  const current = getConversation(conversationId);
  if (!current) return;
  const merged = { ...current, ...patch };
  getDb()
    .prepare("UPDATE conversations SET status=?, handled_by=?, subject=?, contact_id=? WHERE id=?")
    .run(merged.status, merged.handled_by, merged.subject, merged.contact_id, conversationId);
}

export function listMessages(conversationId: string): Message[] {
  return getDb()
    .prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at, rowid")
    .all(conversationId)
    .map((r) => toMessage(r as Row));
}

export function addMessage(input: {
  conversation_id: string;
  role: Message["role"];
  body: string;
  actions?: Message["actions"];
  /** Only the seed passes this, to give sample threads a believable pace. */
  created_at?: string;
}): Message {
  const message: Message = {
    id: id("msg"),
    conversation_id: input.conversation_id,
    role: input.role,
    body: input.body,
    actions: input.actions ?? [],
    created_at: input.created_at ?? now(),
  };
  const db = getDb();
  db.prepare(
    `INSERT INTO messages (id, conversation_id, role, body, actions, created_at)
     VALUES (@id, @conversation_id, @role, @body, @actions, @created_at)`,
  ).run({ ...message, actions: JSON.stringify(message.actions) });
  db.prepare("UPDATE conversations SET last_message_at = ? WHERE id = ?").run(
    message.created_at,
    input.conversation_id,
  );
  return message;
}

/* ------------------------------------------------------------ appointments */

export function listAppointments(businessId: string): Appointment[] {
  return getDb()
    .prepare("SELECT * FROM appointments WHERE business_id = ? ORDER BY starts_at")
    .all(businessId) as Appointment[];
}

export function createAppointment(input: {
  business_id: string;
  contact_id?: string | null;
  title: string;
  starts_at: string;
  duration_min?: number;
  location?: string;
  notes?: string | null;
  source?: string;
}): Appointment {
  const appointment: Appointment = {
    id: id("apt"),
    business_id: input.business_id,
    contact_id: input.contact_id ?? null,
    title: input.title,
    starts_at: input.starts_at,
    duration_min: input.duration_min ?? 30,
    status: "scheduled",
    location: input.location ?? "Video call",
    notes: input.notes ?? null,
    source: input.source ?? "ai",
    created_at: now(),
  };
  getDb()
    .prepare(
      `INSERT INTO appointments (id, business_id, contact_id, title, starts_at, duration_min, status,
         location, notes, source, created_at)
       VALUES (@id, @business_id, @contact_id, @title, @starts_at, @duration_min, @status,
         @location, @notes, @source, @created_at)`,
    )
    .run(appointment);
  return appointment;
}

export function setAppointmentStatus(appointmentId: string, status: Appointment["status"]): void {
  getDb().prepare("UPDATE appointments SET status = ? WHERE id = ?").run(status, appointmentId);
}

/** Free slots for the next `days` days, respecting the business's weekly hours. */
export function availableSlots(businessId: string, days = 7, slotMinutes = 30): string[] {
  const business = getBusiness(businessId);
  if (!business) return [];
  const booked = new Set(
    listAppointments(businessId)
      .filter((a) => a.status !== "cancelled")
      .map((a) => a.starts_at.slice(0, 16)),
  );
  const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const slots: string[] = [];
  const cursor = new Date();
  cursor.setMinutes(0, 0, 0);

  for (let d = 0; d < days; d++) {
    const day = new Date(cursor);
    day.setDate(cursor.getDate() + d);
    const hours = business.hours[dayKeys[day.getDay()]] ?? "closed";
    if (hours === "closed" || !hours.includes("-")) continue;

    const [open, close] = hours.split("-");
    const [openH, openM] = open.split(":").map(Number);
    const [closeH, closeM] = close.split(":").map(Number);
    const start = new Date(day);
    start.setHours(openH, openM || 0, 0, 0);
    const end = new Date(day);
    end.setHours(closeH, closeM || 0, 0, 0);

    for (let t = new Date(start); t < end; t = new Date(t.getTime() + slotMinutes * 60_000)) {
      if (t.getTime() < Date.now()) continue;
      const iso = t.toISOString();
      if (!booked.has(iso.slice(0, 16))) slots.push(iso);
    }
  }
  return slots;
}

/* ------------------------------------------------------------------- leads */

export function listLeads(businessId: string): Lead[] {
  return getDb()
    .prepare("SELECT * FROM leads WHERE business_id = ? ORDER BY created_at DESC")
    .all(businessId) as Lead[];
}

export function createLead(input: {
  business_id: string;
  contact_id?: string | null;
  source?: string;
  intent: string;
  stage?: Lead["stage"];
  score?: number;
  value_cents?: number;
  notes?: string | null;
}): Lead {
  const lead: Lead = {
    id: id("ld"),
    business_id: input.business_id,
    contact_id: input.contact_id ?? null,
    source: input.source ?? "web",
    intent: input.intent,
    stage: input.stage ?? "new",
    score: input.score ?? 50,
    value_cents: input.value_cents ?? 0,
    notes: input.notes ?? null,
    created_at: now(),
  };
  getDb()
    .prepare(
      `INSERT INTO leads (id, business_id, contact_id, source, intent, stage, score, value_cents, notes, created_at)
       VALUES (@id, @business_id, @contact_id, @source, @intent, @stage, @score, @value_cents, @notes, @created_at)`,
    )
    .run(lead);
  return lead;
}

export function setLeadStage(leadId: string, stage: Lead["stage"]): void {
  getDb().prepare("UPDATE leads SET stage = ? WHERE id = ?").run(stage, leadId);
}

/* ------------------------------------------------------------------ quotes */

export function listQuotes(businessId: string): Quote[] {
  return getDb()
    .prepare("SELECT * FROM quotes WHERE business_id = ? ORDER BY created_at DESC")
    .all(businessId)
    .map((r) => toQuote(r as Row));
}

export function createQuote(input: {
  business_id: string;
  lead_id?: string | null;
  title: string;
  line_items: QuoteLineItem[];
}): Quote {
  const total = input.line_items.reduce((sum, li) => sum + li.quantity * li.unit_price_cents, 0);
  const quote: Quote = {
    id: id("qt"),
    business_id: input.business_id,
    lead_id: input.lead_id ?? null,
    title: input.title,
    line_items: input.line_items,
    total_cents: total,
    status: "draft",
    created_at: now(),
  };
  getDb()
    .prepare(
      `INSERT INTO quotes (id, business_id, lead_id, title, line_items, total_cents, status, created_at)
       VALUES (@id, @business_id, @lead_id, @title, @line_items, @total_cents, @status, @created_at)`,
    )
    .run({ ...quote, line_items: JSON.stringify(quote.line_items) });
  return quote;
}

export function setQuoteStatus(quoteId: string, status: Quote["status"]): void {
  getDb().prepare("UPDATE quotes SET status = ? WHERE id = ?").run(status, quoteId);
}

/* --------------------------------------------------------------- approvals */

export function listApprovals(businessId: string): Approval[] {
  return getDb()
    .prepare("SELECT * FROM approvals WHERE business_id = ? ORDER BY created_at DESC")
    .all(businessId) as Approval[];
}

export function createApproval(input: {
  business_id: string;
  conversation_id?: string | null;
  kind: Approval["kind"];
  title: string;
  summary: string;
  draft?: string;
  risk?: Approval["risk"];
  confidence?: number;
}): Approval {
  const approval: Approval = {
    id: id("ap"),
    business_id: input.business_id,
    conversation_id: input.conversation_id ?? null,
    kind: input.kind,
    title: input.title,
    summary: input.summary,
    draft: input.draft ?? "",
    risk: input.risk ?? "low",
    confidence: input.confidence ?? 0.5,
    status: "pending",
    created_at: now(),
  };
  getDb()
    .prepare(
      `INSERT INTO approvals (id, business_id, conversation_id, kind, title, summary, draft, risk,
         confidence, status, created_at)
       VALUES (@id, @business_id, @conversation_id, @kind, @title, @summary, @draft, @risk,
         @confidence, @status, @created_at)`,
    )
    .run(approval);
  return approval;
}

export function resolveApproval(approvalId: string, status: "approved" | "rejected"): Approval | null {
  const db = getDb();
  const approval = db.prepare("SELECT * FROM approvals WHERE id = ?").get(approvalId) as Approval | undefined;
  if (!approval) return null;
  db.prepare("UPDATE approvals SET status = ? WHERE id = ?").run(status, approvalId);

  if (status === "approved" && approval.conversation_id && approval.draft) {
    addMessage({
      conversation_id: approval.conversation_id,
      role: "assistant",
      body: approval.draft,
      actions: [{ tool: "approval", label: "Approved by a teammate", detail: approval.title }],
    });
  }
  return { ...approval, status };
}

/* ----------------------------------------------------------- call requests */

export function listCallRequests(businessId: string): CallRequest[] {
  return getDb()
    .prepare("SELECT * FROM call_requests WHERE business_id = ? ORDER BY created_at DESC")
    .all(businessId) as CallRequest[];
}

export function createCallRequest(input: {
  business_id: string;
  contact_id?: string | null;
  conversation_id?: string | null;
  reason: string;
  urgency?: CallRequest["urgency"];
  preferred_window?: string;
  brief?: string;
}): CallRequest {
  const call: CallRequest = {
    id: id("call"),
    business_id: input.business_id,
    contact_id: input.contact_id ?? null,
    conversation_id: input.conversation_id ?? null,
    reason: input.reason,
    urgency: input.urgency ?? "normal",
    preferred_window: input.preferred_window ?? "Any time",
    brief: input.brief ?? "",
    status: "queued",
    assigned_to: null,
    outcome: null,
    created_at: now(),
  };
  getDb()
    .prepare(
      `INSERT INTO call_requests (id, business_id, contact_id, conversation_id, reason, urgency,
         preferred_window, brief, status, assigned_to, outcome, created_at)
       VALUES (@id, @business_id, @contact_id, @conversation_id, @reason, @urgency,
         @preferred_window, @brief, @status, @assigned_to, @outcome, @created_at)`,
    )
    .run(call);
  return call;
}

export function updateCallRequest(
  callId: string,
  patch: Partial<Pick<CallRequest, "status" | "assigned_to" | "outcome">>,
): void {
  const db = getDb();
  const current = db.prepare("SELECT * FROM call_requests WHERE id = ?").get(callId) as CallRequest | undefined;
  if (!current) return;
  const merged = { ...current, ...patch };
  db.prepare("UPDATE call_requests SET status=?, assigned_to=?, outcome=? WHERE id=?").run(
    merged.status,
    merged.assigned_to,
    merged.outcome,
    callId,
  );
}

/* ------------------------------------------------------------ integrations */

export function listIntegrations(businessId: string): Integration[] {
  return getDb()
    .prepare("SELECT * FROM integrations WHERE business_id = ? ORDER BY provider")
    .all(businessId) as Integration[];
}

export function setIntegrationStatus(
  businessId: string,
  provider: string,
  status: Integration["status"],
): void {
  getDb()
    .prepare(
      `INSERT INTO integrations (id, business_id, provider, status, connected_at)
       VALUES (@id, @business_id, @provider, @status, @connected_at)
       ON CONFLICT (business_id, provider)
       DO UPDATE SET status = excluded.status, connected_at = excluded.connected_at`,
    )
    .run({
      id: id("int"),
      business_id: businessId,
      provider,
      status,
      connected_at: status === "connected" ? now() : null,
    });
}

/* ------------------------------------------------------------------ events */

export function listEvents(businessId: string, limit = 50): ActivityEvent[] {
  return getDb()
    .prepare("SELECT * FROM events WHERE business_id = ? ORDER BY created_at DESC LIMIT ?")
    .all(businessId, limit) as ActivityEvent[];
}

export function logEvent(input: {
  business_id: string;
  kind: string;
  summary: string;
  handled_by?: "ai" | "human";
  minutes_saved?: number;
  created_at?: string;
}): void {
  getDb()
    .prepare(
      `INSERT INTO events (id, business_id, kind, summary, handled_by, minutes_saved, created_at)
       VALUES (@id, @business_id, @kind, @summary, @handled_by, @minutes_saved, @created_at)`,
    )
    .run({
      id: id("ev"),
      business_id: input.business_id,
      kind: input.kind,
      summary: input.summary,
      handled_by: input.handled_by ?? "ai",
      minutes_saved: input.minutes_saved ?? 0,
      created_at: input.created_at ?? now(),
    });
}

/* --------------------------------------------------------------- analytics */

export interface Metrics {
  conversations: number;
  aiHandled: number;
  humanHandled: number;
  deflectionRate: number;
  minutesSaved: number;
  appointments: number;
  leads: number;
  pipelineCents: number;
  callsQueued: number;
  pendingApprovals: number;
  byDay: { date: string; ai: number; human: number }[];
  byChannel: { channel: string; count: number }[];
}

export function metrics(businessId: string): Metrics {
  const db = getDb();
  const conversations = listConversations(businessId);
  const events = db
    .prepare("SELECT * FROM events WHERE business_id = ?")
    .all(businessId) as ActivityEvent[];

  const aiHandled = events.filter((e) => e.handled_by === "ai").length;
  const humanHandled = events.filter((e) => e.handled_by === "human").length;
  const minutesSaved = events.reduce((sum, e) => sum + e.minutes_saved, 0);
  const leads = listLeads(businessId);

  const dayMap = new Map<string, { ai: number; human: number }>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dayMap.set(d.toISOString().slice(0, 10), { ai: 0, human: 0 });
  }
  for (const event of events) {
    const key = event.created_at.slice(0, 10);
    const bucket = dayMap.get(key);
    if (bucket) bucket[event.handled_by] += 1;
  }

  const channelMap = new Map<string, number>();
  for (const conversation of conversations) {
    channelMap.set(conversation.channel, (channelMap.get(conversation.channel) ?? 0) + 1);
  }

  return {
    conversations: conversations.length,
    aiHandled,
    humanHandled,
    deflectionRate: aiHandled + humanHandled === 0 ? 0 : aiHandled / (aiHandled + humanHandled),
    minutesSaved,
    appointments: listAppointments(businessId).filter((a) => a.status !== "cancelled").length,
    leads: leads.length,
    pipelineCents: leads
      .filter((l) => l.stage !== "lost")
      .reduce((sum, l) => sum + l.value_cents, 0),
    callsQueued: listCallRequests(businessId).filter((c) => c.status !== "done").length,
    pendingApprovals: listApprovals(businessId).filter((a) => a.status === "pending").length,
    byDay: [...dayMap.entries()].map(([date, v]) => ({ date, ...v })),
    byChannel: [...channelMap.entries()].map(([channel, count]) => ({ channel, count })),
  };
}

/* --------------------------------------------------------------- kb gaps */

function normalizeQuestion(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    .sort()
    .join(" ")
    .slice(0, 180);
}

const STOP_WORDS = new Set([
  "the", "and", "you", "your", "for", "are", "can", "does", "did", "how", "what", "when", "where", "who", "why",
  "with", "have", "has", "will", "would", "could", "should", "any", "get", "got", "there", "this", "that", "they",
]);

/** Records a question the assistant had no article for, deduped by content. */
export function recordKbGap(businessId: string, question: string): void {
  const trimmed = question.trim().slice(0, 400);
  if (trimmed.length < 4) return;
  const normalized = normalizeQuestion(trimmed);
  if (!normalized) return;

  getDb()
    .prepare(
      `INSERT INTO kb_gaps (id, business_id, question, normalized, hits, status, last_seen, created_at)
       VALUES (@id, @business_id, @question, @normalized, 1, 'open', @now, @now)
       ON CONFLICT (business_id, normalized)
       DO UPDATE SET hits = hits + 1, last_seen = excluded.last_seen,
                     status = CASE WHEN kb_gaps.status = 'dismissed' THEN 'dismissed' ELSE 'open' END`,
    )
    .run({
      id: id("gap"),
      business_id: businessId,
      question: trimmed,
      normalized,
      now: now(),
    });
}

export function listKbGaps(businessId: string): KbGap[] {
  return getDb()
    .prepare("SELECT * FROM kb_gaps WHERE business_id = ? ORDER BY status = 'open' DESC, hits DESC, last_seen DESC")
    .all(businessId) as KbGap[];
}

export function setKbGapStatus(gapId: string, status: KbGap["status"]): void {
  getDb().prepare("UPDATE kb_gaps SET status = ? WHERE id = ?").run(status, gapId);
}

/* ----------------------------------------------------------- automations */

export const DEFAULT_RULES: { kind: AutomationRule["kind"]; delay_hours: number; channel: "sms" | "email"; template: string; }[] = [
  {
    kind: "appointment_reminder",
    delay_hours: 24,
    channel: "sms",
    template:
      "Hi {{name}} — reminder that {{business}} is booked for {{appointment}}. Reply here if you need to move it.",
  },
  {
    kind: "quote_chase",
    delay_hours: 72,
    channel: "email",
    template:
      "Hi {{name}}, just checking whether you had questions on the quote we sent. Happy to walk through it or " +
      "adjust the scope.",
  },
  {
    kind: "review_request",
    delay_hours: 48,
    channel: "sms",
    template: "Thanks for having us out, {{name}}. If we did right by you, a quick review helps a lot: {{link}}",
  },
  {
    kind: "no_reply_nudge",
    delay_hours: 24,
    channel: "sms",
    template: "Hi {{name}} — still happy to help with {{topic}} whenever you're ready. Just reply here.",
  },
];

export function listAutomationRules(businessId: string): AutomationRule[] {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM automation_rules WHERE business_id = ?")
    .all(businessId) as (Omit<AutomationRule, "enabled"> & { enabled: number })[];

  const byKind = new Map(existing.map((rule) => [rule.kind, rule]));
  for (const preset of DEFAULT_RULES) {
    if (byKind.has(preset.kind)) continue;
    const rule = { id: id("rule"), business_id: businessId, enabled: 1, ...preset };
    db.prepare(
      `INSERT INTO automation_rules (id, business_id, kind, enabled, delay_hours, channel, template)
       VALUES (@id, @business_id, @kind, @enabled, @delay_hours, @channel, @template)`,
    ).run(rule);
    byKind.set(preset.kind, rule as (typeof existing)[number]);
  }

  return DEFAULT_RULES.map((preset) => {
    const row = byKind.get(preset.kind)!;
    return { ...row, enabled: Boolean(row.enabled) } as AutomationRule;
  });
}

export function updateAutomationRule(
  businessId: string,
  kind: AutomationRule["kind"],
  patch: { enabled?: boolean; delay_hours?: number; channel?: "sms" | "email"; template?: string },
): void {
  const current = listAutomationRules(businessId).find((rule) => rule.kind === kind);
  if (!current) return;
  const merged = { ...current, ...patch };
  getDb()
    .prepare(
      `UPDATE automation_rules SET enabled = ?, delay_hours = ?, channel = ?, template = ?
       WHERE business_id = ? AND kind = ?`,
    )
    .run(merged.enabled ? 1 : 0, merged.delay_hours, merged.channel, merged.template, businessId, kind);
}

export function listFollowUps(businessId: string): FollowUp[] {
  return getDb()
    .prepare("SELECT * FROM follow_ups WHERE business_id = ? ORDER BY due_at")
    .all(businessId) as FollowUp[];
}

export function createFollowUp(input: {
  business_id: string;
  contact_id?: string | null;
  conversation_id?: string | null;
  rule: AutomationKind;
  channel: "sms" | "email";
  body: string;
  due_at: string;
}): FollowUp {
  const followUp: FollowUp = {
    id: id("fu"),
    business_id: input.business_id,
    contact_id: input.contact_id ?? null,
    conversation_id: input.conversation_id ?? null,
    rule: input.rule,
    channel: input.channel,
    body: input.body,
    due_at: input.due_at,
    status: "scheduled",
    created_at: now(),
  };
  getDb()
    .prepare(
      `INSERT INTO follow_ups (id, business_id, contact_id, conversation_id, rule, channel, body, due_at, status, created_at)
       VALUES (@id, @business_id, @contact_id, @conversation_id, @rule, @channel, @body, @due_at, @status, @created_at)`,
    )
    .run(followUp);
  return followUp;
}

export function setFollowUpStatus(followUpId: string, status: FollowUp["status"]): void {
  getDb().prepare("UPDATE follow_ups SET status = ? WHERE id = ?").run(status, followUpId);
}

/**
 * Schedules follow-ups the enabled rules imply and that don't exist yet.
 * Idempotent: re-running never double-books the same contact and rule.
 */
export function syncFollowUps(businessId: string): number {
  const business = getBusiness(businessId);
  if (!business) return 0;

  const rules = listAutomationRules(businessId).filter((rule) => rule.enabled);
  const existing = new Set(
    listFollowUps(businessId)
      .filter((followUp) => followUp.status !== "cancelled")
      .map((followUp) => `${followUp.rule}:${followUp.contact_id ?? ""}:${followUp.due_at.slice(0, 10)}`),
  );

  const render = (template: string, values: Record<string, string>) =>
    template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? `{{${key}}}`);

  let created = 0;

  for (const rule of rules) {
    if (rule.kind === "appointment_reminder") {
      for (const appointment of listAppointments(businessId)) {
        if (appointment.status === "cancelled" || appointment.status === "completed") continue;
        const dueAt = new Date(new Date(appointment.starts_at).getTime() - rule.delay_hours * 3_600_000);
        if (dueAt.getTime() < Date.now() - 86_400_000) continue;
        const contact = appointment.contact_id ? getContact(appointment.contact_id) : null;
        const key = `${rule.kind}:${appointment.contact_id ?? ""}:${dueAt.toISOString().slice(0, 10)}`;
        if (existing.has(key)) continue;
        createFollowUp({
          business_id: businessId,
          contact_id: appointment.contact_id,
          rule: rule.kind,
          channel: rule.channel,
          due_at: dueAt.toISOString(),
          body: render(rule.template, {
            name: contact?.name.split(" ")[0] ?? "there",
            business: business.name,
            appointment: new Date(appointment.starts_at).toLocaleString("en-US", {
              weekday: "long",
              hour: "numeric",
              minute: "2-digit",
            }),
          }),
        });
        existing.add(key);
        created += 1;
      }
    }

    if (rule.kind === "quote_chase") {
      for (const quote of listQuotes(businessId)) {
        if (quote.status !== "draft" && quote.status !== "sent") continue;
        const lead = quote.lead_id ? listLeads(businessId).find((l) => l.id === quote.lead_id) : null;
        const contact = lead?.contact_id ? getContact(lead.contact_id) : null;
        const dueAt = new Date(new Date(quote.created_at).getTime() + rule.delay_hours * 3_600_000);
        const key = `${rule.kind}:${contact?.id ?? ""}:${dueAt.toISOString().slice(0, 10)}`;
        if (existing.has(key)) continue;
        createFollowUp({
          business_id: businessId,
          contact_id: contact?.id ?? null,
          rule: rule.kind,
          channel: rule.channel,
          due_at: dueAt.toISOString(),
          body: render(rule.template, { name: contact?.name.split(" ")[0] ?? "there", business: business.name }),
        });
        existing.add(key);
        created += 1;
      }
    }

    if (rule.kind === "no_reply_nudge") {
      for (const conversation of listConversations(businessId)) {
        if (conversation.status === "closed") continue;
        const messages = listMessages(conversation.id);
        const last = messages[messages.length - 1];
        if (!last || last.role === "customer") continue;
        const dueAt = new Date(new Date(last.created_at).getTime() + rule.delay_hours * 3_600_000);
        const contact = conversation.contact_id ? getContact(conversation.contact_id) : null;
        const key = `${rule.kind}:${conversation.contact_id ?? ""}:${dueAt.toISOString().slice(0, 10)}`;
        if (existing.has(key)) continue;
        createFollowUp({
          business_id: businessId,
          contact_id: conversation.contact_id,
          conversation_id: conversation.id,
          rule: rule.kind,
          channel: rule.channel,
          due_at: dueAt.toISOString(),
          body: render(rule.template, {
            name: contact?.name.split(" ")[0] ?? "there",
            topic: conversation.subject.toLowerCase(),
          }),
        });
        existing.add(key);
        created += 1;
      }
    }
  }

  return created;
}

/* --------------------------------------------------------------- teammates */

export function listTeammates(businessId: string): Teammate[] {
  return (
    getDb()
      .prepare("SELECT * FROM teammates WHERE business_id = ? ORDER BY created_at")
      .all(businessId) as (Omit<Teammate, "takes_calls"> & { takes_calls: number })[]
  ).map((row) => ({ ...row, takes_calls: Boolean(row.takes_calls) }));
}

export function addTeammate(input: {
  business_id: string;
  name: string;
  email: string;
  role?: Teammate["role"];
  takes_calls?: boolean;
}): Teammate {
  const teammate: Teammate = {
    id: id("tm"),
    business_id: input.business_id,
    name: input.name,
    email: input.email,
    role: input.role ?? "agent",
    takes_calls: input.takes_calls ?? true,
    created_at: now(),
  };
  getDb()
    .prepare(
      `INSERT INTO teammates (id, business_id, name, email, role, takes_calls, created_at)
       VALUES (@id, @business_id, @name, @email, @role, @takes_calls, @created_at)`,
    )
    .run({ ...teammate, takes_calls: teammate.takes_calls ? 1 : 0 });
  return teammate;
}

export function removeTeammate(teammateId: string): void {
  getDb().prepare("DELETE FROM teammates WHERE id = ?").run(teammateId);
}

/* ------------------------------------------------- contact timeline view */

export interface ContactTimelineItem {
  kind: "message" | "appointment" | "lead" | "call";
  at: string;
  title: string;
  detail: string;
  href?: string;
}

export function contactTimeline(businessId: string, contactId: string): ContactTimelineItem[] {
  const items: ContactTimelineItem[] = [];

  for (const conversation of listConversations(businessId)) {
    if (conversation.contact_id !== contactId) continue;
    for (const message of listMessages(conversation.id)) {
      items.push({
        kind: "message",
        at: message.created_at,
        title:
          message.role === "customer"
            ? `Message on ${conversation.channel}`
            : message.role === "agent"
              ? "Teammate replied"
              : "Assistant replied",
        detail: message.body.slice(0, 220),
        href: `/dashboard/inbox/${conversation.id}`,
      });
    }
  }

  for (const appointment of listAppointments(businessId)) {
    if (appointment.contact_id !== contactId) continue;
    items.push({
      kind: "appointment",
      at: appointment.created_at,
      title: `Booked: ${appointment.title}`,
      detail: `${new Date(appointment.starts_at).toLocaleString("en-US")} · ${appointment.location}`,
      href: "/dashboard/appointments",
    });
  }

  for (const lead of listLeads(businessId)) {
    if (lead.contact_id !== contactId) continue;
    items.push({
      kind: "lead",
      at: lead.created_at,
      title: `Lead: ${lead.intent}`,
      detail: `Stage ${lead.stage} · score ${lead.score}`,
      href: "/dashboard/leads",
    });
  }

  for (const call of listCallRequests(businessId)) {
    if (call.contact_id !== contactId) continue;
    items.push({
      kind: "call",
      at: call.created_at,
      title: `Callback: ${call.reason}`,
      detail: call.status === "done" ? (call.outcome ?? "Completed") : `${call.urgency} · ${call.status}`,
      href: "/dashboard/calls",
    });
  }

  return items.sort((a, b) => (a.at < b.at ? 1 : -1));
}

/* ------------------------------------------------------------- setup state */

export interface SetupStep {
  id: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  done: boolean;
}

/**
 * Derived entirely from what's actually in the workspace — nothing here is a
 * checkbox someone can tick without doing the work.
 */
export function setupSteps(businessId: string): SetupStep[] {
  const business = getBusiness(businessId);
  const articles = listKb(businessId);
  const real = articles.filter((article) => !isPlaceholder(article));
  const stubs = articles.filter(isPlaceholder);
  const conversations = listConversations(businessId);
  const events = getDb()
    .prepare("SELECT COUNT(*) AS count FROM events WHERE business_id = ? AND kind = 'readiness_check'")
    .get(businessId) as { count: number };

  const steps: SetupStep[] = [
    {
      id: "knowledge",
      title: "Teach it what you know",
      body: "Prices, hours, policies. Three solid articles is enough to start answering.",
      href: "/dashboard/knowledge",
      cta: "Add knowledge",
      done: real.length >= 3,
    },
    {
      id: "placeholders",
      title: "Replace the placeholders",
      body: "Unedited starter articles are treated as missing — the assistant won't quote them.",
      href: "/dashboard/knowledge",
      cta: "Finish them",
      done: stubs.length === 0,
    },
    {
      id: "calls",
      title: "Say who takes the calls",
      body: "Callbacks are queued for a person. Tell us which number your team answers.",
      href: "/dashboard/settings",
      cta: "Set the number",
      done: Boolean(business?.call_handoff_number),
    },
    {
      id: "playground",
      title: "Test it before anyone sees it",
      body: "Run the readiness check and see which common questions you can't answer yet.",
      href: "/dashboard/playground",
      cta: "Run the check",
      done: events.count > 0,
    },
    {
      id: "live",
      title: "Put it in front of customers",
      body: "One script tag, a hosted link, or your forwarded inbox.",
      href: "/dashboard/install",
      cta: "Get the snippet",
      done: conversations.length > 0,
    },
    {
      id: "team",
      title: "Add whoever answers the phone",
      body: "Teammates share the inbox, the call queue and approvals.",
      href: "/dashboard/team",
      cta: "Add a teammate",
      done: listTeammates(businessId).length > 0,
    },
  ];

  // With no articles at all there is nothing to replace, and a step that ticks
  // itself for an empty knowledge base reads like progress that never happened.
  return articles.length === 0 ? steps.filter((step) => step.id !== "placeholders") : steps;
}

/* ----------------------------------------------------------------- usage */

export interface Usage {
  conversationsThisMonth: number;
  messagesThisMonth: number;
  aiHandled: number;
  escalated: number;
  callsQueued: number;
  followUpsSent: number;
  /** Plan allowance for the seeded demo plan. */
  included: number;
}

export function usage(businessId: string, included = 2500): Usage {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const since = monthStart.toISOString();

  const conversations = listConversations(businessId).filter((c) => c.created_at >= since);
  const messages = conversations.reduce((sum, c) => sum + listMessages(c.id).length, 0);
  const calls = listCallRequests(businessId).filter((c) => c.created_at >= since);

  // A conversation counted as escalated if it left something for a person: an
  // approval to make, or a call to place. Everything else the assistant closed
  // on its own, so the two rows add up to the conversations opened.
  const touchedByHuman = new Set(
    [...listApprovals(businessId), ...calls]
      .map((item) => item.conversation_id)
      .filter((id): id is string => Boolean(id)),
  );
  const escalated = conversations.filter((c) => touchedByHuman.has(c.id)).length;

  return {
    conversationsThisMonth: conversations.length,
    messagesThisMonth: messages,
    aiHandled: conversations.length - escalated,
    escalated,
    callsQueued: calls.length,
    followUpsSent: listFollowUps(businessId).filter((f) => f.status === "sent" && f.created_at >= since).length,
    included,
  };
}

/* ----------------------------------------------------------- authorization */

/**
 * Confirms a record belongs to the given business before any action mutates it.
 * Actions receive raw ids from form posts, so ownership has to be re-checked
 * server-side rather than inferred from the page the form was rendered on.
 */
export function belongsToBusiness(
  kind: "conversation" | "approval" | "call" | "lead" | "appointment" | "quote" | "gap" | "teammate" | "follow_up" | "kb",
  recordId: string,
  businessId: string,
): boolean {
  const table = {
    conversation: "conversations",
    approval: "approvals",
    call: "call_requests",
    lead: "leads",
    appointment: "appointments",
    quote: "quotes",
    gap: "kb_gaps",
    teammate: "teammates",
    follow_up: "follow_ups",
    kb: "kb_articles",
  }[kind];

  const row = getDb()
    .prepare(`SELECT business_id FROM ${table} WHERE id = ?`)
    .get(recordId) as { business_id: string } | undefined;
  return row?.business_id === businessId;
}
