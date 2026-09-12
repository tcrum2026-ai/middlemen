import { afterEach, describe, expect, it } from "vitest";
import { computeCommission, getCommissionRate } from "@/lib/commission";

describe("commission", () => {
  const originalEnv = process.env.PLATFORM_COMMISSION_PERCENT;

  afterEach(() => {
    process.env.PLATFORM_COMMISSION_PERCENT = originalEnv;
  });

  it("defaults to 8% when the env var is unset", () => {
    delete process.env.PLATFORM_COMMISSION_PERCENT;
    expect(getCommissionRate()).toBeCloseTo(0.08);
  });

  it("falls back to 8% for an invalid env var", () => {
    process.env.PLATFORM_COMMISSION_PERCENT = "not-a-number";
    expect(getCommissionRate()).toBeCloseTo(0.08);
  });

  it("respects a configured percentage", () => {
    process.env.PLATFORM_COMMISSION_PERCENT = "10";
    expect(getCommissionRate()).toBeCloseTo(0.1);
  });

  it("computes commission and payout that add up to the deal amount", () => {
    process.env.PLATFORM_COMMISSION_PERCENT = "10";
    const breakdown = computeCommission(1000);
    expect(breakdown.commissionRate).toBeCloseTo(0.1);
    expect(breakdown.commissionAmount).toBeCloseTo(100);
    expect(breakdown.businessPayout).toBeCloseTo(900);
    expect(breakdown.commissionAmount + breakdown.businessPayout).toBeCloseTo(breakdown.amount);
  });

  it("rounds to the nearest cent", () => {
    process.env.PLATFORM_COMMISSION_PERCENT = "8";
    const breakdown = computeCommission(99.99);
    expect(breakdown.commissionAmount).toBeCloseTo(8, 1);
    expect(Number.isInteger(breakdown.commissionAmount * 100)).toBe(true);
  });
});
