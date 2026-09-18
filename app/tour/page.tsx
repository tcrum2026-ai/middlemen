import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { WorkspaceShowcase } from "@/components/marketing/workspace-showcase";
import { Badge, Card } from "@/components/ui";
import { ArrowIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "The tour — every screen, in the order you'd use it",
  description:
    "A walk through Lobby: onboarding, the shared inbox, the human call queue, approvals, the playground, " +
    "knowledge gaps, follow-ups and reporting.",
  alternates: { canonical: "/tour" },
};

const STOPS = [
  {
    step: "01",
    title: "Connect",
    href: "/connect",
    linkLabel: "Open onboarding",
    body:
      "Four screens: your business, your hours and services, your assistant's persona and autonomy, and your " +
      "knowledge. Load a starter pack for your trade and edit from there.",
    detail: "No card. No implementation call. You leave with a workspace and one line of code.",
  },
  {
    step: "02",
    title: "Test before anyone sees it",
    href: "/dashboard/playground",
    linkLabel: "Open the playground",
    body:
      "Ask it the questions your customers actually ask. Tools run in dry-run — it will tell you it would book " +
      "Thursday at 2pm, without booking anything.",
    detail: "The readiness check runs the eight questions every business gets and scores what you have no answer for.",
  },
  {
    step: "03",
    title: "Go live with one script tag",
    href: "/dashboard/install",
    linkLabel: "See the snippet",
    body:
      "Paste one line on your site, share the hosted chat link, or point your inbox and SMS number at the same " +
      "endpoint. Preview it on a stand-in website first.",
    detail: "The widget is a few KB, renders in a shadow root, and inherits nothing from your page styles.",
  },
  {
    step: "04",
    title: "Watch the inbox fill in already answered",
    href: "/dashboard/inbox",
    linkLabel: "Open the inbox",
    body:
      "Web chat, email and SMS in one thread per customer. Each assistant reply shows the tools it used and the " +
      "article it read. Take any thread over in one click.",
    detail: "Threads waiting on a human are marked, so nothing sits unnoticed.",
  },
  {
    step: "05",
    title: "Pick up the calls that are worth making",
    href: "/dashboard/calls",
    linkLabel: "Open the call queue",
    body:
      "The assistant never dials. Anything that needs a voice arrives here with a written brief: who, what happened, " +
      "what was promised, and the decision the call has to reach.",
    detail: "Log the outcome in one line and the customer's thread stays in sync.",
  },
  {
    step: "06",
    title: "Approve anything that touches money",
    href: "/dashboard/approvals",
    linkLabel: "Open approvals",
    body:
      "Refunds, warranty disputes, quotes above your limit and low-confidence answers wait here with a draft " +
      "attached. Approve and it sends; reject and it never existed.",
    detail: "Nothing in this queue has been seen by a customer.",
  },
  {
    step: "07",
    title: "Close the gaps it found",
    href: "/dashboard/gaps",
    linkLabel: "Open knowledge gaps",
    body:
      "Every question it couldn't answer, ranked by how often it's asked. Write the article once and the gap closes " +
      "for every customer who asks next.",
    detail: "This is the loop that makes month two better than month one.",
  },
  {
    step: "08",
    title: "Stop forgetting the follow-up",
    href: "/dashboard/automations",
    linkLabel: "Open follow-ups",
    body:
      "Reminders before appointments, one polite chase on a quiet quote, a review request after the job. The " +
      "assistant writes them and queues them; you can edit or cancel any of them.",
    detail: "One nudge, then it stops. Nobody gets pestered.",
  },
  {
    step: "09",
    title: "See what it absorbed",
    href: "/dashboard/analytics",
    linkLabel: "Open analytics",
    body:
      "Share handled without a person, hours back, pipeline created, and where conversations come from — per day, " +
      "per channel.",
    detail: "The point isn't the chart. It's knowing whether to loosen the guardrails.",
  },
];

export default function TourPage() {
  return (
    <div className="min-h-screen bg-ink-950">
      <SiteNav />

      <section className="border-b border-ink-800 py-16">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <Badge tone="jade">The tour</Badge>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            Every screen, in the order you&apos;d actually use it.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-mist-300">
            Each stop links straight into the live demo workspace. It&apos;s seeded with a real-looking business, so
            you can click anything without breaking something of yours.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/dashboard" className="btn btn-primary px-5 py-3">
              Jump into the workspace
              <ArrowIcon width={16} height={16} />
            </Link>
            <Link href="/signup" className="btn btn-ghost px-5 py-3">
              Set up your own
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-4xl space-y-4 px-5">
          {STOPS.map((stop) => (
            <Card key={stop.step} className="!p-0">
              <div className="grid gap-4 p-6 sm:grid-cols-[4rem_1fr]">
                <span className="font-mono text-sm text-jade-400">{stop.step}</span>
                <div>
                  <h2 className="text-lg font-semibold">{stop.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-mist-300">{stop.body}</p>
                  <p className="mt-2 text-sm leading-relaxed text-mist-400">{stop.detail}</p>
                  <Link href={stop.href} className="btn btn-ghost mt-4 px-3 py-1.5 text-xs">
                    {stop.linkLabel}
                    <ArrowIcon width={14} height={14} />
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-ink-800 bg-ink-900/40 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-2xl font-semibold tracking-tight">This is what you open on Monday.</h2>
          <p className="mt-3 max-w-2xl text-mist-400">
            Five screens do the work. The rest of the product exists to keep these five honest.
          </p>
          <div className="mt-10">
            <WorkspaceShowcase />
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
