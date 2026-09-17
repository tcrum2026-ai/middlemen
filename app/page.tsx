import Link from "next/link";
import { ChatPanel } from "@/components/chat-panel";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { RoiCalculator } from "@/components/marketing/roi-calculator";
import { Mechanism } from "@/components/marketing/mechanism";
import { Comparison } from "@/components/marketing/comparison";
import { Trust } from "@/components/marketing/trust";
import { Pricing } from "@/components/marketing/pricing";
import { WorkspaceShowcase } from "@/components/marketing/workspace-showcase";
import { Reveal } from "@/components/marketing/reveal";
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
  PlugIcon,
  ShieldIcon,
  SparkIcon,
} from "@/components/icons";
import { activeBusiness } from "@/lib/session";
import { assistantConfigured } from "@/lib/assistant";
import { CAPABILITIES, FAQS, INTEGRATIONS, STEPS } from "@/lib/marketing";
import { INDUSTRIES } from "@/lib/industries";

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
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="rise">
            <Badge tone="jade">
              <span className="h-1.5 w-1.5 rounded-full bg-jade-500" />
              AI handles the messages. People handle the calls.
            </Badge>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Your front desk,
              <br />
              <span className="text-jade-400">handled.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-mist-300">
              Middlemen answers every message, books the work, qualifies the lead and drafts the quote — grounded in
              your own prices and policies. When something needs a voice, it hands your team a briefed call instead
              of a voicemail.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/connect" className="btn btn-primary px-5 py-3">
                Connect your business
                <ArrowIcon width={16} height={16} />
              </Link>
              <Link href="/dashboard" className="btn btn-ghost px-5 py-3">
                See a live workspace
              </Link>
            </div>
            <p className="mt-4 text-sm text-mist-400">
              14 days free · no card · live in under ten minutes
            </p>
            <dl className="mt-9 grid max-w-lg grid-cols-3 gap-6 border-t border-ink-800 pt-6">
              {[
                ["Under 10 min", "to go live"],
                ["24/7", "first response"],
                ["0", "calls answered by AI"],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="text-2xl font-semibold text-mist-100">{value}</dt>
                  <dd className="text-xs uppercase tracking-wider text-mist-400">{label}</dd>
                </div>
              ))}
            </dl>
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
              Ask it something. It only knows what this demo business wrote down — try to catch it inventing a price.
            </p>
          </div>
        </div>
      </section>

      {/* mechanism */}
      <section id="how" className="border-t border-ink-800 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-jade-400">Watch it work</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            One message at 9:47pm, start to finish.
          </h2>
          <p className="mt-3 max-w-2xl text-mist-400">
            Not a black box. Every step below is a tool call you can see in your own dashboard, against your own
            records.
          </p>
          <div className="mt-10">
            <Mechanism />
          </div>
        </div>
      </section>

      {/* workspace */}
      <section id="workspace" className="border-t border-ink-800 bg-ink-900/40 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-jade-400">The workspace</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              This is what you open on Monday.
            </h2>
            <p className="mt-3 max-w-2xl text-mist-400">
              Five screens do the work. The rest of the product exists to keep these five honest.
            </p>
            <div className="mt-10">
              <WorkspaceShowcase />
            </div>
          </Reveal>
        </div>
      </section>

      {/* the math */}
      <section id="math" className="border-t border-ink-800 bg-ink-900/40 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-jade-400">The math</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            What are the unanswered ones worth?
          </h2>
          <p className="mt-3 max-w-2xl text-mist-400">
            We&apos;re not going to quote you an industry statistic about missed calls. Put your own numbers in and
            see whether this is worth a plan.
          </p>
          <div className="mt-10">
            <RoiCalculator />
          </div>
        </div>
      </section>

      {/* capabilities */}
      <section id="capabilities" className="border-t border-ink-800 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-jade-400">Capabilities</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything a good front desk does, minus the phone.
          </h2>
          <p className="mt-3 max-w-2xl text-mist-400">
            Not a chatbot bolted onto a help page. Your assistant has tools — your calendar, your price list, your
            CRM, your approval rules — and it uses them on every message.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CAPABILITIES.map((capability) => {
              const Icon = ICONS[capability.icon];
              return (
                <div key={capability.title} className="card p-5 transition hover:border-ink-600">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-jade-500/10 text-jade-400">
                    <Icon />
                  </span>
                  <h3 className="mt-4 font-semibold">{capability.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-mist-400">{capability.body}</p>
                </div>
              );
            })}
          </div>
          </Reveal>
        </div>
      </section>

      {/* calls */}
      <section id="calls" className="border-t border-ink-800 bg-ink-900/40 py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-glow">
              The line we don&apos;t cross
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Calls stay human. They just stop being a surprise.
            </h2>
            <p className="mt-4 text-mist-300">
              An AI voice that mishears an address or promises a refund costs more than it saves. So Middlemen
              doesn&apos;t answer or place calls. Instead it does the part people hate: gathering the facts first.
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

      {/* comparison */}
      <section id="compare" className="border-t border-ink-800 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-jade-400">Compare</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Against the things you&apos;re actually choosing between.
          </h2>
          <p className="mt-3 max-w-2xl text-mist-400">
            Including the cases where you should buy something else. We&apos;d rather you knew now than churned in
            month two.
          </p>
          <div className="mt-10">
            <Comparison />
          </div>
          </Reveal>
        </div>
      </section>

      {/* setup */}
      <section className="border-t border-ink-800 bg-ink-900/40 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-jade-400">Setup</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Connected before your coffee&apos;s cold.
          </h2>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map(({ step, title, body }) => (
              <div key={step} className="card p-6">
                <span className="font-mono text-sm text-jade-400">{step}</span>
                <h3 className="mt-3 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mist-400">{body}</p>
              </div>
            ))}
          </div>

          <div className="card mt-6 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-ink-700 px-5 py-3 text-sm text-mist-400">
              <PlugIcon width={16} height={16} />
              The whole installation
            </div>
            <pre className="overflow-x-auto px-5 py-4 font-mono text-sm text-mist-300">
              <code>{`<script src="https://middlemen.app/widget.js"
        data-key="${business.widget_key}" defer></script>`}</code>
            </pre>
          </div>
          <p className="mt-3 text-sm text-mist-400">
            No website? Every workspace gets a hosted chat page for a QR code or link in bio, and the same assistant
            answers forwarded email and SMS.
          </p>
        </div>
      </section>

      {/* trust */}
      <section id="trust" className="border-t border-ink-800 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-jade-400">Guardrails</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Six reasons this won&apos;t embarrass you.
          </h2>
          <p className="mt-3 max-w-2xl text-mist-400">
            The fear isn&apos;t that AI can&apos;t answer. It&apos;s that it answers confidently and wrongly, in your
            name, to your customer.
          </p>
          <div className="mt-10">
            <Trust />
          </div>
          </Reveal>
        </div>
      </section>

      {/* industries */}
      <section className="border-t border-ink-800 bg-ink-900/40 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-jade-400">Built for your trade</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            It already speaks your business.
          </h2>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {INDUSTRIES.map((industry) => (
              <Link
                key={industry.slug}
                href={`/for/${industry.slug}`}
                className="card group p-5 transition hover:border-ink-600"
              >
                <h3 className="flex items-center justify-between font-semibold">
                  {industry.name}
                  <ArrowIcon
                    width={16}
                    height={16}
                    className="text-mist-400 transition group-hover:translate-x-0.5 group-hover:text-jade-400"
                  />
                </h3>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-mist-400">{industry.headline}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* integrations */}
      <section id="integrations" className="border-t border-ink-800 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-jade-400">Integrations</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Plugs into what you already run.</h2>
          <p className="mt-3 max-w-2xl text-mist-400">
            Connect what you use, skip what you don&apos;t. Nothing here is required to go live — the assistant works
            on day one with just your knowledge base.
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {INTEGRATIONS.map(({ name, note }) => (
              <div key={name} className="card flex items-center gap-3 p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-ink-700 bg-ink-850 text-sm font-semibold text-mist-300">
                  {name.slice(0, 2)}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{name}</p>
                  <p className="truncate text-xs text-mist-400">{note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* pricing */}
      <section id="pricing" className="border-t border-ink-800 bg-ink-900/40 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-jade-400">Pricing</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Cheaper than missing the job.</h2>
          </div>
          <div className="mt-10">
            <Pricing />
          </div>
        </div>
      </section>

      {/* faq */}
      <section id="faq" className="border-t border-ink-800 py-20">
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
      <section className="border-t border-ink-800 py-20">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Stop losing work to a missed message.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-mist-400">
            Connect your business, paste your prices, and watch the first conversation land in your inbox already
            answered.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/connect" className="btn btn-primary px-5 py-3">
              Connect your business
              <ArrowIcon width={16} height={16} />
            </Link>
            <Link href="/dashboard" className="btn btn-ghost px-5 py-3">
              Explore the dashboard
            </Link>
          </div>
        </div>
      </section>

      </main>

      <SiteFooter />
    </div>
  );
}
