import type { ReactNode } from "react";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { LEGAL, legalConfigured } from "@/lib/legal";

/**
 * Shared shell for the privacy policy and terms. Both are plain prose in a
 * narrow column — the one place on this site where readability beats design.
 */
export function LegalPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ink-950">
      <SiteNav />

      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-mist-300">{intro}</p>
        <p className="mt-3 text-sm text-mist-400">Last updated {LEGAL.lastUpdated}.</p>

        {legalConfigured() ? null : (
          <div className="mt-8 rounded-xl border border-amber-glow/30 bg-amber-glow/[0.06] p-5 text-sm leading-relaxed text-mist-300">
            <p className="font-semibold text-amber-glow">This page is not ready to publish.</p>
            <p className="mt-2">
              It is missing the operator&apos;s legal name, contact address or governing jurisdiction. Set{" "}
              <code className="font-mono text-xs text-mist-200">NEXT_PUBLIC_LEGAL_ENTITY</code>,{" "}
              <code className="font-mono text-xs text-mist-200">NEXT_PUBLIC_CONTACT_EMAIL</code> and{" "}
              <code className="font-mono text-xs text-mist-200">NEXT_PUBLIC_LEGAL_JURISDICTION</code>, then have a
              lawyer read both pages before real customers rely on them. The text below is a starting draft written
              from what the software actually does — it is not legal advice.
            </p>
          </div>
        )}

        <div className="mt-10 space-y-8">{children}</div>
      </main>

      <SiteFooter />
    </div>
  );
}

export function Clause({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold">{heading}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-mist-300">{children}</div>
    </section>
  );
}

export function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-jade-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
