import Link from "next/link";
import { ChatPanel } from "@/components/chat-panel";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { RoiCalculator } from "@/components/marketing/roi-calculator";
import { Mechanism } from "@/components/marketing/mechanism";
import { Pricing } from "@/components/marketing/pricing";
import { Screenshot } from "@/components/marketing/screenshot";
import { Badge } from "@/components/ui";
import {
  ArrowIcon,
  BookIcon,
  CalendarIcon,
  ChartIcon,
  ChatIcon,
  CheckIcon,
  InboxIcon,
  LeadIcon,
  PhoneIcon,
  ShieldIcon,
  SparkIcon,
} from "@/components/icons";
import { activeBusiness } from "@/lib/session";
import { assistantConfigured } from "@/lib/assistant";
import { CAPABILITIES, FAQS, STEPS, TRUST } from "@/lib/marketing";
import { LEGAL } from "@/lib/legal";

const ICONS = {
  inbox: InboxIcon,
  calendar: CalendarIcon,
  lead: LeadIcon,
  book: BookIcon,
  spark: SparkIcon,
  shield: ShieldIcon,
  phone: PhoneIcon,
  chart: ChartIcon,
} as const;

export default async function LandingPage() {
  const business = await activeBusiness();
  const live = assistantConfigured();

  return (
    <div className="min-h-screen bg-ink-950">
      <a href="#content" className="skip-link">
        Skip to content
      </a>
      <SiteNav />

      <main id="content">
        {/* hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[60rem] -translate-x-1/2 rounded-full bg-jade-500/10 blur-3xl"
          />
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
            <div className="rise">
              <Badge tone="jade">
                <span className="h-1.5 w-1.5 rounded-full bg-jade-500" />
                It answers the chat, the email, the texts — and the phone.
              </Badge>
              <h1 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                Nobody waits
                <br />
                in the <span className="text-jade-400">lobby.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-mist-300">
                Lobby answers every message and every call, books the work and drafts the quote — using your
                prices and your policies. It says it is an AI, and it puts people through the moment they ask.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/signup" className="btn btn-primary px-5 py-3">
                  Connect your business
                  <ArrowIcon width={16} height={16} />
                </Link>
                <Link href="/dashboard" className="btn btn-ghost px-5 py-3">
                  Explore the demo
                </Link>
              </div>
              <p className="mt-4 text-sm text-mist-400">
                14 days free · no card · live in under ten minutes.
              </p>
            </div>

            <div className="rise">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-mist-400">
                <ChatIcon width={14} height={14} />
                {/* Never claim "live" while the fallback is answering — but a
                    visitor judging the product does not need our env var
                    names, and scripted replies read worse than real ones, so
                    saying which they are seeing is in our favour either way. */}
                <span>
                  {live
                    ? "Live assistant — wired to a demo business"
                    : "Demo assistant — scripted replies, not the real model"}
                </span>
              </div>
              <ChatPanel
                widgetKey={business.widget_key}
                greeting={business.greeting}
                assistantName={business.assistant_name}
                businessName={business.name}
                suggestions={[
                  "How much is a water heater replacement?",
                  "Can someone come out tomorrow?",
                  "I need to speak to a person",
                ]}
              />
              <p className="mt-3 text-xs text-mist-400">
                Ask it something. It only knows what this demo business wrote down — try to catch it inventing a
                price.
              </p>
            </div>
          </div>
        </section>

        {/* how it works */}
        <section id="how" className="border-t border-ink-800 py-24">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              One message at 9:47pm, start to finish.
            </h2>
            <p className="mt-4 max-w-2xl text-mist-400">
              Not a black box. Every step below is a tool call you can see in your own dashboard, against your own
              records.
            </p>
            <div className="mt-12">
              <Mechanism />
            </div>
          </div>
        </section>

        {/* what it handles */}
        <section id="capabilities" className="border-t border-ink-800 py-24">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Everything a good front desk does, including the phone.
            </h2>
            <p className="mt-4 max-w-2xl text-mist-400">
              Your assistant has tools — your calendar, your price list, your approval rules — and it uses them on
              every message and every call. A caller gets the same booked slot a web visitor does.
            </p>

            <div className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
              {CAPABILITIES.map((capability) => {
                const Icon = ICONS[capability.icon];
                return (
                  <div key={capability.title}>
                    <Icon className="text-jade-400" />
                    <h3 className="mt-3 font-semibold">{capability.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-mist-400">{capability.body}</p>
                  </div>
                );
              })}
            </div>

            {/* Side by side, 01/02/03 reads as a sequence on its own. Stacked
                on a phone it is three unlabelled paragraphs after a rule, so
                the signpost has to be written down. */}
            <div className="mt-16 border-t border-ink-800 pt-12">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-mist-400">
                Live in three steps
              </h3>
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {STEPS.map(({ step, title, body }) => (
                <div key={step}>
                  <span className="font-mono text-sm text-jade-400">{step}</span>
                  <h3 className="mt-2 font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-mist-400">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* proof, not a redrawn mockup */}
        <section id="proof" className="border-t border-ink-800 py-24">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              This is the actual product.
            </h2>
            <p className="mt-4 max-w-2xl text-mist-400">
              Not renders, not a Figma file dressed up as a screenshot. These are three screens from the same demo
              workspace you can sign into above, captured from the running app.
            </p>

            <div className="mt-12 grid gap-8 lg:grid-cols-3">
              <div>
                <Screenshot
                  src="/marketing/shots/approvals.png"
                  alt="The real Lobby approvals queue, with a refund request waiting on a person"
                  title="Approvals"
                />
                <p className="mt-3 text-sm text-mist-400">
                  A $320 refund request, held for a person — with a draft reply already written, editable before it
                  sends.
                </p>
              </div>
              <div>
                <Screenshot
                  src="/marketing/shots/gaps.png"
                  alt="The real Lobby knowledge gaps screen, listing questions the assistant had no answer for"
                  title="Knowledge gaps"
                />
                <p className="mt-3 text-sm text-mist-400">
                  Every question it couldn&apos;t answer, waiting for one sentence back — write it once and the gap
                  closes for every customer who asks next.
                </p>
              </div>
              <div>
                <Screenshot
                  src="/marketing/shots/analytics.png"
                  alt="The real Lobby analytics page, showing 80% of interactions handled by AI and $3,493 in pipeline created"
                  title="Analytics"
                />
                <p className="mt-3 text-sm text-mist-400">
                  Fourteen days for one demo business: 80% of interactions handled without a person, 12 hours back,
                  three appointments booked.
                </p>
              </div>
            </div>

            <div className="mt-12 text-center">
              <Link href="/tour" className="btn btn-ghost px-5 py-3">
                See every screen
                <ArrowIcon width={16} height={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* the line we don't cross */}
        <section id="calls" className="border-t border-ink-800 bg-ink-900/40 py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                It picks up. It also knows when to stop talking.
              </h2>
              <p className="mt-4 text-mist-300">
                An AI voice that mishears an address or promises a refund costs more than it saves. So the call is
                built around the same limits as the chat: it answers from what you wrote down, and it hands over
                rather than improvising.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Every call opens by telling the caller they have reached an AI. Editable wording, not optional.",
                  "Asking for a person transfers the call — mid-sentence, with a brief, not a promise to ring back.",
                  "Refunds, disputes and anything over your approval limit go to a human instead of being decided.",
                  "The whole call lands in your inbox as a transcript, with every tool it used listed beside it.",
                ].map((line) => (
                  <li key={line} className="flex gap-3 text-sm text-mist-300">
                    <CheckIcon width={18} height={18} className="mt-0.5 shrink-0 text-jade-400" />
                    {line}
                  </li>
                ))}
              </ul>
              <Link href="/security" className="mt-7 inline-flex items-center gap-1.5 text-sm text-jade-400 hover:underline">
                The rest of the guardrails
                <ArrowIcon width={14} height={14} />
              </Link>
            </div>

            <div>
              <Screenshot
                src="/marketing/shots/calls.png"
                alt="The real Lobby call queue, showing a briefed handoff for a caller who asked for a person"
                title="Call queue"
                aspect="4 / 3"
              />
              <p className="mt-3 text-xs text-mist-400">
                A real screenshot of the demo workspace — this is the actual call queue, not a mockup.
              </p>
            </div>
          </div>
        </section>

        {/* pricing */}
        <section id="pricing" className="border-t border-ink-800 py-24">
          <div className="mx-auto max-w-6xl px-5">
            <div className="text-center">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Cheaper than missing the job.</h2>
              <p className="mx-auto mt-4 max-w-xl text-mist-400">
                Written channels on every plan. Answering the phone costs real money per minute, so it starts at Pro
                and is metered honestly rather than hidden in the base price.
              </p>
            </div>
            <div className="mt-12">
              <Pricing contactEmail={LEGAL.contactEmail} />
            </div>

            <div id="math" className="mt-20 border-t border-ink-800 pt-12">
              <h3 className="max-w-2xl text-2xl font-semibold tracking-tight">
                What are the unanswered ones worth?
              </h3>
              <p className="mt-3 max-w-2xl text-mist-400">
                We&apos;re not going to quote you an industry statistic. Put your own numbers in.
              </p>
              <div className="mt-8">
                <RoiCalculator />
              </div>
            </div>
          </div>
        </section>

        {/* under the hood */}
        <section id="security" className="border-t border-ink-800 bg-ink-900/40 py-24">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              What actually stops it from embarrassing you.
            </h2>
            <p className="mt-4 max-w-2xl text-mist-400">
              Not a compliance badge. The specific mechanisms, and the ones we&apos;d want to know about before
              trusting a vendor with our own front desk.
            </p>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {TRUST.slice(0, 6).map((item) => (
                <div key={item.title}>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-mist-400">{item.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-12 text-center">
              <Link href="/security" className="btn btn-ghost px-5 py-3">
                Every guardrail, in detail
                <ArrowIcon width={16} height={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* faq */}
        <section id="faq" className="border-t border-ink-800 py-24">
          <div className="mx-auto max-w-3xl px-5">
            <h2 className="text-3xl font-semibold tracking-tight">Questions worth asking</h2>
            <div className="mt-8 divide-y divide-ink-800">
              {FAQS.map(({ q, a }) => (
                <details key={q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                    {q}
                    <span className="shrink-0 text-mist-400 transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-mist-400">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* cta */}
        <section className="border-t border-ink-800 py-24">
          <div className="mx-auto max-w-2xl px-5 text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Stop losing work to a missed message.
            </h2>
            <p className="mx-auto mt-4 text-mist-400">
              Connect your business, paste your prices, and watch the first conversation land already answered.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/signup" className="btn btn-primary px-5 py-3">
                Connect your business
                <ArrowIcon width={16} height={16} />
              </Link>
              <Link href="/dashboard" className="btn btn-ghost px-5 py-3">
                Explore the demo
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
