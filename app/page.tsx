import Link from "next/link";
import { ChatPanel } from "@/components/chat-panel";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { RoiCalculator } from "@/components/marketing/roi-calculator";
import { Mechanism } from "@/components/marketing/mechanism";
import { Pricing } from "@/components/marketing/pricing";
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
import { CAPABILITIES, FAQS, STEPS } from "@/lib/marketing";

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
                AI handles the messages. People handle the calls.
              </Badge>
              <h1 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                Your front desk,
                <br />
                <span className="text-jade-400">handled.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-mist-300">
                Lobby answers every message, books the work and drafts the quote — using your prices and your
                policies. When something needs a voice, your team gets a briefed call instead of a voicemail.
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
                <span>Live assistant — wired to a demo business</span>
                {live ? null : (
                  <span className="rounded border border-ink-700 px-1.5 py-0.5">scripted mode · no API key set</span>
                )}
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
              Everything a good front desk does, minus the phone.
            </h2>
            <p className="mt-4 max-w-2xl text-mist-400">
              Your assistant has tools — your calendar, your price list, your approval rules — and it uses them on
              every message.
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

            <div className="mt-16 grid gap-6 border-t border-ink-800 pt-12 md:grid-cols-3">
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

        {/* the line we don't cross */}
        <section id="calls" className="border-t border-ink-800 bg-ink-900/40 py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Calls stay human. They just stop being a surprise.
              </h2>
              <p className="mt-4 text-mist-300">
                An AI voice that mishears an address or promises a refund costs more than it saves. So Lobby
                doesn&apos;t answer or place calls. It does the part people hate: gathering the facts first.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Every queued call arrives with a written brief and the decision it needs to reach.",
                  "Urgency is triaged — emergencies jump the queue, price questions never become a call at all.",
                  "Whatever the assistant already promised is in the brief, so nobody contradicts anyone.",
                  "After the call, log the outcome in one line and the thread stays in sync.",
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

            <div className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-ink-700 px-5 py-3">
                <span className="inline-flex items-center gap-2 text-sm font-semibold">
                  <PhoneIcon width={16} height={16} className="text-amber-glow" />
                  Call queue
                </span>
                <Badge tone="rose">urgent</Badge>
              </div>
              <div className="space-y-4 p-5 text-sm">
                <div>
                  <p className="font-semibold">Dana Whitfield · (555) 271-8890</p>
                  <p className="text-xs text-mist-400">Water heater leaking · queued 2 minutes ago</p>
                </div>
                <div className="rounded-lg border border-ink-700 bg-ink-950 p-4 leading-relaxed text-mist-300">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-mist-400">Brief</p>
                  Leak at the base of the tank, now spraying; cold supply is shut off. Booked tomorrow 12–2pm for
                  assessment. Likely full replacement ($1,400–$2,600 installed) —{" "}
                  <span className="text-mist-100">she has not been quoted a price yet</span>. Ask whether water is
                  reaching finished flooring; if so, move her to today&apos;s emergency slot ($120 after-hours fee
                  applies).
                </div>
                <div className="flex gap-2">
                  <span className="btn btn-primary flex-1 justify-center">Take the call</span>
                  <span className="btn btn-ghost">Reassign</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* pricing */}
        <section id="pricing" className="border-t border-ink-800 py-24">
          <div className="mx-auto max-w-6xl px-5">
            <div className="text-center">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Cheaper than missing the job.</h2>
              <p className="mx-auto mt-4 max-w-xl text-mist-400">
                Every plan answers on every channel. You are paying for volume, not for features held back.
              </p>
            </div>
            <div className="mt-12">
              <Pricing />
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
