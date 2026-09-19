export type Channel = "web" | "email" | "sms" | "whatsapp" | "voice";
export type Autonomy = "cautious" | "balanced" | "autonomous";

export interface Business {
  id: string;
  /** null for the public demo workspace. */
  owner_id: string | null;
  slug: string;
  name: string;
  industry: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  timezone: string;
  hours: Record<string, string>;
  assistant_name: string;
  tone: string;
  greeting: string;
  services: string[];
  autonomy: Autonomy;
  auto_send_threshold: number;
  /** Trades thoroughness against cost and latency on every reply. */
  effort: "low" | "medium" | "high";
  call_handoff_number: string | null;
  /** When on, the Twilio number is answered by the assistant instead of ringing. */
  voice_enabled: number;
  /** Spoken first, before anything else, so callers are never misled about what they reached. */
  voice_disclosure: string;
  /** Twilio ConversationRelay voice id, e.g. an ElevenLabs voice. */
  voice_name: string;
  /** Spoken greeting after the disclosure. */
  voice_greeting: string;
  widget_key: string;
  created_at: string;
}

export interface KbArticle {
  id: string;
  business_id: string;
  title: string;
  body: string;
  source: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  business_id: string;
  contact_id: string | null;
  channel: Channel;
  subject: string;
  status: "open" | "waiting" | "closed";
  handled_by: "ai" | "human";
  last_message_at: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "customer" | "assistant" | "agent" | "system";
  body: string;
  actions: AssistantAction[];
  created_at: string;
}

export interface AssistantAction {
  tool: string;
  label: string;
  detail: string;
}

export interface Appointment {
  id: string;
  business_id: string;
  contact_id: string | null;
  title: string;
  starts_at: string;
  duration_min: number;
  status: "scheduled" | "confirmed" | "cancelled" | "completed";
  location: string;
  notes: string | null;
  source: string;
  created_at: string;
}

export interface Lead {
  id: string;
  business_id: string;
  contact_id: string | null;
  source: string;
  intent: string;
  stage: "new" | "qualified" | "quoted" | "won" | "lost";
  score: number;
  value_cents: number;
  notes: string | null;
  created_at: string;
}

export interface QuoteLineItem {
  description: string;
  quantity: number;
  unit_price_cents: number;
}

export interface Quote {
  id: string;
  business_id: string;
  lead_id: string | null;
  title: string;
  line_items: QuoteLineItem[];
  total_cents: number;
  status: "draft" | "sent" | "accepted" | "declined";
  created_at: string;
}

export interface Approval {
  id: string;
  business_id: string;
  conversation_id: string | null;
  kind: "reply" | "quote" | "booking" | "refund" | "other";
  title: string;
  summary: string;
  draft: string;
  risk: "low" | "medium" | "high";
  confidence: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface CallRequest {
  id: string;
  business_id: string;
  contact_id: string | null;
  conversation_id: string | null;
  reason: string;
  urgency: "low" | "normal" | "urgent";
  preferred_window: string;
  brief: string;
  status: "queued" | "in_progress" | "done";
  assigned_to: string | null;
  outcome: string | null;
  created_at: string;
}

export interface Integration {
  id: string;
  business_id: string;
  provider: string;
  status: "connected" | "disconnected";
  connected_at: string | null;
}

export interface ActivityEvent {
  id: string;
  business_id: string;
  kind: string;
  summary: string;
  handled_by: "ai" | "human";
  minutes_saved: number;
  created_at: string;
}

export interface KbGap {
  id: string;
  business_id: string;
  question: string;
  normalized: string;
  hits: number;
  status: "open" | "answered" | "dismissed";
  last_seen: string;
  created_at: string;
}

export type AutomationKind =
  | "appointment_reminder"
  | "quote_chase"
  | "review_request"
  | "no_reply_nudge";

export interface AutomationRule {
  id: string;
  business_id: string;
  kind: AutomationKind;
  enabled: boolean;
  delay_hours: number;
  channel: "sms" | "email";
  template: string;
}

export interface FollowUp {
  id: string;
  business_id: string;
  contact_id: string | null;
  conversation_id: string | null;
  rule: AutomationKind;
  channel: "sms" | "email";
  body: string;
  due_at: string;
  status: "scheduled" | "sent" | "cancelled";
  created_at: string;
}

export interface Teammate {
  id: string;
  business_id: string;
  name: string;
  email: string;
  role: "owner" | "agent";
  takes_calls: boolean;
  created_at: string;
}
