import Link from "next/link";
import { ChatPanel } from "@/components/chat-panel";
import { Badge, Logo } from "@/components/ui";
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

const CAPABILITIES = [
  {
    icon: InboxIcon,
    title: "One inbox, every channel",
    body: "Web chat, email, SMS and WhatsApp land in a single thread per customer. Your assistant reads, replies and keeps context across all of them.",
  },
  {
    icon: CalendarIcon,
    title: "Booking and rescheduling",
    body: "Reads your real availability and working hours, offers windows, books, reschedules and cancels — then sends the confirmation.",
  },
  {
    icon: LeadIcon,
    title: "Lead capture and qualification",
    body: "Every inbound message becomes a scored lead with intent, contact details and estimated value, pushed into your pipeline.",
  },
  {
    icon: BookIcon,
    title: "Answers from your own knowledge",
    body: "Prices, policies, warranty terms, service areas. If it isn't in your knowledge base, the assistant says so instead of inventing it.",
  },
  {
    icon: SparkIcon,
    title: "Quotes and follow-ups",
    body: "Drafts priced quotes from your rate card, chases the ones that go quiet, and nudges customers who never replied.",
  },
  {
    icon: ShieldIcon,
    title: "Approvals before anything risky",
    body: "Refunds, warranty disputes, big-ticket quotes and low-confidence answers wait in a review queue instead of going out the door.",
  },
  {
    icon: PhoneIcon,
    title: "Callbacks, briefed",
    body: "The assistant never picks up a phone. It queues the call for a teammate with a written brief: who, what, what's promised, what's still open.",
  },
  {
    icon: ChartIcon,
    title: "Reporting that means something",
    body: "Deflection rate, hours saved, pipeline created, response time — per channel, per day, no spreadsheet work.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Connect your business",
    body: "Name, hours, services and website. Three fields and a minute — no implementation call, no sales demo, no credit card.",
  },
  {
    step: "02",
    title: "Teach it what you know",
    body: "Paste your prices, policies and FAQs, or let it pull them from your site. Edit any answer at any time and it takes effect on the next message.",
  },
  {
    step: "03",
    title: "Drop in one line of code",
    body: "Paste a single script tag on your site, or forward your support inbox and SMS number. Your assistant is live for customers immediately.",
  },
];

const INTEGRATIONS = [
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
];

const PLANS = [
  {
    name: "Solo",
    price: "$49",
    blurb: "One person who is tired of answering the same five questions.",
    features: ["1 assistant", "Web chat + email", "500 conversations/mo", "Booking & lead capture", "Callback queue"],
  },
  {
    name: "Team",
    price: "$149",
    blurb: "A front desk that keeps up with a busy crew.",
    features: [
      "Everything in Solo",
      "SMS + WhatsApp",
      "2,500 conversations/mo",
      "Quotes, approvals & CRM sync",
      "5 teammates on the call queue",
    ],
    featured: true,
  },
  {
    name: "Scale",
    price: "Talk to us",
    blurb: "Multiple locations, multiple brands, one set of rules.",
    features: [
      "Everything in Team",
      "Unlimited conversations",
      "Multi-location routing",
      "Custom tools & webhooks",
      "SSO and audit log",
    ],
  },
];

const FAQS = [
  {
    q: "Does the AI actually talk to customers on the phone?",
    a: "No, and that's deliberate. Voice is where AI is most likely to make a promise you can't keep and where customers are least forgiving. When a call is needed, the assistant queues it for a person with a written brief so the call takes two minutes instead of ten.",
  },
  {
    q: "What stops it from making things up?",
    a: "Answers come from your knowledge base, and availability comes from your calendar. When the assistant can't find something, it says so and offers a human follow-up. Refunds, warranty disputes and large quotes always wait for approval.",
  },
  {
    q: "How long does setup actually take?",
    a: "Most businesses are live in under ten minutes: connect, paste your prices and policies, drop one script tag on your site. Integrations can wait until later.",
  },
  {
    q: "Can I see everything it did?",
    a: "Every reply shows which tools it used — which article it read, which slot it booked, which lead it created. Nothing happens off the record.",
  },
  {
    q: "What happens after hours?",
    a: "The assistant keeps answering, booking into tomorrow's windows and triaging. Anything urgent lands at the top of the call queue for the moment you open.",
  },
];

export default async function LandingPage() {
  const business = await activeBusiness();
  const live = assistantConfigured();

  return (
    <div className="min-h-screen bg-ink-950">
      {/* nav */}
      <header className="sticky top-0 z-30 border-b border-ink-800/80 bg-ink-950/85 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-3.5">
          <Link href="/">
            <Logo />
          </Link>
          <div className="ml-4 hidden items-center gap-6 text-sm text-mist-400 md:flex">
            <a className="hover:text-mist-100" href="#capabilities">Capabilities</a>
            <a className="hover:text-mist-100" href="#calls">Calls</a>
            <a className="hover:text-mist-100" href="#how">How it works</a>
            <a className="hover:text-mist-100" href="#integrations">Integrations</a>
            <a className="hover:text-mist-100" href="#pricing">Pricing</a>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/dashboard" className="btn btn-ghost hidden sm:inline-flex">
              Dashboard
            </Link>
            <Link href="/connect" className="btn btn-primary">
              Connect your business
            </Link>
          </div>
        </nav>
      </header>

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
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-ink-800 pt-6">
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
            <div className="mb-3 flex items-center gap-2 text-xs text-mist-400">
              <ChatIcon width={14} height={14} />
              Live assistant — this is the real thing, wired to a demo business
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
          </div>
        </div>
      </section>

      {/* capabilities */}
      <section id="capabilities" className="border-t border-ink-800 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-jade-400">Capabilities</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything a good front desk does, minus the phone.
          </h2>
          <p className="mt-3 max-w-2xl text-mist-400">
            Not a chatbot bolted onto a help page. Your assistant has tools — your calendar, your price list, your
            CRM, your approval rules — and it uses them on every message.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CAPABILITIES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="card p-5 transition hover:border-ink-600">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-jade-500/10 text-jade-400">
                  <Icon />
                </span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mist-400">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* calls */}
      <section id="calls" className="border-t border-ink-800 bg-ink-900/40 py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-glow">The line we don&apos;t cross</p>
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
                assessment. Likely full replacement ($1,400–$2,600 installed) — <span className="text-mist-100">she has not been
                quoted a price yet</span>. Ask whether water is reaching finished flooring; if so, move her to today&apos;s
                emergency slot ($120 after-hours fee applies).
              </div>
              <div className="flex gap-2">
                <span className="btn btn-primary flex-1 justify-center">Take the call</span>
                <span className="btn btn-ghost">Reassign</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="border-t border-ink-800 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-jade-400">How it works</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Connected before your coffee&apos;s cold.</h2>

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
        </div>
      </section>

      {/* integrations */}
      <section id="integrations" className="border-t border-ink-800 bg-ink-900/40 py-20">
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
      <section id="pricing" className="border-t border-ink-800 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-jade-400">Pricing</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Cheaper than missing the call.</h2>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`card flex flex-col p-6 ${plan.featured ? "border-jade-500/40 bg-jade-500/[0.04]" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  {plan.featured ? <Badge tone="jade">Most popular</Badge> : null}
                </div>
                <p className="mt-3 text-3xl font-semibold">
                  {plan.price}
                  {plan.price.startsWith("$") ? <span className="text-base font-normal text-mist-400">/mo</span> : null}
                </p>
                <p className="mt-2 text-sm text-mist-400">{plan.blurb}</p>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2.5 text-sm text-mist-300">
                      <CheckIcon width={16} height={16} className="mt-0.5 shrink-0 text-jade-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/connect"
                  className={`btn mt-6 ${plan.featured ? "btn-primary" : "btn-ghost"} justify-center`}
                >
                  {plan.price.startsWith("$") ? "Start free" : "Contact sales"}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* faq */}
      <section className="border-t border-ink-800 bg-ink-900/40 py-20">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="text-3xl font-semibold tracking-tight">Questions worth asking</h2>
          <div className="mt-8 divide-y divide-ink-800">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {q}
                  <span className="text-mist-400 transition group-open:rotate-45">+</span>
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

      <footer className="border-t border-ink-800 py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 text-sm text-mist-400">
          <Logo className="text-mist-100" />
          <p>AI for the messages. People for the calls.</p>
        </div>
      </footer>
    </div>
  );
}
