/** Content for the marketing site. Kept as data so pages stay layout-only. */

export const CAPABILITIES = [
  {
    icon: "inbox",
    title: "One inbox, every channel",
    body:
      "Web chat, email, SMS and WhatsApp land in a single thread per customer. Your assistant reads, replies and " +
      "keeps context across all of them.",
  },
  {
    icon: "calendar",
    title: "Booking and rescheduling",
    body:
      "Reads your real availability and working hours, offers windows, books, reschedules and cancels — then sends " +
      "the confirmation.",
  },
  {
    icon: "lead",
    title: "Lead capture and qualification",
    body:
      "Every inbound message becomes a scored lead with intent, contact details and estimated value, pushed into " +
      "your pipeline.",
  },
  {
    icon: "book",
    title: "Answers from your own knowledge",
    body:
      "Prices, policies, warranty terms, service areas. If it isn't in your knowledge base, the assistant says so " +
      "instead of inventing it.",
  },
  {
    icon: "spark",
    title: "Quotes and follow-ups",
    body:
      "Drafts priced quotes from your rate card, chases the ones that go quiet, and nudges customers who never " +
      "replied.",
  },
  {
    icon: "shield",
    title: "Approvals before anything risky",
    body:
      "Refunds, warranty disputes, big-ticket quotes and low-confidence answers wait in a review queue instead of " +
      "going out the door.",
  },
  {
    icon: "phone",
    title: "Callbacks, briefed",
    body:
      "It answers the phone, books from the same calendar and quotes from the same price list. When a call needs " +
      "a person, it transfers mid-call with a brief instead of taking a message.",
  },
  {
    icon: "chart",
    title: "Reporting that means something",
    body:
      "Deflection rate, hours saved, pipeline created, response time — per channel, per day, no spreadsheet work.",
  },
] as const;

export const STEPS = [
  {
    step: "01",
    title: "Connect your business",
    body:
      "Name, hours, services and website. Three fields and a minute — no implementation call, no sales demo, no " +
      "credit card.",
  },
  {
    step: "02",
    title: "Teach it what you know",
    body:
      "Paste your prices, policies and FAQs, or let it pull them from your site. Edit any answer at any time and it " +
      "takes effect on the next message.",
  },
  {
    step: "03",
    title: "Drop in one line of code",
    body:
      "Paste a single script tag on your site, or forward your support inbox and SMS number. Your assistant is live " +
      "for customers immediately.",
  },
] as const;

export const INTEGRATIONS = [
  { name: "Gmail", note: "Read and reply to support mail" },
  { name: "Outlook", note: "Same, for Microsoft shops" },
  { name: "Google Calendar", note: "Real availability, real bookings" },
  { name: "Twilio SMS", note: "Two-way texting" },
  { name: "WhatsApp", note: "Business messaging" },
  { name: "Stripe", note: "Invoices and payment links" },
  { name: "QuickBooks", note: "Estimates and invoices" },
  { name: "HubSpot", note: "Push leads to your CRM" },
  { name: "Slack", note: "Escalations where your team lives" },
  { name: "Shopify", note: "Order status answers" },
  { name: "Zapier", note: "Everything else" },
  { name: "Webhooks", note: "Your own stack" },
] as const;

export interface Plan {
  name: string;
  monthly: number | null;
  blurb: string;
  features: string[];
  featured?: boolean;
}

export const PLANS: Plan[] = [
  {
    name: "Solo",
    monthly: 49,
    blurb: "One person who is tired of answering the same five questions.",
    features: [
      "1 assistant",
      "Web chat + email",
      "500 conversations/mo",
      "Booking & lead capture",
      "Callback queue with briefs",
      "Knowledge base & approvals",
    ],
  },
  {
    name: "Team",
    monthly: 149,
    blurb: "A front desk that keeps up with a busy crew.",
    features: [
      "Everything in Solo",
      "SMS + WhatsApp",
      "2,500 conversations/mo",
      "Quotes, invoices & CRM sync",
      "5 teammates on the call queue",
      "Calendar & Stripe integrations",
    ],
    featured: true,
  },
  {
    name: "Scale",
    monthly: null,
    blurb: "Multiple locations, multiple brands, one set of rules.",
    features: [
      "Everything in Team",
      "Unlimited conversations",
      "Multi-location routing",
      "Custom tools & webhooks",
      "SSO and audit log",
      "Priority support",
    ],
  },
];

export const FAQS = [
  {
    q: "Does the AI actually talk to customers on the phone?",
    a:
      "Yes. Point your Twilio number at Lobby and it answers, in a real voice, with the same knowledge base and " +
      "calendar it uses in chat — so it can quote a price and book the slot while the caller is on the line. It " +
      "opens by saying it is an AI, and it transfers to your team the moment someone asks for a person or the " +
      "conversation reaches something it is not allowed to decide. Answering calls is off until you turn it on.",
  },
  {
    q: "What stops it from making things up?",
    a:
      "Answers come from your knowledge base and availability comes from your calendar — the assistant can only " +
      "quote what you've written down. When it can't find something, it says so and offers a human follow-up. " +
      "Refunds, warranty disputes and large quotes always wait for approval, whatever your settings say.",
  },
  {
    q: "Will customers know they're talking to AI?",
    a:
      "Yes. The widget says so, and every phone call opens by telling the caller they are speaking with an AI — " +
      "that line is editable but not removable. The version of this that annoys people is the one that stalls, " +
      "guesses, and traps them in a loop with no way out, so asking for a person always works: one message in " +
      "chat, one sentence on a call.",
  },
  {
    q: "What happens when it gets something wrong?",
    a:
      "Every reply shows which tools it used and which article it read, so you can see exactly how it got there. " +
      "Fix the underlying knowledge base article and the correction applies to the next message — no retraining, no " +
      "waiting. If a thread has gone sideways, take it over in one click and the assistant steps back.",
  },
  {
    q: "How long does setup actually take?",
    a:
      "Most businesses are live in under ten minutes: connect, paste your prices and policies, drop one script tag " +
      "on your site. Integrations, SMS and CRM sync can wait until you've seen it work.",
  },
  {
    q: "Do I need a website?",
    a:
      "No. Every workspace gets a hosted chat page you can put behind a QR code on an invoice, a link in your bio, " +
      "or a button in an email signature. The same assistant also answers forwarded email and SMS.",
  },
  {
    q: "Does this replace my receptionist?",
    a:
      "It replaces the queue they're drowning in, not them. The repetitive half — hours, pricing, booking, " +
      "rescheduling, chasing quotes — stops reaching a person at all. What's left is the work that needs judgement, " +
      "with the background already gathered.",
  },
  {
    q: "What happens to my data?",
    a:
      "It stays yours. Conversations, knowledge base and customer records export in full at any time, and deleting " +
      "your workspace deletes them. Calls are kept as written transcripts in the inbox; Lobby itself stores no " +
      "audio, though your telephony provider may if you enable recording there — which is your call to make, and " +
      "your consent obligations to meet.",
  },
  {
    q: "Can I turn it off?",
    a:
      "Any thread, any time — take it over in one click. Or set the whole assistant to draft-only, where it writes " +
      "every reply and sends nothing until you approve it. Plenty of businesses start there for a week and then " +
      "loosen it.",
  },
] as const;

export interface ComparisonRow {
  label: string;
  lobby: string;
  voiceAi: string;
  answering: string;
  chatbot: string;
  nothing: string;
}

/**
 * Competitor costs are typical published list prices for the category as of
 * 2026, not quotes — the point of the row is order of magnitude.
 */
export const COMPARISON: ComparisonRow[] = [
  {
    label: "Answers messages 24/7",
    lobby: "yes",
    voiceAi: "no",
    answering: "no",
    chatbot: "yes",
    nothing: "no",
  },
  {
    label: "Answers phone calls",
    lobby: "yes",
    voiceAi: "yes",
    answering: "yes",
    chatbot: "no",
    nothing: "sometimes",
  },
  {
    label: "Knows your prices and policies",
    lobby: "yes",
    voiceAi: "partly",
    answering: "from a script",
    chatbot: "rarely",
    nothing: "you do",
  },
  {
    label: "Books into your real calendar",
    lobby: "yes",
    voiceAi: "sometimes",
    answering: "sometimes",
    chatbot: "no",
    nothing: "you do",
  },
  {
    label: "Files and scores the lead",
    lobby: "yes",
    voiceAi: "no",
    answering: "no",
    chatbot: "no",
    nothing: "if you remember",
  },
  {
    label: "Drafts the quote",
    lobby: "yes",
    voiceAi: "no",
    answering: "no",
    chatbot: "no",
    nothing: "you do",
  },
  {
    label: "Hands you a briefed handoff",
    lobby: "yes",
    voiceAi: "a transcript",
    answering: "a message slip",
    chatbot: "no",
    nothing: "a voicemail",
  },
  {
    label: "Refuses to guess",
    lobby: "yes",
    voiceAi: "varies",
    answering: "yes",
    chatbot: "no",
    nothing: "—",
  },
  {
    label: "Time to go live",
    lobby: "minutes",
    voiceAi: "days",
    answering: "days to weeks",
    chatbot: "hours",
    nothing: "—",
  },
  {
    label: "Typical monthly cost",
    lobby: "$49–$149",
    voiceAi: "$60–$300",
    answering: "$300+",
    chatbot: "$0–$50",
    nothing: "the missed job",
  },
];

export const TRUST = [
  {
    title: "It can only say what you wrote",
    body:
      "Prices, policies and availability come from your knowledge base and calendar. There is no general-knowledge " +
      "mode where it improvises a discount.",
  },
  {
    title: "Money and risk stop at a person",
    body:
      "Refunds, warranty claims, discounts and quotes above your limit go to the approval queue with a draft " +
      "attached. Nothing is sent until someone says yes.",
  },
  {
    title: "Every action is on the record",
    body:
      "Each reply lists the tools it used and the article it read. You can reconstruct any decision without taking " +
      "anyone's word for it.",
  },
  {
    title: "Every caller is told it's AI",
    body:
      "The first thing anyone hears is that they have reached an assistant, not a person. You can word it your " +
      "way; you cannot switch it off. Asking for a human transfers the call.",
  },
  {
    title: "Your data leaves when you do",
    body:
      "Export conversations, contacts and knowledge in full at any time. Delete the workspace and it's gone — no " +
      "retention clause, no export fee.",
  },
  {
    title: "One click takes it back",
    body:
      "Any thread can be taken over mid-conversation, and the whole assistant can be set to draft-only while you " +
      "build trust in it.",
  },
] as const;
