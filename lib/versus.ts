export interface Versus {
  slug: string;
  name: string;
  title: string;
  subhead: string;
  /** Stated plainly, because a comparison page that only flatters itself isn't useful. */
  theyWin: string[];
  weWin: string[];
  together: string;
  verdict: string;
  metaDescription: string;
}

export const VERSUS: Versus[] = [
  {
    slug: "ai-voice-receptionist",
    name: "AI voice receptionists",
    title: "Lobby vs an AI voice receptionist",
    subhead:
      "They answer the phone with a synthetic voice. We answer everything else and hand your team a briefed call. " +
      "These are different products for different bottlenecks.",
    theyWin: [
      "The phone actually gets answered at 2am, which we will never do.",
      "Callers who refuse to use anything but a phone still get a response.",
      "Simple call routing and voicemail replacement is solved on day one.",
    ],
    weWin: [
      "Messages — web chat, email, SMS, DMs — are handled properly rather than pushed to a call.",
      "Bookings go into your real calendar with your working hours and notice rules applied.",
      "Leads are scored and filed, quotes get drafted, follow-ups get scheduled.",
      "A mistake is a typo in a message you can correct, not a promise made aloud to a customer.",
      "No voice recordings exist, so there's nothing to store, transcribe or explain.",
    ],
    together:
      "Run both. Let the voice service catch the phone and let Lobby handle the written channels — and the " +
      "briefs we write make the calls your team does take considerably shorter.",
    verdict:
      "If your bottleneck is a ringing phone, buy the voice product. If it's a pile of unanswered messages and a " +
      "calendar nobody has time to update, buy this one.",
    metaDescription:
      "An honest comparison of Lobby and AI voice receptionists: what each one actually solves, where voice AI " +
      "wins, and why running both often makes sense.",
  },
  {
    slug: "answering-service",
    name: "Human answering services",
    title: "Lobby vs a human answering service",
    subhead:
      "A room of people reading your script versus an assistant that knows your price list and writes to your " +
      "calendar.",
    theyWin: [
      "A real person picks up the phone, which some customers will always prefer.",
      "Judgement on a strange call is better than any script or model.",
      "Legal and medical intake by a trained human carries less risk on the phone.",
    ],
    weWin: [
      "Costs a fraction of a per-minute or per-call retainer, with no minimum.",
      "Answers instantly at 2am without an overflow queue or hold music.",
      "Knows your actual prices instead of taking a message about them.",
      "Books, files and quotes rather than emailing you a message slip to action later.",
      "Live in minutes, not after an onboarding call and a script-writing exercise.",
    ],
    together:
      "Plenty of businesses keep an answering service for the phone line and put Lobby on every written " +
      "channel. The two don't overlap much.",
    verdict:
      "If most of your inbound is voice, keep the humans. If most of it now arrives as text and your answering " +
      "service is just taking messages you have to act on anyway, this replaces the whole loop.",
    metaDescription:
      "Lobby compared with a human answering service: cost, speed, what each one can actually complete, and when " +
      "keeping both is the right call.",
  },
  {
    slug: "website-chatbot",
    name: "Website chatbots",
    title: "Lobby vs a website chatbot",
    subhead:
      "Most chatbots answer from a help page and hand off. This one has tools and finishes the job.",
    theyWin: [
      "Free or nearly free on the entry tiers.",
      "Fine if all you need is deflecting FAQ traffic away from a support inbox.",
    ],
    weWin: [
      "Books real appointments against real availability instead of linking to a form.",
      "Quotes from your rate card, and holds anything above your limit for approval.",
      "Creates scored leads and follow-ups rather than a transcript nobody reads.",
      "Escalates to a briefed human callback instead of a dead end.",
      "Says “I don't know” instead of hallucinating, and records the gap so you can fix it.",
      "Works on email and SMS too — a chatbot only exists on your website.",
    ],
    together:
      "There isn't much point running both on the same site. If you already have a chatbot, the honest test is " +
      "whether it has ever booked anything.",
    verdict:
      "If your chatbot is an FAQ widget you installed and forgot, this replaces it outright. If you genuinely only " +
      "need FAQ deflection, the free tier of a chatbot is enough.",
    metaDescription:
      "Lobby compared with website chatbots: why a tool-using assistant that books, quotes and escalates is a " +
      "different category from an FAQ widget.",
  },
  {
    slug: "hiring-a-receptionist",
    name: "Hiring a receptionist",
    title: "Lobby vs hiring someone",
    subhead: "A person is better at almost everything. They also cost more than a person and don't work at 3am.",
    theyWin: [
      "Judgement, warmth and the ability to handle a genuinely unusual situation.",
      "They can do the physical and local work no software touches.",
      "Customers who want a relationship get one.",
    ],
    weWin: [
      "Covers nights, weekends and the hours nobody is at the desk.",
      "Never has a backlog: the hundredth message is answered as fast as the first.",
      "Costs less than a day of wages per month.",
      "Doesn't take holiday, quit, or need retraining when your prices change.",
    ],
    together:
      "The strongest setup is both: let the assistant absorb the repetitive half so the person you hire spends " +
      "their day on the work that actually needs a human.",
    verdict:
      "This is not a replacement for a good front-desk hire. It's a replacement for the queue that makes that hire " +
      "miserable.",
    metaDescription:
      "Lobby compared with hiring a receptionist: what software genuinely covers, what it can't, and why most " +
      "businesses end up wanting both.",
  },
];

export function getVersus(slug: string): Versus | undefined {
  return VERSUS.find((item) => item.slug === slug);
}
