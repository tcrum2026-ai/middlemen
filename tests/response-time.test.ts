import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { humanDuration, responseStats, type TimedMessage } from "../lib/response-time.ts";

const T = 1_700_000_000_000;
const m = (role: string, offsetSec: number): TimedMessage => ({ role, at: T + offsetSec * 1000 });

describe("responseStats", () => {
  it("measures the gap from the customer's message to the reply", () => {
    const s = responseStats([[m("customer", 0), m("assistant", 6)]]);
    assert.equal(s.medianByAi, 6000);
    assert.equal(s.answeredByAi, 1);
  });

  it("separates what the assistant answered from what a person did", () => {
    const s = responseStats([
      [m("customer", 0), m("assistant", 5)],
      [m("customer", 0), m("agent", 3600)],
    ]);
    assert.equal(s.medianByAi, 5000);
    assert.equal(s.medianByHuman, 3_600_000);
  });

  it("takes the median, so one weekend does not swamp a thousand fast replies", () => {
    const fast = Array.from({ length: 9 }, () => [m("customer", 0), m("assistant", 5)]);
    const slow = [[m("customer", 0), m("assistant", 200_000)]];
    const s = responseStats([...fast, ...slow]);
    assert.equal(s.medianByAi, 5000);
  });

  it("starts the clock at the first of several messages in a row", () => {
    // Someone typing three lines started waiting at the first one.
    const s = responseStats([[m("customer", 0), m("customer", 10), m("customer", 20), m("assistant", 30)]]);
    assert.equal(s.medianByAi, 30_000);
    assert.equal(s.answeredByAi, 1);
  });

  it("counts a second exchange in the same thread separately", () => {
    const s = responseStats([
      [m("customer", 0), m("assistant", 10), m("customer", 100), m("assistant", 130)],
    ]);
    assert.equal(s.answeredByAi, 2);
    assert.equal(s.medianByAi, 20_000);
  });

  it("counts a thread that never got a reply as unanswered", () => {
    const s = responseStats([[m("customer", 0)], [m("customer", 0), m("assistant", 4)]]);
    assert.equal(s.unanswered, 1);
    assert.equal(s.answeredByAi, 1);
  });

  it("ignores a reply with no question in front of it", () => {
    // A proactive follow-up is not a response time.
    const s = responseStats([[m("assistant", 0), m("assistant", 50)]]);
    assert.equal(s.answeredByAi, 0);
    assert.equal(s.medianByAi, null);
  });

  it("never reports a negative wait from out-of-order timestamps", () => {
    const s = responseStats([[{ role: "assistant", at: T + 5000 }, { role: "customer", at: T }]]);
    assert.ok((s.medianByAi ?? 0) >= 0);
  });

  it("reports nothing rather than zero when there is nothing to report", () => {
    const s = responseStats([]);
    assert.equal(s.medianByAi, null);
    assert.equal(s.medianByHuman, null);
  });
});

describe("humanDuration", () => {
  it("reads naturally at every scale", () => {
    // "0s" would read like a missing value rather than a fast reply.
    assert.equal(humanDuration(2), "under 1s");
    assert.equal(humanDuration(6_000), "6s");
    assert.equal(humanDuration(90_000), "2 min");
    assert.equal(humanDuration(3 * 3_600_000), "3.0h");
    assert.equal(humanDuration(30 * 3_600_000), "1.3d");
    assert.equal(humanDuration(null), "—");
  });
});
