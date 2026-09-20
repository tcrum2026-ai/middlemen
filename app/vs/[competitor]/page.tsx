import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Comparison } from "@/components/marketing/comparison";
import { Card } from "@/components/ui";
import { ArrowIcon, CheckIcon } from "@/components/icons";
import { VERSUS, getVersus } from "@/lib/versus";

export function generateStaticParams() {
  return VERSUS.map((item) => ({ competitor: item.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ competitor: string }>;
}): Promise<Metadata> {
  const { competitor } = await params;
  const versus = getVersus(competitor);
  if (!versus) return { title: "Not found" };
  return {
    title: versus.title,
    description: versus.metaDescription,
    alternates: { canonical: `/vs/${versus.slug}` },
    openGraph: { title: versus.title, description: versus.metaDescription, url: `/vs/${versus.slug}` },
  };
}

export default async function VersusPage({ params }: { params: Promise<{ competitor: string }> }) {
  const { competitor } = await params;
  const versus = getVersus(competitor);
  if (!versus) notFound();
  const others = VERSUS.filter((item) => item.slug !== versus.slug);

  return (
    <div className="min-h-screen bg-ink-950">
      <SiteNav />

      <section className="border-b border-ink-800 py-16">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{versus.title}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-mist-300">{versus.subhead}</p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto grid max-w-5xl gap-5 px-5 lg:grid-cols-2">
          <Card className="border-amber-glow/25">
            <h2 className="text-lg font-semibold">Where {versus.name.toLowerCase()} win</h2>
            <ul className="mt-4 space-y-3">
              {versus.theyWin.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed text-mist-300">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-glow" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="border-jade-500/30">
            <h2 className="text-lg font-semibold">Where we win</h2>
            <ul className="mt-4 space-y-3">
              {versus.weWin.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed text-mist-300">
                  <CheckIcon width={16} height={16} className="mt-0.5 shrink-0 text-jade-400" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      <section className="border-y border-ink-800 bg-ink-900/40 py-14">
        <div className="mx-auto max-w-3xl space-y-5 px-5">
          <Card>
            <h2 className="font-semibold">Running both</h2>
            <p className="mt-2 text-sm leading-relaxed text-mist-300">{versus.together}</p>
          </Card>
          <Card className="border-jade-500/30 bg-jade-500/[0.04]">
            <h2 className="font-semibold">The honest verdict</h2>
            <p className="mt-2 text-sm leading-relaxed text-mist-300">{versus.verdict}</p>
            <Link href="/signup" className="btn btn-primary mt-4">
              Try it free for 14 days
              <ArrowIcon width={16} height={16} />
            </Link>
          </Card>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-2xl font-semibold tracking-tight">Everything side by side</h2>
          <div className="mt-8">
            <Comparison />
          </div>
        </div>
      </section>

      <section className="border-t border-ink-800 py-12">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-mist-400">Other comparisons</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {others.map((item) => (
              <Link
                key={item.slug}
                href={`/vs/${item.slug}`}
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
