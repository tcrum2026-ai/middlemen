import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Card } from "@/components/ui";
import { CheckIcon } from "@/components/icons";
import { TRUST } from "@/lib/marketing";

export const metadata: Metadata = {
  title: "Security and guardrails",
  description:
    "How Lobby keeps an AI assistant from embarrassing your business: grounded answers, approval gates, a full " +
    "audit trail, no voice recordings, and data you can export or delete at any time.",
  alternates: { canonical: "/security" },
};

const CONTROLS = [
  {
    heading: "What the assistant is allowed to say",
    items: [
      "Prices, policies and terms come only from articles you wrote. There is no general-knowledge fallback.",
      "Availability comes from your calendar, so it cannot offer a slot you can't staff.",
      "When nothing matches, it says so and offers a human follow-up instead of improvising.",
      "Every question it couldn't answer is recorded as a gap for you to close.",
    ],
  },
  {
    heading: "What it is never allowed to do",
    items: [
      "Claim to be a human being. Every call opens by saying it is an AI, and asking for a person transfers it.",
      "Approve a refund, credit, warranty claim or discount you didn't write down.",
      "Send a quote above your limit without a teammate approving it.",
      "Offer a discount, price match or exception nobody wrote down as policy.",
    ],
  },
  {
    heading: "What you can see and undo",
    items: [
      "Every reply lists the tools it used and the article it read.",
      "Any thread can be taken over mid-conversation in one click.",
      "The whole assistant can be set to draft-only, where nothing sends without approval.",
      "Turning it off stops new replies immediately; the records stay yours.",
    ],
  },
  {
    heading: "Your data",
    items: [
      "Conversations, contacts, knowledge and call briefs export in full whenever you ask.",
      "Deleting a workspace deletes its records — there is no retention clause.",
      "Calls are stored as written transcripts. Lobby keeps no audio of its own; if you switch on recording at your telephony provider, that recording and the consent for it are yours to manage.",
      "Customer messages are used to answer that customer, not to train a shared model.",
    ],
  },
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-ink-950">
      <SiteNav />

      <section className="border-b border-ink-800 py-16">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            The fear isn&apos;t that it can&apos;t answer.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-mist-300">
            It&apos;s that it answers confidently, wrongly, in your name, to your customer — and you find out a week
            later. Here is every mechanism that exists to stop that.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-5xl space-y-6 px-5">
          {CONTROLS.map((group) => (
            <Card key={group.heading}>
              <h2 className="text-lg font-semibold">{group.heading}</h2>
              <ul className="mt-4 space-y-3">
                {group.items.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed text-mist-300">
                    <CheckIcon width={16} height={16} className="mt-0.5 shrink-0 text-jade-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-ink-800 bg-ink-900/40 py-16">
        <div className="mx-auto max-w-5xl px-5">
          <h2 className="text-2xl font-semibold tracking-tight">In short</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TRUST.map((item) => (
              <Card key={item.title} className="!p-5">
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mist-400">{item.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-ink-800 py-16">
        <div className="mx-auto max-w-3xl px-5">
          <Card className="border-amber-glow/25 bg-amber-glow/[0.04]">
            <h2 className="font-semibold">What we don&apos;t claim</h2>
            <p className="mt-2 text-sm leading-relaxed text-mist-300">
              No compliance certification is listed on this page because none has been audited. If your business
              needs SOC 2, HIPAA or a signed DPA before you can use a tool like this, ask us where we actually are
              rather than trusting a badge on a marketing page.
            </p>
            <Link href="/signup" className="btn btn-ghost mt-4">
              Try it on a workspace with no real data
            </Link>
          </Card>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
