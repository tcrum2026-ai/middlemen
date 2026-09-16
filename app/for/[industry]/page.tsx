import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Pricing } from "@/components/marketing/pricing";
import { RoiCalculator } from "@/components/marketing/roi-calculator";
import { Badge, Card } from "@/components/ui";
import { ArrowIcon, CheckIcon, PhoneIcon } from "@/components/icons";
import { INDUSTRIES, getIndustry } from "@/lib/industries";

export function generateStaticParams() {
  return INDUSTRIES.map((industry) => ({ industry: industry.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ industry: string }>;
}): Promise<Metadata> {
  const { industry: slug } = await params;
  const industry = getIndustry(slug);
  if (!industry) return { title: "Not found — Middlemen" };

  const title = `Middlemen for ${industry.name.toLowerCase()} — AI that answers, people who call`;
  return {
    title,
    description: industry.metaDescription,
    alternates: { canonical: `/for/${industry.slug}` },
    openGraph: { title, description: industry.metaDescription, url: `/for/${industry.slug}` },
  };
}

export default async function IndustryPage({ params }: { params: Promise<{ industry: string }> }) {
  const { industry: slug } = await params;
  const industry = getIndustry(slug);
  if (!industry) notFound();

  const others = INDUSTRIES.filter((item) => item.slug !== industry.slug);

  return (
    <div className="min-h-screen bg-ink-950">
      <SiteNav />

      <section className="relative overflow-hidden border-b border-ink-800">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[60rem] -translate-x-1/2 rounded-full bg-jade-500/10 blur-3xl"
        />
        <div className="mx-auto max-w-4xl px-5 py-16 text-center lg:py-20">
          <Badge tone="jade">{industry.name}</Badge>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            {industry.headline}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-mist-300">{industry.subhead}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/connect" className="btn btn-primary px-5 py-3">
              Connect your business
              <ArrowIcon width={16} height={16} />
            </Link>
            <Link href="/dashboard" className="btn btn-ghost px-5 py-3">
              See a live workspace
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">What this actually costs you today</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {industry.pains.map((pain) => (
              <Card key={pain.title}>
                <h3 className="font-semibold">{pain.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mist-400">{pain.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-ink-800 bg-ink-900/40 py-16">
        <div className="mx-auto max-w-4xl px-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-jade-400">A real exchange</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            What your customer sees at {industry.sample.time}
          </h2>

          <Card className="mt-8 !p-0">
            <div className="flex items-center gap-3 border-b border-ink-700 px-5 py-3 text-xs text-mist-400">
              <span className="uppercase tracking-wide">{industry.sample.channel}</span>
              <span>·</span>
              <span>{industry.sample.time}</span>
            </div>
            <div className="space-y-4 p-5">
              <div className="flex justify-start">
                <p className="max-w-[85%] rounded-2xl border border-ink-700 bg-ink-850 px-4 py-3 text-sm leading-relaxed">
                  {industry.sample.customer}
                </p>
              </div>
              <div className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl bg-jade-500 px-4 py-3 text-sm leading-relaxed text-ink-950">
                  {industry.sample.assistant}
                </p>
              </div>
              <ul className="space-y-1.5 border-t border-ink-800 pt-4">
                {industry.sample.actions.map((action) => (
                  <li key={action} className="flex items-start gap-2 text-xs text-mist-400">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-iris" />
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto grid max-w-6xl gap-5 px-5 lg:grid-cols-2">
          <Card>
            <h2 className="text-lg font-semibold">What you teach it on day one</h2>
            <ul className="mt-4 space-y-3">
              {industry.knowledge.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm text-mist-300">
                  <CheckIcon width={16} height={16} className="mt-0.5 shrink-0 text-jade-400" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-mist-400">
              Paste it once during setup. Edit any answer later and it applies to the next message.
            </p>
          </Card>

          <Card className="border-amber-glow/25">
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
              <PhoneIcon width={18} height={18} className="text-amber-glow" />
              What always reaches a person
            </h2>
            <ul className="mt-4 space-y-3">
              {industry.toHuman.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm text-mist-300">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-glow" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-mist-400">
              Each one arrives as a briefed callback or an approval — never as a surprise the assistant already
              answered.
            </p>
          </Card>
        </div>
      </section>

      <section id="math" className="border-y border-ink-800 bg-ink-900/40 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Run your own numbers</h2>
          <p className="mt-3 max-w-2xl text-mist-400">
            Drag these to match your shop. The output is your arithmetic — we don&apos;t supply the inputs.
          </p>
          <div className="mt-8">
            <RoiCalculator />
          </div>
        </div>
      </section>

      <section id="pricing" className="py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            Pricing
          </h2>
          <Pricing />
        </div>
      </section>

      <section className="border-t border-ink-800 py-14">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-mist-400">Other trades</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {others.map((item) => (
              <Link
                key={item.slug}
                href={`/for/${item.slug}`}
                className="rounded-full border border-ink-700 px-4 py-2 text-sm text-mist-300 transition hover:border-jade-500/50 hover:text-mist-100"
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
