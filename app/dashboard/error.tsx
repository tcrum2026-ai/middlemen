"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="card p-8 text-center">
      <h1 className="text-xl font-semibold">That screen failed to load.</h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-mist-400">
        Your data is fine — this is a rendering failure, not a lost record. Try again, and if it keeps happening the
        details are in the server log.
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-xs text-mist-400">reference: {error.digest}</p>
      ) : null}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button onClick={reset} className="btn btn-primary">
          Try again
        </button>
        <a href="/dashboard" className="btn btn-ghost">
          Back to overview
        </a>
      </div>
    </div>
  );
}
