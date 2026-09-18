"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const CHANNELS = ["all", "web", "email", "sms", "whatsapp"] as const;
const STATES = [
  { value: "open", label: "Open" },
  { value: "waiting", label: "Waiting on us" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "Everything" },
] as const;

/** Filters live in the URL, so a filtered inbox is a shareable link. */
export function InboxFilters({ total, shown }: { total: number; shown: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");

  const channel = params.get("channel") ?? "all";
  const state = params.get("state") ?? "open";

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (!value || value === "all" || (key === "state" && value === "open")) next.delete(key);
    else next.set(key, value);
    router.replace(next.toString() ? `/dashboard/inbox?${next}` : "/dashboard/inbox", { scroll: false });
  }

  // Debounced so each keystroke isn't a navigation.
  useEffect(() => {
    const timer = setTimeout(() => {
      if ((params.get("q") ?? "") !== query) setParam("q", query);
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search name, subject or message…"
        aria-label="Search conversations"
        className="field max-w-xs"
      />

      <div className="flex flex-wrap gap-1.5">
        {STATES.map((item) => (
          <button
            key={item.value}
            onClick={() => setParam("state", item.value)}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${
              state === item.value
                ? "border-jade-500/50 bg-jade-500/10 text-jade-300"
                : "border-ink-700 text-mist-400 hover:text-mist-100"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <select
        value={channel}
        onChange={(event) => setParam("channel", event.target.value)}
        aria-label="Filter by channel"
        className="rounded-lg border border-ink-700 bg-ink-900 px-2.5 py-1.5 text-sm text-mist-100"
      >
        {CHANNELS.map((option) => (
          <option key={option} value={option}>
            {option === "all" ? "All channels" : option.toUpperCase()}
          </option>
        ))}
      </select>

      <span className="ml-auto text-xs text-mist-400">
        {shown === total ? `${total} conversations` : `${shown} of ${total}`}
      </span>
    </div>
  );
}
