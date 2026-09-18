import "server-only";
import { getDb } from "./db";
import {
  addKbArticle,
  recordKbGap,
  addMessage,
  createAppointment,
  createApproval,
  createBusiness,
  createCallRequest,
  createConversation,
  createLead,
  createQuote,
  logEvent,
  setIntegrationStatus,
  upsertContact,
} from "./repo";
import type { Business } from "./types";

/**
 * A weekday slot inside the 8am-6pm office hours the knowledge base advertises —
 * seeded appointments landing at 1am made the schedule look made up.
 */
function upcoming(daysAhead: number, hour: number, minute = 0, skipWeekend = true): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  if (skipWeekend) while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() + 1);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function daysAgo(d: number, hour = 10): string {
  const date = new Date();
  date.setDate(date.getDate() - d);
  date.setHours(hour, Math.floor(Math.random() * 59), 0, 0);
  return date.toISOString();
}

const KB: [string, string][] = [
  [
    "Services and pricing",
    "Brightline Home Services covers plumbing, heating, cooling and drain work for homes in the metro area. " +
      "Standard diagnostic visit is $89 and is waived if you book the repair the same day. " +
      "Drain cleaning starts at $149. Water heater replacement runs $1,400-$2,600 installed depending on tank size. " +
      "Annual HVAC tune-up is $129, or free for Brightline Care members.",
  ],
  [
    "Service area and hours",
    "We serve the metro area and suburbs within 35 miles of downtown. Office hours are Monday to Friday, " +
      "8am to 6pm. Emergency service (burst pipes, no heat, sewage backup) is available 24/7 with an after-hours " +
      "fee of $120. Saturday appointments are available by request for Care members.",
  ],
  [
    "Booking and cancellation policy",
    "Appointments are two-hour arrival windows. Technicians text 30 minutes before arrival. " +
      "Reschedule or cancel free up to 4 hours before the window; later changes carry a $45 fee. " +
      "We accept card, ACH and financing over $800 through our lender.",
  ],
  [
    "Brightline Care membership",
    "Brightline Care is $19/month or $199/year. It includes two HVAC tune-ups per year, free diagnostics, " +
      "15% off repairs, priority scheduling and no after-hours fees. Members average $340/year in savings.",
  ],
  [
    "Warranty and guarantees",
    "All labor is guaranteed for 12 months. Parts carry the manufacturer warranty, typically 5-10 years on " +
      "water heaters and furnaces. If a repair fails within the warranty window we return at no charge. " +
      "Refunds above $500 or any warranty dispute must be approved by the owner before we commit to it.",
  ],
];

function seedDemoBusiness(): Business {
  const business = createBusiness({
    name: "Brightline Home Services",
    industry: "Home services (plumbing & HVAC)",
    website: "https://brightlinehome.example.com",
    email: "hello@brightlinehome.example.com",
    phone: "(555) 014-2200",
    assistant_name: "Ava",
    greeting: "Hi, this is Ava at Brightline Home Services. Tell me what's going on and I'll get you sorted.",
    services: ["Plumbing repair", "Drain cleaning", "Water heaters", "HVAC repair", "HVAC tune-up", "Emergency service"],
    autonomy: "balanced",
    call_handoff_number: "(555) 014-2200",
  });

  for (const [title, body] of KB) addKbArticle(business.id, title, body, "onboarding-import");

  for (const provider of ["gmail", "google-calendar", "stripe", "twilio-sms", "slack"]) {
    setIntegrationStatus(business.id, provider, "connected");
  }
  for (const provider of ["outlook", "hubspot", "quickbooks", "shopify", "zapier", "webhooks"]) {
    setIntegrationStatus(business.id, provider, "disconnected");
  }

  /* ----------------------------------------------------- live conversations */

  const dana = upsertContact(business.id, {
    name: "Dana Whitfield",
    email: "dana.whitfield@example.com",
    phone: "(555) 271-8890",
  });
  const webChat = createConversation({
    business_id: business.id,
    contact_id: dana.id,
    channel: "web",
    subject: "Water heater leaking",
  });
  addMessage({
    conversation_id: webChat.id,
    role: "customer",
    body: "My water heater is leaking from the bottom. Do I need a new one? How fast can someone come out?",
  });
  addMessage({
    conversation_id: webChat.id,
    role: "assistant",
    body:
      "Sorry you're dealing with that. A leak from the bottom of the tank usually means the tank itself has failed, " +
      "so replacement is likely — but a tech confirms on site. Diagnostic is $89 and we waive it if you book the " +
      "repair same day. I have tomorrow 8-10am or 12-2pm open. Shut the cold water supply valve on top of the " +
      "heater in the meantime. Which window works?",
    actions: [
      { tool: "search_knowledge", label: "Checked knowledge base", detail: "Services and pricing · Booking policy" },
      { tool: "check_availability", label: "Checked calendar", detail: "2 windows open tomorrow" },
    ],
  });
  addMessage({
    conversation_id: webChat.id,
    role: "customer",
    body: "12-2 works. It's spraying a bit now though, should I be worried?",
  });
  addMessage({
    conversation_id: webChat.id,
    role: "assistant",
    body:
      "Booked you for tomorrow 12-2pm — confirmation is on its way to dana.whitfield@example.com. " +
      "Active spraying is worth a human ear, so I've put you at the top of our callback queue and a Brightline " +
      "tech will ring you in the next few minutes at (555) 271-8890.",
    actions: [
      { tool: "book_appointment", label: "Booked appointment", detail: "Tomorrow 12:00-2:00pm · Water heater assessment" },
      { tool: "request_callback", label: "Escalated to a human call", detail: "Active leak · urgent" },
    ],
  });

  const marcus = upsertContact(business.id, {
    name: "Marcus Bell",
    email: "marcus.bell@example.com",
    phone: "(555) 662-1145",
    company: "Bell Property Group",
  });
  const emailThread = createConversation({
    business_id: business.id,
    contact_id: marcus.id,
    channel: "email",
    subject: "Quote for 6 rental units — HVAC tune-ups",
  });
  addMessage({
    conversation_id: emailThread.id,
    role: "customer",
    body:
      "We manage six rental units and want annual HVAC tune-ups on all of them. Can you put together pricing? " +
      "Ideally scheduled across two mornings.",
  });
  addMessage({
    conversation_id: emailThread.id,
    role: "assistant",
    body:
      "Happy to. Six tune-ups at our standard $129 comes to $774. Brightline Care at $199/year per unit would " +
      "cover two tune-ups each plus free diagnostics and 15% off repairs — better value if you expect any repairs " +
      "this year. I've drafted both options as a quote for your review, and held two consecutive Tuesday mornings.",
    actions: [
      { tool: "create_quote", label: "Drafted quote", detail: "6 units · $774 standard / $1,194 Care" },
      { tool: "create_lead", label: "Created lead", detail: "Bell Property Group · qualified" },
    ],
  });

  const priya = upsertContact(business.id, {
    name: "Priya Raman",
    email: "priya.raman@example.com",
    phone: "(555) 903-7741",
  });
  const smsThread = createConversation({
    business_id: business.id,
    contact_id: priya.id,
    channel: "sms",
    subject: "Reschedule Thursday visit",
  });
  addMessage({
    conversation_id: smsThread.id,
    role: "customer",
    body: "Need to move my Thursday appointment, something came up at work",
  });
  addMessage({
    conversation_id: smsThread.id,
    role: "assistant",
    body:
      "No problem Priya — you're outside the 4-hour window so there's no fee. I have Friday 8-10am or " +
      "Monday 2-4pm. Reply with whichever you'd like and I'll lock it in.",
    actions: [{ tool: "check_availability", label: "Checked calendar", detail: "2 alternates offered" }],
  });

  const owen = upsertContact(business.id, {
    name: "Owen Castellanos",
    email: "owen.c@example.com",
    phone: "(555) 448-2093",
  });
  const refundThread = createConversation({
    business_id: business.id,
    contact_id: owen.id,
    channel: "email",
    subject: "Unhappy with drain service — refund request",
  });
  addMessage({
    conversation_id: refundThread.id,
    role: "customer",
    body:
      "The drain your tech cleared last month backed up again yesterday. I paid $320 and I want a full refund, " +
      "not another visit.",
  });

  /* ------------------------------------------------------------- operations */

  createAppointment({
    business_id: business.id,
    contact_id: dana.id,
    title: "Water heater assessment — Dana Whitfield",
    starts_at: upcoming(1, 12, 0, false),
    duration_min: 120,
    location: "412 Kestrel Ln",
    notes: "Leak at base of tank. Likely replacement. Customer shut off cold supply.",
  });
  createAppointment({
    business_id: business.id,
    contact_id: priya.id,
    title: "HVAC tune-up — Priya Raman",
    starts_at: upcoming(2, 13, 30),
    duration_min: 60,
    location: "88 Alderbrook Ct",
  });
  createAppointment({
    business_id: business.id,
    contact_id: marcus.id,
    title: "Tune-ups (3 units) — Bell Property Group",
    starts_at: upcoming(5, 8),
    duration_min: 180,
    location: "Cedar Row Apartments",
    notes: "Units 1A, 2B, 3C. Second batch the following Tuesday.",
  });

  const bellLead = createLead({
    business_id: business.id,
    contact_id: marcus.id,
    source: "email",
    intent: "Annual HVAC tune-ups for 6 rental units",
    stage: "quoted",
    score: 88,
    value_cents: 119_400,
    notes: "Compared standard vs Care pricing. Leaning Care.",
  });
  createLead({
    business_id: business.id,
    contact_id: dana.id,
    source: "web",
    intent: "Water heater replacement",
    stage: "qualified",
    score: 92,
    value_cents: 210_000,
  });
  createLead({
    business_id: business.id,
    contact_id: priya.id,
    source: "sms",
    intent: "Brightline Care membership",
    stage: "new",
    score: 61,
    value_cents: 19_900,
  });

  createQuote({
    business_id: business.id,
    lead_id: bellLead.id,
    title: "Bell Property Group — 6 units, Brightline Care",
    line_items: [
      { description: "Brightline Care annual membership (per unit)", quantity: 6, unit_price_cents: 19_900 },
    ],
  });

  createApproval({
    business_id: business.id,
    conversation_id: refundThread.id,
    kind: "refund",
    title: "Refund request — $320 drain service",
    summary:
      "Repeat backup 4 weeks after service, inside the 12-month labor guarantee. Policy requires owner approval " +
      "for refunds over $500 or any warranty dispute, so Ava stopped short of promising money back.",
    draft:
      "Hi Owen — I'm sorry the drain backed up again. That job is inside our 12-month labor guarantee, so the " +
      "return visit is free and we'll camera the line to find what we missed. On the refund: I'm passing that to " +
      "our owner today and you'll hear back by tomorrow. Would Thursday morning work for the return visit?",
    risk: "high",
    confidence: 0.42,
  });
  createApproval({
    business_id: business.id,
    conversation_id: emailThread.id,
    kind: "quote",
    title: "Quote over $1,000 — Bell Property Group",
    summary: "Six-unit Care package totalling $1,194. Above the $1,000 auto-send limit for quotes.",
    draft: "Quote attached: 6 × Brightline Care annual at $199/unit = $1,194, scheduled across two Tuesday mornings.",
    risk: "medium",
    confidence: 0.81,
  });

  createCallRequest({
    business_id: business.id,
    contact_id: dana.id,
    conversation_id: webChat.id,
    reason: "Active water leak — customer wants to talk to a person before tomorrow's visit",
    urgency: "urgent",
    preferred_window: "Next 30 minutes",
    brief:
      "Dana Whitfield, (555) 271-8890. Water heater leaking at the base and now spraying; cold supply shut off. " +
      "Booked tomorrow 12-2pm for assessment. Likely full replacement ($1,400-$2,600 installed). " +
      "She has not been quoted a replacement price yet. Ask whether water is reaching finished flooring — if so, " +
      "move her to today's emergency slot ($120 after-hours fee applies).",
  });
  createCallRequest({
    business_id: business.id,
    contact_id: owen.id,
    conversation_id: refundThread.id,
    reason: "Refund dispute — needs owner decision",
    urgency: "normal",
    preferred_window: "Weekday afternoons",
    brief:
      "Owen Castellanos, (555) 448-2093. Paid $320 for drain clearing on the 14th of last month; line backed up " +
      "again yesterday. Inside the 12-month labor guarantee. Wants a refund rather than a return visit. " +
      "Ava has offered a free return visit with a camera inspection and has NOT promised any money back. " +
      "Decision needed: full refund, partial credit, or return visit only.",
  });

  /* ------------------------------------------ questions nobody wrote down yet */

  for (const question of [
    "Do you install tankless water heaters?",
    "Do you install tankless water heaters or only tanks?",
    "Can you service a mini split?",
    "Do you offer a maintenance plan for landlords?",
  ]) {
    recordKbGap(business.id, question);
  }

  /* --------------------------------------------- 14 days of activity history */

  const kinds: [string, "ai" | "human", number, string][] = [
    ["chat_resolved", "ai", 9, "Answered pricing and availability question on web chat"],
    ["appointment_booked", "ai", 12, "Booked a service window and sent confirmation"],
    ["lead_captured", "ai", 7, "Captured and qualified an inbound lead"],
    ["email_replied", "ai", 11, "Drafted and sent an email reply"],
    ["sms_replied", "ai", 5, "Handled an SMS reschedule"],
    ["quote_drafted", "ai", 18, "Drafted a quote from the price list"],
    ["call_handled", "human", 0, "Teammate took a customer call"],
    ["approval_resolved", "human", 0, "Teammate reviewed an AI draft"],
  ];

  for (let day = 13; day >= 0; day--) {
    const volume = 4 + Math.floor(Math.random() * 6);
    for (let i = 0; i < volume; i++) {
      const [kind, handledBy, minutes, summary] = kinds[Math.floor(Math.random() * kinds.length)];
      logEvent({
        business_id: business.id,
        kind,
        summary,
        handled_by: handledBy,
        minutes_saved: minutes,
        created_at: daysAgo(day, 8 + Math.floor(Math.random() * 10)),
      });
    }
  }

  return business;
}

/**
 * Makes sure the install has at least one workspace so every screen has
 * somewhere to point. On first run this is the fully populated demo business;
 * set MIDDLEMEN_SEED_DEMO=false to start from an empty workspace instead.
 * Safe to call on every request.
 */
export function ensureSeeded(): void {
  const db = getDb();
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM businesses").get() as { count: number };
  if (count > 0) return;

  if (process.env.MIDDLEMEN_SEED_DEMO === "false") {
    createBusiness({ name: "My business", industry: "general" });
    return;
  }
  db.transaction(seedDemoBusiness)();
}
