import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { busyIntervals, overlapsBusy } from "../lib/ical.ts";

/**
 * A missed busy block double-books somebody's day. An invented one silently
 * removes a bookable hour. These fixtures are shaped like what Google, Apple
 * and Outlook actually publish.
 */

const wrap = (body: string) =>
  ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Test//EN", body, "END:VCALENDAR"].join("\r\n");

const WEEK_FROM = Date.UTC(2026, 3, 13); // Mon 13 Apr 2026
const WEEK_TO = Date.UTC(2026, 3, 20);
const busy = (body: string, from = WEEK_FROM, to = WEEK_TO) => busyIntervals(wrap(body), from, to);

describe("busyIntervals — a single event", () => {
  it("reads a plain UTC event", () => {
    const b = busy(
      "BEGIN:VEVENT\r\nDTSTART:20260414T090000Z\r\nDTEND:20260414T100000Z\r\nSUMMARY:Dentist\r\nEND:VEVENT",
    );
    assert.equal(b.length, 1);
    assert.equal(b[0].start, Date.UTC(2026, 3, 14, 9));
    assert.equal(b[0].end, Date.UTC(2026, 3, 14, 10));
    assert.equal(b[0].summary, "Dentist");
  });

  it("reads DURATION when there is no DTEND", () => {
    const b = busy("BEGIN:VEVENT\r\nDTSTART:20260414T090000Z\r\nDURATION:PT1H30M\r\nEND:VEVENT");
    assert.equal(b[0].end - b[0].start, 90 * 60_000);
  });

  it("treats an all-day event as the whole day", () => {
    const b = busy("BEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20260415\r\nDTEND;VALUE=DATE:20260416\r\nSUMMARY:Closed\r\nEND:VEVENT");
    assert.equal(b[0].start, Date.UTC(2026, 3, 15));
    assert.equal(b[0].end, Date.UTC(2026, 3, 16));
  });

  it("unfolds a wrapped line rather than losing the rest of it", () => {
    const b = busy(
      "BEGIN:VEVENT\r\nDTSTART:20260414T090000Z\r\nDTEND:20260414T100000Z\r\nSUMMARY:Quarterly plannin\r\n g session\r\nEND:VEVENT",
    );
    assert.equal(b[0].summary, "Quarterly planning session");
  });
});

describe("busyIntervals — what is NOT busy", () => {
  it("ignores a cancelled event", () => {
    assert.equal(
      busy("BEGIN:VEVENT\r\nDTSTART:20260414T090000Z\r\nDTEND:20260414T100000Z\r\nSTATUS:CANCELLED\r\nEND:VEVENT").length,
      0,
    );
  });

  it("ignores an event marked free", () => {
    // People mark all-day "Q3" banners transparent precisely so they do not
    // block the day. Honouring that is the difference between a usable
    // calendar and one that reports the owner busy all quarter.
    assert.equal(
      busy("BEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20260415\r\nTRANSP:TRANSPARENT\r\nSUMMARY:Q2\r\nEND:VEVENT").length,
      0,
    );
  });

  it("ignores anything outside the window", () => {
    assert.equal(busy("BEGIN:VEVENT\r\nDTSTART:20260501T090000Z\r\nDTEND:20260501T100000Z\r\nEND:VEVENT").length, 0);
  });

  it("returns nothing for junk rather than throwing", () => {
    assert.deepEqual(busyIntervals("not a calendar at all", WEEK_FROM, WEEK_TO), []);
    assert.deepEqual(busyIntervals("", WEEK_FROM, WEEK_TO), []);
    assert.deepEqual(busyIntervals("BEGIN:VEVENT\r\nSUMMARY:no start\r\nEND:VEVENT", WEEK_FROM, WEEK_TO), []);
  });
});

describe("busyIntervals — recurrence", () => {
  it("expands a daily rule across the window", () => {
    const b = busy("BEGIN:VEVENT\r\nDTSTART:20260413T080000Z\r\nDTEND:20260413T083000Z\r\nRRULE:FREQ=DAILY\r\nEND:VEVENT");
    assert.equal(b.length, 7);
    assert.equal(b[1].start, Date.UTC(2026, 3, 14, 8));
  });

  it("honours INTERVAL", () => {
    const b = busy("BEGIN:VEVENT\r\nDTSTART:20260413T080000Z\r\nDTEND:20260413T083000Z\r\nRRULE:FREQ=DAILY;INTERVAL=2\r\nEND:VEVENT");
    assert.deepEqual(b.map((x) => new Date(x.start).getUTCDate()), [13, 15, 17, 19]);
  });

  it("stops at COUNT", () => {
    const b = busy("BEGIN:VEVENT\r\nDTSTART:20260413T080000Z\r\nDTEND:20260413T083000Z\r\nRRULE:FREQ=DAILY;COUNT=3\r\nEND:VEVENT");
    assert.equal(b.length, 3);
  });

  it("stops at UNTIL", () => {
    const b = busy(
      "BEGIN:VEVENT\r\nDTSTART:20260413T080000Z\r\nDTEND:20260413T083000Z\r\nRRULE:FREQ=DAILY;UNTIL=20260415T235959Z\r\nEND:VEVENT",
    );
    assert.deepEqual(b.map((x) => new Date(x.start).getUTCDate()), [13, 14, 15]);
  });

  it("expands a weekly rule on the named days", () => {
    // The standing Tue/Thu team call — the exact thing that gets
    // double-booked when recurrence is ignored.
    const b = busy(
      "BEGIN:VEVENT\r\nDTSTART:20260414T150000Z\r\nDTEND:20260414T153000Z\r\nRRULE:FREQ=WEEKLY;BYDAY=TU,TH\r\nSUMMARY:Standup\r\nEND:VEVENT",
    );
    assert.deepEqual(b.map((x) => new Date(x.start).getUTCDate()), [14, 16]);
    assert.equal(new Date(b[0].start).getUTCHours(), 15);
  });

  it("drops a date listed in EXDATE", () => {
    const b = busy(
      "BEGIN:VEVENT\r\nDTSTART:20260413T080000Z\r\nDTEND:20260413T083000Z\r\nRRULE:FREQ=DAILY\r\nEXDATE:20260415T080000Z\r\nEND:VEVENT",
    );
    assert.equal(b.length, 6);
    assert.ok(!b.some((x) => new Date(x.start).getUTCDate() === 15));
  });

  it("cannot run away on an unbounded rule", () => {
    const b = busy(
      "BEGIN:VEVENT\r\nDTSTART:20260413T080000Z\r\nDTEND:20260413T083000Z\r\nRRULE:FREQ=DAILY\r\nEND:VEVENT",
      WEEK_FROM,
      Date.UTC(2030, 0, 1),
    );
    assert.ok(b.length <= 2000, `expanded ${b.length} occurrences`);
  });

  it("skips a recurrence shape it does not understand rather than guessing", () => {
    // Better to miss one busy block than to invent a wrong series and quietly
    // delete bookable hours from someone's week.
    const b = busy("BEGIN:VEVENT\r\nDTSTART:20260413T080000Z\r\nDTEND:20260413T083000Z\r\nRRULE:FREQ=HOURLY\r\nEND:VEVENT");
    assert.equal(b.length, 1);
  });
});

describe("busyIntervals — several events", () => {
  it("returns them in order, clipped to the window", () => {
    const b = busy(
      [
        "BEGIN:VEVENT\r\nDTSTART:20260416T140000Z\r\nDTEND:20260416T150000Z\r\nSUMMARY:Later\r\nEND:VEVENT",
        "BEGIN:VEVENT\r\nDTSTART:20260414T090000Z\r\nDTEND:20260414T100000Z\r\nSUMMARY:Earlier\r\nEND:VEVENT",
        "BEGIN:VEVENT\r\nDTSTART:20260412T090000Z\r\nDTEND:20260413T060000Z\r\nSUMMARY:Overnight\r\nEND:VEVENT",
      ].join("\r\n"),
    );
    assert.deepEqual(b.map((x) => x.summary), ["Overnight", "Earlier", "Later"]);
    assert.equal(b[0].start, WEEK_FROM, "an event straddling the window start is clipped to it");
  });
});

describe("overlapsBusy", () => {
  const b = [{ start: Date.UTC(2026, 3, 14, 9), end: Date.UTC(2026, 3, 14, 10), summary: "Dentist" }];

  it("catches a slot inside, around, and half-over a busy block", () => {
    assert.equal(overlapsBusy(Date.UTC(2026, 3, 14, 9, 15), Date.UTC(2026, 3, 14, 9, 45), b), true);
    assert.equal(overlapsBusy(Date.UTC(2026, 3, 14, 8), Date.UTC(2026, 3, 14, 11), b), true);
    assert.equal(overlapsBusy(Date.UTC(2026, 3, 14, 9, 30), Date.UTC(2026, 3, 14, 10, 30), b), true);
  });

  it("lets a slot that merely touches the edges through", () => {
    // Back-to-back is not a clash: 8:30–9:00 against a 9:00 start is fine.
    assert.equal(overlapsBusy(Date.UTC(2026, 3, 14, 8, 30), Date.UTC(2026, 3, 14, 9), b), false);
    assert.equal(overlapsBusy(Date.UTC(2026, 3, 14, 10), Date.UTC(2026, 3, 14, 10, 30), b), false);
  });
});
