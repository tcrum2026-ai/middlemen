/**
 * Just enough iCalendar to answer "is this slot already spoken for?"
 *
 * The product books appointments. Until now it knew only about its own, so a
 * dentist appointment in the owner's real calendar was invisible and the
 * assistant would cheerfully book a customer on top of it. Double-booking
 * someone's day is the most damaging thing this software can do to them, so
 * the busy times have to come from the calendar they actually keep.
 *
 * A subscribed feed URL — Google's "secret address in iCal format", Apple's
 * public link, Outlook's published calendar — needs no OAuth and no app
 * review. What it costs is that we parse the format ourselves.
 *
 * Pure: text in, busy intervals out. No network, no clock of its own.
 *
 * Deliberately not implemented, because half-doing them is worse than not:
 * VTIMEZONE (floating and named-zone times are read as the feed's own
 * offset, or UTC), BYMONTHDAY/BYSETPOS/BYYEARDAY recurrences, and RDATE.
 * Anything not understood is skipped rather than guessed at — a missed busy
 * block risks a double-booking, but an invented one silently loses the
 * owner a bookable hour, and only one of those gets noticed.
 */

export interface BusyInterval {
  /** Epoch ms. */
  start: number;
  end: number;
  summary: string;
}

/** Unfolds the line continuations iCalendar wraps long values with. */
function unfold(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")) {
    if ((raw.startsWith(" ") || raw.startsWith("\t")) && out.length) {
      out[out.length - 1] += raw.slice(1);
    } else {
      out.push(raw);
    }
  }
  return out;
}

interface Prop {
  name: string;
  params: Record<string, string>;
  value: string;
}

function parseLine(line: string): Prop | null {
  const colon = line.indexOf(":");
  if (colon < 0) return null;
  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const [name, ...rest] = head.split(";");
  const params: Record<string, string> = {};
  for (const piece of rest) {
    const eq = piece.indexOf("=");
    if (eq > 0) params[piece.slice(0, eq).toUpperCase()] = piece.slice(eq + 1).replace(/^"|"$/g, "");
  }
  return { name: name.toUpperCase(), params, value };
}

/**
 * An iCalendar timestamp as epoch ms.
 *
 * `20260419T140000Z` is UTC. Without the Z it is local to the event's own
 * timezone, which without VTIMEZONE we cannot resolve — treating it as UTC
 * is the documented approximation above. `20260419` alone is an all-day date.
 */
function parseStamp(value: string, allDay: boolean): number | null {
  const v = value.trim();
  const date = /^(\d{4})(\d{2})(\d{2})$/.exec(v);
  if (date) {
    const [, y, m, d] = date;
    return Date.UTC(Number(y), Number(m) - 1, Number(d));
  }
  const stamp = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(v);
  if (!stamp) return null;
  const [, y, m, d, hh, mm, ss] = stamp;
  return Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));
  // `allDay` is accepted so callers read clearly; both branches are UTC-based.
  void allDay;
}

/** ISO 8601 duration, the subset iCalendar actually uses. */
function parseDuration(value: string): number | null {
  const m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(value.trim());
  if (!m) return null;
  const [, sign, w, d, h, min, s] = m;
  const ms =
    (Number(w ?? 0) * 7 + Number(d ?? 0)) * 86_400_000 +
    Number(h ?? 0) * 3_600_000 +
    Number(min ?? 0) * 60_000 +
    Number(s ?? 0) * 1000;
  return sign === "-" ? -ms : ms;
}

const WEEKDAYS: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

interface Recurrence {
  freq: string;
  interval: number;
  count: number | null;
  until: number | null;
  byDay: number[];
}

function parseRule(value: string): Recurrence | null {
  const parts: Record<string, string> = {};
  for (const piece of value.split(";")) {
    const eq = piece.indexOf("=");
    if (eq > 0) parts[piece.slice(0, eq).toUpperCase()] = piece.slice(eq + 1);
  }
  const freq = (parts.FREQ ?? "").toUpperCase();
  if (!["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(freq)) return null;

  return {
    freq,
    interval: Math.max(1, Number(parts.INTERVAL ?? 1) || 1),
    count: parts.COUNT ? Number(parts.COUNT) : null,
    until: parts.UNTIL ? parseStamp(parts.UNTIL, false) : null,
    // BYDAY may carry an ordinal (2FR); the plain weekday is all we support.
    byDay: (parts.BYDAY ?? "")
      .split(",")
      .map((d) => WEEKDAYS[d.replace(/^[+-]?\d+/, "").toUpperCase()])
      .filter((d): d is number => d !== undefined),
  };
}

/** Steps a UTC date forward by one period of the rule. */
function advance(from: Date, rule: Recurrence): Date {
  const next = new Date(from);
  if (rule.freq === "DAILY") next.setUTCDate(next.getUTCDate() + rule.interval);
  else if (rule.freq === "WEEKLY") next.setUTCDate(next.getUTCDate() + 7 * rule.interval);
  else if (rule.freq === "MONTHLY") next.setUTCMonth(next.getUTCMonth() + rule.interval);
  else next.setUTCFullYear(next.getUTCFullYear() + rule.interval);
  return next;
}

/** Hard ceiling on expansion, so a malformed infinite rule cannot run away. */
const MAX_OCCURRENCES = 750;

function expand(start: number, end: number, rule: Recurrence, windowEnd: number): [number, number][] {
  const length = end - start;
  const out: [number, number][] = [];
  const first = new Date(start);

  // WEEKLY with BYDAY repeats on each named day of the week, not just the
  // weekday the series happens to start on.
  const days = rule.freq === "WEEKLY" && rule.byDay.length ? rule.byDay : [first.getUTCDay()];

  let cursor = new Date(first);
  let emitted = 0;
  for (let period = 0; period < MAX_OCCURRENCES; period++) {
    // The Sunday that begins this occurrence's week.
    const weekStart = new Date(cursor);
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());

    for (const day of days) {
      const at =
        rule.freq === "WEEKLY" && rule.byDay.length
          ? new Date(weekStart.getTime() + day * 86_400_000)
          : new Date(cursor);
      if (rule.freq === "WEEKLY" && rule.byDay.length) {
        at.setUTCHours(first.getUTCHours(), first.getUTCMinutes(), first.getUTCSeconds(), 0);
      }
      const t = at.getTime();
      if (t < start) continue;
      if (rule.until !== null && t > rule.until) return out;
      if (t > windowEnd) return out;
      out.push([t, t + length]);
      emitted += 1;
      if (rule.count !== null && emitted >= rule.count) return out;
    }

    cursor = advance(cursor, rule);
    if (cursor.getTime() > windowEnd) break;
  }
  return out;
}

/**
 * Busy intervals from a calendar feed, clipped to [from, to].
 *
 * Events marked CANCELLED, and those the host has declined, are not busy.
 * Anything transparent (TRANSP:TRANSPARENT — "free" in Google) is not busy
 * either: that is the setting people use for all-day markers like "Q3" that
 * should not block a whole day of bookings.
 */
export function busyIntervals(ics: string, from: number, to: number): BusyInterval[] {
  const lines = unfold(ics);
  const out: BusyInterval[] = [];

  let inEvent = false;
  let props: Prop[] = [];

  const flush = () => {
    const get = (name: string) => props.find((p) => p.name === name);
    const status = get("STATUS")?.value.toUpperCase();
    const transp = get("TRANSP")?.value.toUpperCase();
    const dtstart = get("DTSTART");
    if (!dtstart || status === "CANCELLED" || transp === "TRANSPARENT") return;

    const allDay = dtstart.params.VALUE === "DATE" || /^\d{8}$/.test(dtstart.value.trim());
    const start = parseStamp(dtstart.value, allDay);
    if (start === null) return;

    const dtend = get("DTEND");
    const duration = get("DURATION");
    let end =
      dtend ? parseStamp(dtend.value, allDay) : duration ? start + (parseDuration(duration.value) ?? 0) : null;
    // A DTSTART with no end is a point in time; an all-day date runs the day.
    if (end === null) end = allDay ? start + 86_400_000 : start;
    if (end <= start) end = allDay ? start + 86_400_000 : start + 60_000;

    const summary = get("SUMMARY")?.value.replace(/\\,/g, ",").replace(/\\n/gi, " ").trim() || "Busy";

    const excluded = new Set(
      (get("EXDATE")?.value ?? "")
        .split(",")
        .map((v) => parseStamp(v, allDay))
        .filter((v): v is number => v !== null),
    );

    const rrule = get("RRULE");
    const rule = rrule ? parseRule(rrule.value) : null;
    const occurrences: [number, number][] = rule ? expand(start, end, rule, to) : [[start, end]];

    for (const [s, e] of occurrences) {
      if (excluded.has(s)) continue;
      if (e <= from || s >= to) continue;
      out.push({ start: Math.max(s, from), end: Math.min(e, to), summary });
    }
  };

  for (const line of lines) {
    const upper = line.toUpperCase();
    if (upper.startsWith("BEGIN:VEVENT")) {
      inEvent = true;
      props = [];
      continue;
    }
    if (upper.startsWith("END:VEVENT")) {
      if (inEvent) flush();
      inEvent = false;
      props = [];
      continue;
    }
    if (!inEvent) continue;
    const prop = parseLine(line);
    if (prop) props.push(prop);
  }

  return out.sort((a, b) => a.start - b.start);
}

/** True when [start, end) overlaps any busy interval. */
export function overlapsBusy(start: number, end: number, busy: BusyInterval[]): boolean {
  return busy.some((b) => start < b.end && end > b.start);
}
