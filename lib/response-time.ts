/**
 * How long a customer waited for an answer.
 *
 * Pure, so the arithmetic can be tested without a database. The reporting
 * capability promises "response time" alongside deflection and hours saved,
 * and it is the number closest to what this product is for: the gap between
 * a customer writing and somebody answering. Shown as a median rather than a
 * mean, because one thread left over a bank holiday weekend would otherwise
 * swamp a thousand six-second replies.
 */

export interface TimedMessage {
  /** "customer" | "assistant" | "agent" — anything else is ignored. */
  role: string;
  /** Epoch ms. */
  at: number;
}

export interface ResponseStats {
  /** Milliseconds, or null when nothing has been answered yet. */
  medianByAi: number | null;
  medianByHuman: number | null;
  answeredByAi: number;
  answeredByHuman: number;
  /** Customer messages still waiting for any reply. */
  unanswered: number;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

/**
 * Pairs each customer message with the first reply that followed it.
 *
 * Consecutive customer messages — someone typing three lines in a row —
 * count once, from the first of them, because that is when they started
 * waiting.
 */
export function responseStats(threads: TimedMessage[][]): ResponseStats {
  const byAi: number[] = [];
  const byHuman: number[] = [];
  let unanswered = 0;

  for (const thread of threads) {
    const ordered = [...thread].sort((a, b) => a.at - b.at);
    let waitingSince: number | null = null;

    for (const message of ordered) {
      if (message.role === "customer") {
        // Only the first of a run starts the clock.
        if (waitingSince === null) waitingSince = message.at;
        continue;
      }
      if (message.role !== "assistant" && message.role !== "agent") continue;
      if (waitingSince === null) continue;

      const waited = Math.max(0, message.at - waitingSince);
      if (message.role === "assistant") byAi.push(waited);
      else byHuman.push(waited);
      waitingSince = null;
    }

    if (waitingSince !== null) unanswered += 1;
  }

  return {
    medianByAi: median(byAi),
    medianByHuman: median(byHuman),
    answeredByAi: byAi.length,
    answeredByHuman: byHuman.length,
    unanswered,
  };
}

/** A duration a person can read at a glance. */
export function humanDuration(ms: number | null): string {
  if (ms === null) return "—";
  // "0s" reads like a missing value rather than a fast one.
  if (ms < 1000) return "under 1s";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = ms / 3_600_000;
  if (hours < 24) return `${hours < 10 ? hours.toFixed(1) : Math.round(hours)}h`;
  const days = ms / 86_400_000;
  return `${days < 10 ? days.toFixed(1) : Math.round(days)}d`;
}
