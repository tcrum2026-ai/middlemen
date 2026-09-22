import "server-only";
import { busyIntervals, type BusyInterval } from "./ical";
import { credentials, isConnected } from "./integrations";
import { googleBusy } from "./google-calendar";

/**
 * Fetches the workspace's calendars — a pasted iCal feed, a connected Google
 * account, or both — and caches each briefly.
 *
 * Availability is computed on nearly every assistant turn, so hitting a
 * provider on each one would add a network round trip to every reply and
 * would eventually get a feed throttled. Five minutes is short enough that a
 * just-added commitment blocks bookings almost immediately and long enough
 * that a busy hour is a handful of requests.
 *
 * Failure is deliberately quiet and non-fatal, per source: if one is
 * unreachable the other still counts, and if both are down the assistant
 * falls back to what it knows, which is the behaviour that existed before
 * either did. The alternative — refusing to book at all because someone's
 * calendar host is down — is worse.
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

const icsKey = (businessId: string) => `${businessId}:ics`;
const googleKey = (businessId: string) => `${businessId}:google`;

/** The feed URL a workspace has pasted, if any. */
export function calendarFeedUrl(businessId: string): string | null {
  const url = credentials(businessId, "calendar-feed")?.ics_url?.trim();
  if (!url) return null;
  // webcal:// is what calendar apps hand out; it is http(s) underneath.
  const normalized = url.replace(/^webcal:\/\//i, "https://");
  return /^https?:\/\//i.test(normalized) ? normalized : null;
}

async function busyFromIcsFeed(businessId: string): Promise<BusyInterval[]> {
  const url = calendarFeedUrl(businessId);
  if (!url) return [];

  const key = icsKey(businessId);
  const cached = cache.get(key);
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
    cache.set(key, { fetchedAt: Date.now(), busy, error: null });
    return busy;
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 160) : "could not read the feed";
    console.error(`Calendar feed for ${businessId} failed: ${detail}`);
    // Keep serving the last good copy rather than suddenly freeing up a day.
    const entry: Entry = { fetchedAt: Date.now(), busy: cached?.busy ?? [], error: detail };
    cache.set(key, entry);
    return entry.busy;
  }
}

async function busyFromGoogle(businessId: string): Promise<BusyInterval[]> {
  if (!isConnected(businessId, "google-calendar")) return [];

  const key = googleKey(businessId);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) return cached.busy;

  const from = Date.now();
  const to = from + LOOKAHEAD_DAYS * 86_400_000;
  const busy = await googleBusy(businessId, from, to);
  // googleBusy already logs and returns [] on any failure; there is no
  // separate error to keep here, so an empty result simply doesn't overwrite
  // whatever a previous successful fetch already cached for the rest of its TTL.
  if (busy.length > 0 || !cached) cache.set(key, { fetchedAt: Date.now(), busy, error: null });
  return cache.get(key)?.busy ?? busy;
}

/** Busy intervals from every calendar this workspace has connected, merged. */
export async function busyFromFeed(businessId: string): Promise<BusyInterval[]> {
  const [ics, google] = await Promise.all([busyFromIcsFeed(businessId), busyFromGoogle(businessId)]);
  return [...ics, ...google].sort((a, b) => a.start - b.start);
}

/** What the Integrations page shows about the pasted-URL feed's health. */
export async function feedStatus(businessId: string): Promise<{
  connected: boolean;
  events: number;
  error: string | null;
}> {
  if (!calendarFeedUrl(businessId)) return { connected: false, events: 0, error: null };
  const busy = await busyFromIcsFeed(businessId);
  return { connected: true, events: busy.length, error: cache.get(icsKey(businessId))?.error ?? null };
}

/** What the Integrations page shows about the connected Google account. */
export async function googleCalendarStatus(businessId: string): Promise<{
  connected: boolean;
  events: number;
  email: string | null;
}> {
  if (!isConnected(businessId, "google-calendar")) return { connected: false, events: 0, email: null };
  const busy = await busyFromGoogle(businessId);
  return { connected: true, events: busy.length, email: credentials(businessId, "google-calendar")?.account_email ?? null };
}

/** Test seam, and used when a feed's credentials change so the old copy is not served. */
export function forgetFeed(businessId: string): void {
  cache.delete(icsKey(businessId));
  cache.delete(googleKey(businessId));
}
