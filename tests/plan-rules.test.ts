import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { blockFor, overage, trialDaysLeft, type RuleInput } from "../lib/plan-rules.ts";

/**
 * These rules decide whether a paying customer's phone gets answered. Getting
 * them wrong in one direction means serving people who stopped paying; in the
 * other, cutting off someone who is paying — which is far worse.
 */

const DAY = 86_400_000;
const NOW = 1_700_000_000_000;
const ALLOWANCE = { conversations: 1000, voiceMinutes: 250 };

function input(over: Partial<RuleInput> = {}): RuleInput {
  return {
    status: "active",
    trialEndsAt: 0,
    now: NOW,
    conversationsUsed: 0,
    allowance: ALLOWANCE,
    ...over,
  };
}

describe("blockFor — who gets served", () => {
  it("lets an active subscription inside its allowance answer", () => {
    assert.equal(blockFor(input()), null);
  });

  it("lets a trial inside its allowance answer", () => {
    assert.equal(blockFor(input({ status: "trialing", trialEndsAt: NOW + 7 * DAY })), null);
  });

  it("stops a cancelled subscription", () => {
    assert.match(blockFor(input({ status: "canceled" }))!.reason, /cancelled/);
  });

  it("stops a failed payment, and says what to do about it", () => {
    const block = blockFor(input({ status: "past_due" }))!;
    assert.match(block.reason, /Update the card/);
  });

  it("stops an expired trial", () => {
    assert.match(
      blockFor(input({ status: "trialing", trialEndsAt: NOW - DAY }))!.reason,
      /trial has ended/,
    );
  });

  it("does not stop a trial that ends later today", () => {
    assert.equal(blockFor(input({ status: "trialing", trialEndsAt: NOW + 1 })), null);
  });

  it("never expires a trial with no end date recorded", () => {
    // Missing data is our bug. Taking someone's service away over it is the
    // wrong way round.
    assert.equal(blockFor(input({ status: "trialing", trialEndsAt: 0 })), null);
  });

  it("ignores a past trial end once the workspace is paying", () => {
    assert.equal(blockFor(input({ status: "active", trialEndsAt: NOW - 30 * DAY })), null);
  });
});

describe("blockFor — the allowance boundary", () => {
  it("serves the last conversation inside the allowance", () => {
    assert.equal(blockFor(input({ conversationsUsed: 999 })), null);
  });

  it("stops at exactly the allowance, not one past it", () => {
    // 1000 conversations used means 1000 were served; the 1001st is over.
    assert.notEqual(blockFor(input({ conversationsUsed: 1000 })), null);
  });

  it("names the number in the reason, with a thousands separator", () => {
    assert.match(blockFor(input({ conversationsUsed: 1000 }))!.reason, /1,000 conversations/);
  });

  it("blocks a plan with a zero allowance immediately", () => {
    assert.notEqual(
      blockFor(input({ conversationsUsed: 0, allowance: { conversations: 0, voiceMinutes: 0 } })),
      null,
    );
  });
});

describe("blockFor — precedence", () => {
  it("reports a cancellation rather than the allowance it also breached", () => {
    const block = blockFor(input({ status: "canceled", conversationsUsed: 5000 }))!;
    assert.match(block.reason, /cancelled/);
  });

  it("reports a failed payment rather than an expired trial", () => {
    const block = blockFor(input({ status: "past_due", trialEndsAt: NOW - DAY }))!;
    assert.match(block.reason, /payment failed/i);
  });

  it("gives every block a title and a reason that differ", () => {
    for (const status of ["canceled", "past_due"] as const) {
      const block = blockFor(input({ status }))!;
      assert.ok(block.title.length > 0 && block.reason.length > 0);
      assert.notEqual(block.title, block.reason);
    }
  });
});

describe("trialDaysLeft", () => {
  it("rounds part-days up, so the last day still reads as a day", () => {
    assert.equal(trialDaysLeft(NOW + DAY + 1, NOW), 2);
    assert.equal(trialDaysLeft(NOW + DAY, NOW), 1);
  });

  it("never goes negative", () => {
    assert.equal(trialDaysLeft(NOW - 10 * DAY, NOW), 0);
  });

  it("is zero when there is no trial", () => {
    assert.equal(trialDaysLeft(0, NOW), 0);
  });
});

describe("overage", () => {
  it("is nothing while inside the allowance", () => {
    assert.deepEqual(overage(100, ALLOWANCE, 0.25, false), { minutes: 0, cents: 0 });
    assert.deepEqual(overage(250, ALLOWANCE, 0.25, false), { minutes: 0, cents: 0 });
  });

  it("charges the per-minute rate past the allowance", () => {
    assert.deepEqual(overage(260, ALLOWANCE, 0.25, false), { minutes: 10, cents: 250 });
  });

  it("never charges a trial for overage", () => {
    assert.deepEqual(overage(400, ALLOWANCE, 0.25, true), { minutes: 150, cents: 0 });
  });

  it("charges nothing on a plan with no overage rate", () => {
    assert.deepEqual(overage(400, ALLOWANCE, null, false), { minutes: 150, cents: 0 });
  });

  it("rounds to whole cents rather than carrying a fraction onto an invoice", () => {
    assert.deepEqual(overage(253, ALLOWANCE, 0.333, false), { minutes: 3, cents: 100 });
  });
});
