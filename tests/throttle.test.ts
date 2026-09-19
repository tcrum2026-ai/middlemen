import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { throttle, type ThrottleWindow } from "../lib/throttle.ts";

const HALF_HOUR = 30 * 60_000;
const T = 1_700_000_000_000;

describe("throttle", () => {
  it("always sends the first one", () => {
    const d = throttle(undefined, T, HALF_HOUR);
    assert.equal(d.send, true);
    assert.equal(d.alsoWaiting, 0);
  });

  it("holds anything inside the window", () => {
    const d = throttle({ last: T, suppressed: 0 }, T + 60_000, HALF_HOUR);
    assert.equal(d.send, false);
  });

  it("counts what it held back without moving the clock", () => {
    let w: ThrottleWindow = { last: T, suppressed: 0 };
    for (let i = 0; i < 5; i++) w = throttle(w, T + 60_000 * (i + 1), HALF_HOUR).next;
    assert.equal(w.suppressed, 5);
    // Holding one must not push the next send further out, or a steady
    // trickle would silence the channel forever.
    assert.equal(w.last, T);
  });

  it("sends again once the window passes, reporting the backlog", () => {
    const d = throttle({ last: T, suppressed: 4 }, T + HALF_HOUR, HALF_HOUR);
    assert.equal(d.send, true);
    assert.equal(d.alsoWaiting, 4);
    assert.deepEqual(d.next, { last: T + HALF_HOUR, suppressed: 0 });
  });

  it("clears the backlog after reporting it once", () => {
    const after = throttle({ last: T, suppressed: 4 }, T + HALF_HOUR, HALF_HOUR).next;
    assert.equal(throttle(after, T + 2 * HALF_HOUR, HALF_HOUR).alsoWaiting, 0);
  });

  it("does not send twice at the same instant", () => {
    const first = throttle(undefined, T, HALF_HOUR);
    assert.equal(throttle(first.next, T, HALF_HOUR).send, false);
  });
});
