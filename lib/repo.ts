import "server-only";
import { getDb, id, now } from "./db";
import type {
  ActivityEvent,
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

export function listBusinesses(): Business[] {
  return getDb()
    .prepare("SELECT * FROM businesses ORDER BY created_at")
    .all()
    .map((r) => toBusiness(r as Row));
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
    call_handoff_number: input.call_handoff_number ?? null,
    widget_key: `mm_${Math.random().toString(36).slice(2, 12)}`,
    created_at: now(),
  };

  db.prepare(
    `INSERT INTO businesses (id, slug, name, industry, website, email, phone, timezone, hours,
       assistant_name, tone, greeting, services, autonomy, auto_send_threshold,
       call_handoff_number, widget_key, created_at)
     VALUES (@id, @slug, @name, @industry, @website, @email, @phone, @timezone, @hours,
       @assistant_name, @tone, @greeting, @services, @autonomy, @auto_send_threshold,
       @call_handoff_number, @widget_key, @created_at)`,
  ).run({
    ...business,
    hours: JSON.stringify(business.hours),
    services: JSON.stringify(business.services),
  });

  return business;
}

export function updateBusiness(businessId: string, patch: Partial<CreateBusinessInput> & {
  auto_send_threshold?: number;
}): void {
  const current = getBusiness(businessId);
  if (!current) return;
  const merged = { ...current, ...patch };
  getDb()
    .prepare(
      `UPDATE businesses SET name=@name, industry=@industry, website=@website, email=@email,
         phone=@phone, timezone=@timezone, hours=@hours, assistant_name=@assistant_name,
         tone=@tone, greeting=@greeting, services=@services, autonomy=@autonomy,
         auto_send_threshold=@auto_send_threshold, call_handoff_number=@call_handoff_number
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

/** Keyword scoring is enough here: knowledge bases are per-business and small. */
export function searchKb(businessId: string, query: string, limit = 4): KbArticle[] {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
  const articles = listKb(businessId);
  if (terms.length === 0) return articles.slice(0, limit);

  return articles
    .map((article) => {
      const haystack = `${article.title} ${article.body}`.toLowerCase();
      const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
      return { article, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.article);
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
}): Message {
  const message: Message = {
    id: id("msg"),
    conversation_id: input.conversation_id,
    role: input.role,
    body: input.body,
    actions: input.actions ?? [],
    created_at: now(),
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
