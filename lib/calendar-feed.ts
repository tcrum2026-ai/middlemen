import "server-only";
import { busyIntervals, type BusyInterval } from "./ical";
import { credentials } from "./integrations";

/**
 * Fetches the workspace's subscribed calendar and caches it briefly.
 *
 * Availability is computed on nearly every assistant turn, so hitting
 * Google on each one would add a network round trip to every reply and
 * would eventually get the feed throttled. Five minutes is short enough
 * that a just-added commitment blocks bookings almost immediately and long
 * enough that a busy hour is a handful of requests.
 *
 * Failure is deliberately quiet and non-fatal: if the feed is unreachable
 * the assistant falls back to what it knows, which is the behaviour that
 * existed before feeds did. The alternative — refusing to book at all
 * because someone's calendar host is down — is worse.
 */

const TTL_MS = 5 * 60_000;
const LOOKAHEAD_DAYS = 30;

interface Entry {
  fetchedAt: number;
  busy: BusyInterval[];
  error: string | null;
}

const cache: Map<string, Entry> =
  (globalThis as { __lobbyCal?: Map<string, Entry> }).__lobbyCal ??
  ((globalThis as { __lobbyCal?: Map<string, Entry> }).__lobbyCal = new Map());

/** The feed URL a workspace has pasted, if any. */
export function calendarFeedUrl(businessId: string): string | null {
  const url = credentials(businessId, "calendar-feed")?.ics_url?.trim();
  if (!url) return null;
  // webcal:// is what calendar apps hand out; it is http(s) underneath.
  const normalized = url.replace(/^webcal:\/\//i, "https://");
  return /^https?:\/\//i.test(normalized) ? normalized : null;
}

export async function busyFromFeed(businessId: string): Promise<BusyInterval[]> {
  const url = calendarFeedUrl(businessId);
  if (!url) return [];

  const cached = cache.get(businessId);
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) return cached.busy;

  const from = Date.now();
  const to = from + LOOKAHEAD_DAYS * 86_400_000;

  try {
    const response = await fetch(url, {
      headers: { Accept: "text/calendar, text/plain;q=0.9" },
      signal: AbortSignal.timeout(8_000),
      redirect: "follow",
    });
    if (!response.ok) throw new Error(`feed returned ${response.status}`);

    // A misconfigured URL can point at something enormous; a calendar is text.
    const text = (await response.text()).slice(0, 4_000_000);
    const busy = busyIntervals(text, from, to);
    cache.set(businessId, { fetchedAt: Date.now(), busy, error: null });
    return busy;
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 160) : "could not read the feed";
    console.error(`Calendar feed for ${businessId} failed: ${detail}`);
    // Keep serving the last good copy rather than suddenly freeing up a day.
    const entry: Entry = { fetchedAt: Date.now(), busy: cached?.busy ?? [], error: detail };
    cache.set(businessId, entry);
    return entry.busy;
  }
}

/** What the Integrations page shows about the feed's health. */
export async function feedStatus(businessId: string): Promise<{
  connected: boolean;
  events: number;
  error: string | null;
}> {
  if (!calendarFeedUrl(businessId)) return { connected: false, events: 0, error: null };
  const busy = await busyFromFeed(businessId);
  return { connected: true, events: busy.length, error: cache.get(businessId)?.error ?? null };
}

/** Test seam, and used when the URL changes so the old feed is not served. */
export function forgetFeed(businessId: string): void {
  cache.delete(businessId);
}
