"use client";

import { useEffect } from "react";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";

/**
 * Root error boundary for the public site.
 *
 * Only /dashboard had one of these before this — anywhere else, a thrown
 * error fell through to Next's own generic error screen, unbranded and with
 * none of the site's own tone. This is a client component because error
 * boundaries have to be.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Site error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col bg-ink-950">
      <SiteNav />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-5 py-24 text-center">
        <p className="font-mono text-sm text-jade-400">Error</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          That page failed to load.
        </h1>
        <p className="mt-3 text-mist-400">
          Nothing you did caused this, and nothing was lost — it&apos;s a rendering failure on this one screen. Try
          again, or head back to the front page.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-mist-500">reference: {error.digest}</p>
        ) : null}
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button onClick={reset} className="btn btn-primary px-5 py-3">
            Try again
          </button>
          <Link href="/" className="btn btn-ghost px-5 py-3">
            Back to the front page
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
