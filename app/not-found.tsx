import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { INDUSTRIES } from "@/lib/industries";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-ink-950">
      <SiteNav />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-5 py-24 text-center">
        <p className="font-mono text-sm text-jade-400">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          That page isn&apos;t here.
        </h1>
        <p className="mt-3 text-mist-400">
          The assistant would tell you it doesn&apos;t know rather than make something up, so here we are.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn btn-primary px-5 py-3">
            Back to the front page
          </Link>
          <Link href="/dashboard" className="btn btn-ghost px-5 py-3">
            Open the dashboard
          </Link>
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {INDUSTRIES.map((industry) => (
            <Link
              key={industry.slug}
              href={`/for/${industry.slug}`}
              className="rounded-full border border-ink-700 px-3.5 py-1.5 text-xs text-mist-400 transition hover:border-jade-500/50 hover:text-mist-100"
            >
              {industry.name}
            </Link>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
