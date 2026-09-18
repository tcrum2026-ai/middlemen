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
      "Both answer the phone. The difference is what happens after hello — whether the thing on the line can " +
      "actually book the job, or only take a message about it.",
    theyWin: [
      "Voice is the whole product, so the call-handling edges — accents, noisy lines, hold, warm transfer trees — " +
      "tend to be more polished.",
      "Many offer outbound calling and campaigns. Lobby answers calls placed to you and will not dial out.",
      "If the phone is your only channel, you are not paying for chat, email and SMS you never use.",
    ],
    weWin: [
      "The voice shares one brain with the chat, the email and the texts: a caller and a web visitor book against " +
      "the same calendar, from the same price list, into the same inbox.",
      "It quotes only what you wrote down. Most voice bots are a script plus a scrape, so they improvise a price.",
      "A caller who phoned this morning and emails this afternoon is one thread, not two strangers.",
      "The whole call lands as a transcript with every tool call listed beside it, in the same place as everything else.",
    ],
    together:
      "Rarely worth it — they occupy the same slot. If you already have a voice product you are happy with, point " +
      "it at your number and leave Lobby on the written channels; the records still end up in one place.",
    verdict:
      "If the phone is your only channel and outbound matters, buy the voice product. If calls are one of several " +
      "ways people reach you and you want them all answered the same way, buy this one.",
    metaDescription:
      "An honest comparison of Lobby and AI voice receptionists: both answer the phone, but only one shares a " +
      "calendar, price list and inbox with your other channels.",
  },
  {
    slug: "answering-service",
    name: "Human answering services",
    title: "Lobby vs a human answering service",
    subhead:
      "A room of people reading your script versus an assistant that knows your price list and writes to your " +
      "calendar.",
    theyWin: [
      "A real person picks up, which some customers will always prefer and some situations always need.",
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
      "Keep the service for overflow and for the calls you want a person on, and let Lobby take the routine ones " +
      "— hours, pricing, booking, rescheduling. It transfers anything it should not decide, so the humans get the " +
      "calls worth their time.",
    verdict:
      "If your calls are mostly judgement calls, keep the humans. If most of them are the same six questions and " +
      "your service is taking messages you have to act on anyway, this closes the loop instead.",
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
