import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Badge, Card } from "@/components/ui";
import { ArrowIcon } from "@/components/icons";
import { TEMPLATES } from "@/lib/templates";

export const metadata: Metadata = {
  title: "Starter packs — a working assistant on day one",
  description:
    "Ready-made knowledge packs for home services, dental, salon, legal, real estate and auto repair: pricing, " +
    "policies, escalation rules and a persona, editable before you go live.",
  alternates: { canonical: "/templates" },
};

export default function TemplatesPage() {
  return (
    <div className="min-h-screen bg-ink-950">
      <SiteNav />

      <section className="border-b border-ink-800 py-16">
        <div className="mx-auto max-w-4xl px-5 text-center">
          <Badge tone="jade">Starter packs</Badge>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            You shouldn&apos;t start from a blank box.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-mist-300">
            Each pack loads real articles — prices, hours, policies, warranty terms, and the lines the assistant must
            never cross — plus a persona tuned for the trade. Edit every word. Nothing here is locked.
          </p>
          <div className="mt-7">
            <Link href="/connect" className="btn btn-primary px-5 py-3">
              Start with a pack
              <ArrowIcon width={16} height={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-5xl space-y-6 px-5">
          {TEMPLATES.map((template) => (
            <Card key={template.slug} className="!p-0">
              <div className="flex flex-wrap items-center gap-3 border-b border-ink-700 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold">{template.name}</h2>
                  <p className="text-sm text-mist-400">{template.tagline}</p>
                </div>
                <Badge tone="slate">{template.articles.length} articles</Badge>
                <Badge tone="iris">{template.assistantName}</Badge>
              </div>

              <div className="grid gap-5 p-5 lg:grid-cols-[1.4fr_1fr]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-mist-400">What it loads</p>
                  <ul className="mt-3 space-y-3">
                    {template.articles.map((article) => (
                      <li key={article.title}>
                        <p className="text-sm font-medium">{article.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-mist-400">{article.body}</p>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-amber-glow/25 bg-amber-glow/[0.04] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-glow">
                    Always reaches a person
                  </p>
                  <ul className="mt-3 space-y-2">
                    {template.escalate.map((item) => (
                      <li key={item} className="flex gap-2 text-sm text-mist-300">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-glow" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-xs text-mist-400">
                    Tone: {template.tone.replace("-", " ")} · Autonomy: {template.autonomy}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
