"use client";

import { useEffect, useState } from "react";
import { LAUNCH_DATE, launchDateLabel } from "@/lib/launch";
import { SparkIcon } from "@/components/icons";

function remaining(now: number) {
  const ms = Math.max(0, LAUNCH_DATE.getTime() - now);
  const totalSeconds = Math.floor(ms / 1000);
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    reached: ms === 0,
  };
}

const UNITS = [
  { key: "days", label: "Days" },
  { key: "hours", label: "Hours" },
  { key: "minutes", label: "Min" },
  { key: "seconds", label: "Sec" },
] as const;

/**
 * A live countdown to LAUNCH_DATE.
 *
 * Ticks client-side only: the server render always shows 00:00:00:00 (there
 * is no "now" during a static/server render), and the first client render
 * corrects it a moment later. That mismatch is deliberately swallowed
 * rather than "fixed" by forcing the server to guess a visitor's clock.
 */
export function Countdown() {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Before mount there is no "now" to compute against — showing "reached"
  // (0 remaining) or a guessed duration would both be a real value that's
  // sometimes wrong for a moment. A dash placeholder is never wrong.
  if (now === null) {
    return (
      <div className="inline-flex flex-col items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-jade-500/30 bg-jade-500/10 px-4 py-1.5 text-sm font-medium text-jade-300">
          <SparkIcon width={15} height={15} />
          Launching {launchDateLabel()}
        </div>
        <div className="flex items-stretch gap-2">
          {UNITS.map((unit) => (
            <div
              key={unit.key}
              className="flex w-16 flex-col items-center rounded-xl border border-ink-700 bg-ink-900/60 py-2.5"
            >
              <span className="font-mono text-2xl font-semibold tabular-nums text-mist-600">--</span>
              <span className="mt-0.5 text-[11px] uppercase tracking-wider text-mist-400">{unit.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const time = remaining(now);

  if (time.reached) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-jade-500/30 bg-jade-500/10 px-4 py-2 text-sm font-medium text-jade-300">
        <SparkIcon width={16} height={16} />
        We&apos;re live.
      </div>
    );
  }

  return (
    <div className="inline-flex flex-col items-center gap-3">
      <div className="inline-flex items-center gap-2 rounded-full border border-jade-500/30 bg-jade-500/10 px-4 py-1.5 text-sm font-medium text-jade-300">
        <SparkIcon width={15} height={15} />
        Launching {launchDateLabel()}
      </div>
      <div className="flex items-stretch gap-2">
        {UNITS.map((unit) => (
          <div
            key={unit.key}
            className="flex w-16 flex-col items-center rounded-xl border border-ink-700 bg-ink-900/60 py-2.5"
          >
            <span className="font-mono text-2xl font-semibold tabular-nums text-mist-100">
              {String(time[unit.key]).padStart(2, "0")}
            </span>
            <span className="mt-0.5 text-[11px] uppercase tracking-wider text-mist-400">{unit.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
