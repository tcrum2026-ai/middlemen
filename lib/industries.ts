export interface Industry {
  slug: string;
  name: string;
  /** Short label used in nav and footer lists. */
  headline: string;
  subhead: string;
  pains: { title: string; body: string }[];
  sample: {
    channel: string;
    time: string;
    customer: string;
    assistant: string;
    actions: string[];
  };
  knowledge: string[];
  toHuman: string[];
  metaDescription: string;
}

export const INDUSTRIES: Industry[] = [
  {
    slug: "home-services",
    name: "Home services",
    headline: "Your phone rings while you're under a sink.",
    subhead:
      "Plumbing, HVAC, electrical, roofing. The enquiries arrive while both hands are busy and the customer who " +
      "doesn't get an answer calls the next name on the list.",
    pains: [
      {
        title: "The 9pm emergency",
        body:
          "Half your best jobs arrive after hours. An answer at 9pm with a real arrival window tomorrow is worth more " +
          "than a callback at 8am, because by 8am they've called someone else.",
      },
      {
        title: "“How much for a…”",
        body:
          "The same five pricing questions, all day, every day. Your assistant quotes from your rate card — the real " +
          "one — and books the diagnostic instead of playing phone tag.",
      },
      {
        title: "Arrival windows and reschedules",
        body:
          "Moving a two-hour window shouldn't cost anyone a phone call. It reads your calendar, offers what's actually " +
          "open, and applies your cancellation policy without being talked out of it.",
      },
    ],
    sample: {
      channel: "Web chat",
      time: "9:47pm",
      customer: "Water heater is leaking from the bottom. Do I need a new one? How fast can someone come out?",
      assistant:
        "Sorry you're dealing with that. A leak from the bottom of the tank usually means the tank itself has failed, " +
        "so replacement is likely — a tech confirms on site. Diagnostic is $89 and we waive it if you book the repair " +
        "same day. I have tomorrow 8–10am or 12–2pm. Shut the cold water supply valve on top of the heater in the " +
        "meantime. Which window works?",
      actions: [
        "Checked knowledge base — Services and pricing · Booking policy",
        "Checked calendar — 2 windows open tomorrow",
        "Booked appointment — Tomorrow 12:00–2:00pm",
        "Captured lead — 92 · $2,100 estimated",
      ],
    },
    knowledge: [
      "Diagnostic and trip-charge pricing, and when it's waived",
      "Service area radius and after-hours fees",
      "Arrival windows, reschedule notice and late-change fees",
      "Labor guarantee and manufacturer warranty terms",
    ],
    toHuman: [
      "Active leaks, no heat in winter, gas smell, anything with a safety edge",
      "Warranty disputes and refunds on completed work",
      "Quotes above your auto-send limit",
    ],
    metaDescription:
      "An AI assistant for plumbers, HVAC and electrical contractors: answers after-hours enquiries, quotes from your " +
      "rate card and books real arrival windows. Emergencies go to a briefed human callback.",
  },
  {
    slug: "dental",
    name: "Dental & medical",
    headline: "The front desk can't answer while they're with a patient.",
    subhead:
      "New-patient enquiries, insurance questions and reschedules pile up in exactly the hours your team is chairside.",
    pains: [
      {
        title: "New patients shop around",
        body:
          "A prospective patient asking about a cleaning price will ask three practices. The one that answers first, " +
          "with a real opening, usually wins the chart.",
      },
      {
        title: "Reschedules eat the day",
        body:
          "Cancellations and moves are most of the inbound volume and none of the value. Your assistant handles them " +
          "against your real book and your notice policy.",
      },
      {
        title: "Questions that must not be guessed at",
        body:
          "Insurance coverage, clinical advice, medication questions. The assistant answers what you've written down " +
          "and routes the rest to a person — it does not improvise about anyone's health.",
      },
    ],
    sample: {
      channel: "SMS",
      time: "7:12am",
      customer: "Do you take Delta Dental and how much is a cleaning for a new patient?",
      assistant:
        "We do take Delta Dental. A new-patient visit is $149 and covers the exam, X-rays and cleaning — your plan may " +
        "cover part or all of that, which we verify before your visit. I have Thursday 8:30am or Friday 2pm open. " +
        "Would either work?",
      actions: [
        "Checked knowledge base — Insurance accepted · New patient pricing",
        "Checked calendar — 2 openings this week",
        "Captured lead — new patient enquiry",
      ],
    },
    knowledge: [
      "Plans accepted and what you verify before a visit",
      "New-patient visit contents and price",
      "Cancellation and no-show policy",
      "Which questions must always go to a clinician",
    ],
    toHuman: [
      "Anything clinical — symptoms, medication, post-op questions",
      "Coverage disputes and billing corrections",
      "Patients in pain who want to speak to someone now",
    ],
    metaDescription:
      "An AI assistant for dental and medical practices: answers new-patient enquiries, handles reschedules against " +
      "your real book, and routes anything clinical to a person.",
  },
  {
    slug: "salon-spa",
    name: "Salon & spa",
    headline: "Nobody is picking up the phone mid-colour.",
    subhead:
      "Bookings, price questions and last-minute changes arrive constantly — and every one of them interrupts someone " +
      "with their hands full.",
    pains: [
      {
        title: "DMs are the new phone",
        body:
          "Half your bookings start as a message. If it sits unread for six hours, the client has booked somewhere " +
          "with an open slot.",
      },
      {
        title: "Service menus are complicated",
        body:
          "Length, thickness, add-ons, stylist level. Your assistant quotes the right range and flags when it genuinely " +
          "needs a consult rather than guessing a number.",
      },
      {
        title: "Late cancels cost real money",
        body:
          "Your notice window and deposit policy get applied consistently, at 11pm, without anyone having an awkward " +
          "conversation about it.",
      },
    ],
    sample: {
      channel: "Instagram DM",
      time: "10:31pm",
      customer: "how much for balayage and could I get in this weekend?",
      assistant:
        "Balayage runs $180–$260 with us depending on length and how much lift you're after — we confirm the exact " +
        "price at the consult, which is free and takes ten minutes. Saturday 1pm is open with Nadia, or Sunday 10am. " +
        "Want me to hold one?",
      actions: [
        "Checked knowledge base — Service menu · Consult policy",
        "Checked calendar — 2 openings this weekend",
        "Captured lead — 74 · $220 estimated",
      ],
    },
    knowledge: [
      "Service menu with honest price ranges and what moves them",
      "Which services need a consult first",
      "Deposit, notice and late-cancel policy",
      "Stylist levels and who does what",
    ],
    toHuman: [
      "Corrective colour and anything that went wrong last time",
      "Refunds and comps",
      "Clients who want to talk it through before booking",
    ],
    metaDescription:
      "An AI assistant for salons and spas: answers DMs and texts instantly, quotes your service menu honestly, books " +
      "into your real calendar and applies your deposit policy.",
  },
  {
    slug: "legal",
    name: "Law firms",
    headline: "Intake happens when the client is ready, not when you are.",
    subhead:
      "Prospective clients call in a crisis. The firm that answers, takes the details, and books the consult is the " +
      "firm they retain.",
    pains: [
      {
        title: "Intake is time-critical",
        body:
          "Someone with a deadline calls four firms in an afternoon. An instant, competent response that captures the " +
          "facts and books a consult is most of the battle.",
      },
      {
        title: "Screening burns attorney hours",
        body:
          "Matter type, jurisdiction, conflicts, urgency — gathered before anyone bills a minute. Unqualified enquiries " +
          "get a straight answer instead of a callback.",
      },
      {
        title: "Nothing may resemble advice",
        body:
          "The assistant is configured to gather and schedule, never to opine. It states plainly that it can't give " +
          "legal advice and routes the substance to you.",
      },
    ],
    sample: {
      channel: "Website form",
      time: "11:58pm",
      customer:
        "I was served papers today about a commercial lease dispute and I think I have 20 days to respond. Do you " +
        "handle this?",
      assistant:
        "We do handle commercial lease disputes. I can't give legal advice or read your deadline for you, but I can " +
        "get you in front of an attorney quickly — given a possible 20-day clock, I've flagged this as time-sensitive. " +
        "Consultations are $250 for 45 minutes, credited against your retainer if you engage us. There's an opening " +
        "tomorrow at 2pm. Can you have the served documents with you?",
      actions: [
        "Checked knowledge base — Practice areas · Consultation fees",
        "Captured lead — 88 · time-sensitive matter",
        "Queued a human callback — deadline within 30 days",
      ],
    },
    knowledge: [
      "Practice areas you take and the ones you refer out",
      "Consultation fee, length and what it's credited against",
      "Jurisdictions you're admitted in",
      "The exact language for “this is not legal advice”",
    ],
    toHuman: [
      "Anything with a filing deadline",
      "Every question about the merits of a matter",
      "Fee negotiation and engagement terms",
    ],
    metaDescription:
      "An AI intake assistant for law firms: captures matter details, screens for practice area and jurisdiction, and " +
      "books consultations — without ever giving legal advice.",
  },
  {
    slug: "real-estate",
    name: "Real estate",
    headline: "Leads go cold in the time it takes to finish a showing.",
    subhead:
      "Listing enquiries arrive all day and decay fast. The agent who replies in two minutes gets the showing.",
    pains: [
      {
        title: "Speed is the whole game",
        body:
          "An enquiry answered instantly with the price, the square footage and two showing times beats one answered " +
          "in the evening, every time.",
      },
      {
        title: "You're showing, not typing",
        body:
          "The hours you're most productive are the hours you can't respond. Your assistant covers them with real " +
          "listing details, not a form autoresponder.",
      },
      {
        title: "Qualification before the drive",
        body:
          "Pre-approval status, timeline, budget and must-haves captured up front, so the showings on your calendar " +
          "are worth the gas.",
      },
    ],
    sample: {
      channel: "Web chat",
      time: "1:22pm",
      customer: "Is the place on Kestrel Lane still available? What are the HOA fees?",
      assistant:
        "It is — 412 Kestrel Lane, 3 bed / 2 bath, listed at $485,000. HOA is $210 a month and covers landscaping, " +
        "the pool and exterior maintenance. I have showings open tomorrow at 11am and 4:30pm. Are you working with a " +
        "lender yet, or would you like an introduction?",
      actions: [
        "Checked knowledge base — 412 Kestrel Ln listing sheet",
        "Checked calendar — 2 showing slots tomorrow",
        "Captured lead — 81 · buyer, pre-approval unknown",
      ],
    },
    knowledge: [
      "Active listing sheets with price, beds, baths and HOA",
      "Showing availability rules and lockbox logistics",
      "Your buyer and seller representation terms",
      "Lender and inspector referrals you're comfortable giving",
    ],
    toHuman: [
      "Offers, counters and anything about negotiating position",
      "Disclosure questions and condition of the property",
      "Sellers deciding whether to list",
    ],
    metaDescription:
      "An AI assistant for real estate agents: answers listing enquiries instantly with real details, qualifies buyers " +
      "and books showings while you're out of the office.",
  },
  {
    slug: "auto-repair",
    name: "Auto repair",
    headline: "The bay is loud and the phone never stops.",
    subhead:
      "Estimates, drop-off times, “is it ready yet” — all of it interrupts the work that actually pays.",
    pains: [
      {
        title: "Estimate questions all day",
        body:
          "Brakes, diagnostics, timing belts. Your assistant gives your real ranges, explains what needs the car in " +
          "front of a tech, and books the drop-off.",
      },
      {
        title: "Status checks",
        body:
          "“Is my car ready” is the single most common message you get and the least valuable one to answer by hand.",
      },
      {
        title: "Nobody in the office to answer",
        body:
          "At a small shop everyone is in a bay. Messages pile up until the end of the day, by which point the " +
          "customer has booked elsewhere.",
      },
    ],
    sample: {
      channel: "SMS",
      time: "6:40am",
      customer: "grinding noise when I brake, how much and can you take it today?",
      assistant:
        "Grinding usually means pads are down to metal, which can score the rotors — worth getting in quickly. Front " +
        "pads and rotors run $340–$520 on most vehicles; we confirm once a tech sees it. Diagnostic is $65, waived if " +
        "you do the repair with us. We can take a drop-off at 8am today. What's the year and model?",
      actions: [
        "Checked knowledge base — Brake pricing · Diagnostic policy",
        "Checked calendar — drop-off slot today",
        "Captured lead — 85 · $430 estimated",
      ],
    },
    knowledge: [
      "Common job price ranges and what shifts them",
      "Diagnostic fee and when it's waived",
      "Drop-off, loaner and shuttle policy",
      "Parts and labor warranty terms",
    ],
    toHuman: [
      "Comebacks and work that didn't hold",
      "Anything drivability- or safety-related",
      "Estimates that grew after the car was opened up",
    ],
    metaDescription:
      "An AI assistant for auto repair shops: answers estimate and status questions with your real pricing, books " +
      "drop-offs, and keeps the phone from pulling techs out of the bay.",
  },
];

export function getIndustry(slug: string): Industry | undefined {
  return INDUSTRIES.find((industry) => industry.slug === slug);
}
