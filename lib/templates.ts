import type { Autonomy } from "./types";

export interface TemplateArticle {
  title: string;
  body: string;
}

export interface AssistantTemplate {
  slug: string;
  name: string;
  /** Matches the industry option shown in onboarding. */
  industry: string;
  tagline: string;
  assistantName: string;
  tone: string;
  autonomy: Autonomy;
  greeting: string;
  services: string[];
  articles: TemplateArticle[];
  escalate: string[];
}

export const TEMPLATES: AssistantTemplate[] = [
  {
    slug: "home-services",
    name: "Home services",
    industry: "Home services (plumbing & HVAC)",
    tagline: "Plumbing, HVAC, electrical and roofing crews who are never near the phone.",
    assistantName: "Ava",
    tone: "friendly-professional",
    autonomy: "balanced",
    greeting: "Hi, thanks for reaching out. Tell me what's going on and I'll get you sorted.",
    services: ["Plumbing repair", "Drain cleaning", "Water heaters", "HVAC repair", "HVAC tune-up", "Emergency service"],
    articles: [
      {
        title: "Services and pricing",
        body:
          "We cover plumbing, heating, cooling and drain work for homes.\n\n" +
          "Diagnostic visit: $89, waived if you book the repair the same day.\n" +
          "Drain cleaning: from $149.\n" +
          "Water heater replacement: $1,400-$2,600 installed, depending on tank size.\n" +
          "Annual HVAC tune-up: $129, or free for members.\n\n" +
          "Anything beyond a standard job is quoted on site after a technician sees it. Never quote a final price " +
          "for work that hasn't been inspected.",
      },
      {
        title: "Service area and hours",
        body:
          "We serve homes within 35 miles of downtown. Office hours are Monday to Friday, 8am to 6pm.\n\n" +
          "Emergency service (burst pipes, no heat, sewage backup, gas smell) is available 24/7 with an " +
          "after-hours fee of $120. Saturday appointments are available by request.",
      },
      {
        title: "Booking and cancellation policy",
        body:
          "Appointments are two-hour arrival windows. Technicians text 30 minutes before arrival.\n\n" +
          "Reschedule or cancel free up to 4 hours before the window. Later changes carry a $45 fee.\n" +
          "We accept card and ACH, and offer financing on jobs over $800.",
      },
      {
        title: "Warranty and guarantees",
        body:
          "All labor is guaranteed for 12 months. Parts carry the manufacturer warranty, typically 5-10 years on " +
          "water heaters and furnaces.\n\n" +
          "If a repair fails inside the warranty window we return at no charge. Refunds over $500 and any warranty " +
          "dispute must be approved by the owner before anything is promised.",
      },
      {
        title: "Safety guidance to give immediately",
        body:
          "Active water leak: tell them to shut the supply valve and, if water is near outlets or a panel, the " +
          "breaker too.\nGas smell: tell them to leave the building and call the gas company from outside. Do not " +
          "schedule first — escalate immediately.\nNo heat below freezing: treat as urgent and queue a callback.",
      },
    ],
    escalate: [
      "Gas smells, electrical burning smells, flooding — escalate before scheduling",
      "Warranty disputes and refunds on completed work",
      "Any quote above your auto-send limit",
    ],
  },
  {
    slug: "dental",
    name: "Dental practice",
    industry: "Dental or medical practice",
    tagline: "Front desks that are chairside exactly when new patients call.",
    assistantName: "Nia",
    tone: "warm-casual",
    autonomy: "cautious",
    greeting: "Hi! I can help with appointments, pricing and insurance questions. What do you need?",
    services: ["New patient exams", "Cleanings", "Whitening", "Fillings", "Crowns", "Emergency visits"],
    articles: [
      {
        title: "New patient visit and pricing",
        body:
          "New patient visit: $149, including exam, X-rays and a standard cleaning.\n" +
          "Standard recall cleaning: $110.\nWhitening: $349 in-office, $199 take-home trays.\n\n" +
          "Costs for fillings, crowns and anything restorative depend on the exam — give the range only if it is " +
          "written here, otherwise say it's determined at the visit.",
      },
      {
        title: "Insurance and payment",
        body:
          "We are in-network with most major PPO plans. We verify coverage before every visit and tell patients " +
          "their estimated share in advance.\n\n" +
          "Never state what a specific plan will cover — say we verify it before the appointment. " +
          "We offer interest-free payment plans on treatment over $500.",
      },
      {
        title: "Hours and scheduling",
        body:
          "Monday to Thursday 8am-5pm, Friday 8am-1pm. Closed weekends.\n\n" +
          "Emergency slots are held daily at 8am and 1pm for patients in pain. " +
          "New patient visits take 60 minutes; cleanings take 45.",
      },
      {
        title: "Cancellation policy",
        body:
          "We ask for 24 hours' notice. Missed appointments and same-day cancellations carry a $50 fee, " +
          "waived once per patient.",
      },
      {
        title: "What never gets answered here",
        body:
          "Never give clinical advice, interpret symptoms, discuss medication, or tell a patient whether something " +
          "is an emergency. Take the details, say a clinician will respond, and escalate. " +
          "Patients in active pain get a same-day callback, not a booking link.",
      },
    ],
    escalate: [
      "Anything clinical: symptoms, medication, post-op questions",
      "Coverage disputes and billing corrections",
      "Patients in pain who want to speak to someone now",
    ],
  },
  {
    slug: "salon-spa",
    name: "Salon & spa",
    industry: "Salon, spa or wellness",
    tagline: "Chairs full, hands busy, DMs piling up.",
    assistantName: "Remi",
    tone: "warm-casual",
    autonomy: "balanced",
    greeting: "Hey! Want to book something or ask about pricing? I can help with both.",
    services: ["Cut and finish", "Balayage", "Colour", "Extensions", "Facials", "Massage"],
    articles: [
      {
        title: "Service menu and pricing",
        body:
          "Cut and finish: $65-$95 depending on stylist level.\n" +
          "Balayage: $180-$260, varies with length and lift required.\n" +
          "Full colour: $120-$180.\nExtensions: consultation required, from $450.\n" +
          "60-minute facial: $110. 60-minute massage: $95.\n\n" +
          "Always give the range, never a single number, and say the exact price is confirmed at the consult.",
      },
      {
        title: "Consultations",
        body:
          "Colour corrections, extensions and any major change require a free 10-minute consultation first. " +
          "We don't book those services without one — offer the consult instead.",
      },
      {
        title: "Deposits and cancellations",
        body:
          "Services over $150 take a $50 deposit to hold the slot. " +
          "48 hours' notice to reschedule or the deposit is kept. No-shows are charged 50% of the service.",
      },
      {
        title: "Hours and stylists",
        body:
          "Tuesday to Saturday, 9am to 7pm. Closed Sunday and Monday.\n\n" +
          "Senior stylists carry a $20 premium. If a client asks for a specific stylist, check that stylist's " +
          "availability rather than offering the first open slot.",
      },
    ],
    escalate: [
      "Corrective colour and anything that went wrong at a previous visit",
      "Refunds, comps and complaints",
      "Clients who want to talk through a big change before booking",
    ],
  },
  {
    slug: "legal",
    name: "Law firm",
    industry: "Law firm",
    tagline: "Intake that happens when the client is ready, not when you are.",
    assistantName: "Harper",
    tone: "formal",
    autonomy: "cautious",
    greeting:
      "Thanks for contacting us. I can take your details and get you in front of an attorney — I can't give legal " +
      "advice. What's the matter about?",
    services: ["Commercial litigation", "Contracts", "Employment", "Real estate", "Business formation"],
    articles: [
      {
        title: "Practice areas",
        body:
          "We handle commercial litigation, contract disputes, employment matters, commercial real estate and " +
          "business formation.\n\n" +
          "We do not handle criminal, family, immigration or personal injury matters — refer those out politely " +
          "rather than booking a consultation.",
      },
      {
        title: "Consultations and fees",
        body:
          "Initial consultation: $250 for 45 minutes, credited against the retainer if the client engages us.\n\n" +
          "Typical retainers start at $3,500. Hourly rates run $350-$550 depending on the attorney. " +
          "Never negotiate a fee or quote a total cost for a matter.",
      },
      {
        title: "Required disclaimer",
        body:
          "In any substantive exchange, state plainly: this is not legal advice, and no attorney-client " +
          "relationship exists until an engagement letter is signed.\n\n" +
          "Never assess the merits of a matter, never estimate outcomes, and never confirm a deadline — " +
          "take the date the client gives and flag it as time-sensitive.",
      },
      {
        title: "Intake checklist",
        body:
          "Collect: full name, best contact, matter type, opposing party (for conflicts), jurisdiction, " +
          "any deadline the client mentions, and a short description in their own words.\n\n" +
          "Matters with a deadline inside 30 days are urgent — queue a callback the same day.",
      },
    ],
    escalate: [
      "Anything with a filing deadline",
      "Every question about the merits of a matter",
      "Fee negotiation and engagement terms",
    ],
  },
  {
    slug: "real-estate",
    name: "Real estate",
    industry: "Real estate",
    tagline: "Listing enquiries answered in two minutes, not two hours.",
    assistantName: "Quinn",
    tone: "brisk-efficient",
    autonomy: "balanced",
    greeting: "Hi! Ask me anything about a listing — price, rooms, HOA, showing times.",
    services: ["Buyer representation", "Listing services", "Showings", "Market valuations"],
    articles: [
      {
        title: "How showings work",
        body:
          "Showings run 7 days a week, 9am to 7pm, in 30-minute slots. We need one hour's notice for occupied " +
          "properties and can do vacant ones same-day.\n\n" +
          "Always ask whether the buyer is working with a lender, and offer an introduction if not.",
      },
      {
        title: "Representation and fees",
        body:
          "Buyer representation costs the buyer nothing directly in most transactions — compensation is set out in " +
          "the agreement and varies by listing.\n\n" +
          "Listing commission is agreed per property. Never quote a commission rate or promise a sale price.",
      },
      {
        title: "Qualifying a buyer",
        body:
          "Capture: budget range, timeline, pre-approval status and lender, must-haves, and areas of interest.\n\n" +
          "A pre-approved buyer with a timeline under 90 days is a high-score lead. Flag it.",
      },
      {
        title: "What not to answer",
        body:
          "Never speculate on property condition, disclosures, permits, school quality or neighbourhood " +
          "demographics — fair-housing rules make that a hard line. Refer those questions to the agent.\n\n" +
          "Never discuss offers, counters or negotiating position.",
      },
    ],
    escalate: [
      "Offers, counters and anything about negotiating position",
      "Disclosure and property-condition questions",
      "Sellers deciding whether to list",
    ],
  },
  {
    slug: "auto-repair",
    name: "Auto repair",
    industry: "Auto repair",
    tagline: "Estimates and status checks that stop pulling techs out of the bay.",
    assistantName: "Sam",
    tone: "brisk-efficient",
    autonomy: "balanced",
    greeting: "Hi! Tell me what the car is doing and I'll give you a range and a drop-off time.",
    services: ["Diagnostics", "Brakes", "Suspension", "Engine repair", "Oil and fluids", "Tyres"],
    articles: [
      {
        title: "Common job pricing",
        body:
          "Diagnostic: $65, waived if you do the repair with us.\n" +
          "Front pads and rotors: $340-$520 on most vehicles.\n" +
          "Full synthetic oil change: $89.\nBrake fluid flush: $129.\nAlternator replacement: $450-$780.\n\n" +
          "Always give the range and say a technician confirms once the car is on the lift. " +
          "Never quote a final price for engine or transmission work sight unseen.",
      },
      {
        title: "Drop-off, hours and loaners",
        body:
          "Monday to Friday 7:30am to 6pm, Saturday 8am to 2pm.\n\n" +
          "Early drop-off with a key box is available from 6am. We have two loaner cars, first come first served, " +
          "and can shuttle within 10 miles.",
      },
      {
        title: "Warranty",
        body:
          "Parts and labor are covered for 24 months or 24,000 miles, whichever comes first. " +
          "Bring the invoice. Comebacks are diagnosed free of charge.",
      },
      {
        title: "Safety advice to give immediately",
        body:
          "Grinding brakes, a spongy pedal, steering pull, overheating, or a flashing check-engine light: " +
          "tell them not to keep driving it and get them in the same day if possible. Escalate if we're full.",
      },
    ],
    escalate: [
      "Comebacks and work that didn't hold",
      "Estimates that grew after the car was opened up",
      "Anything where the car may be unsafe to drive",
    ],
  },
];

export function getTemplate(slug: string): AssistantTemplate | undefined {
  return TEMPLATES.find((template) => template.slug === slug);
}

/** The pasteable form used by the onboarding knowledge step. */
export function templateToText(template: AssistantTemplate): string {
  return template.articles.map((article) => `${article.title}:\n${article.body}`).join("\n\n");
}
