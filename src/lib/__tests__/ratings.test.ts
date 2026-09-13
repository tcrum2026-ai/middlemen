import { describe, expect, it } from "vitest";
import { MIN_REVIEWS_TO_DISPLAY, summarize } from "@/lib/ratings";

describe("summarize", () => {
  it("hides the display rating below the minimum review threshold", () => {
    const result = summarize(5 * (MIN_REVIEWS_TO_DISPLAY - 1), MIN_REVIEWS_TO_DISPLAY - 1);
    expect(result.displayRating).toBeNull();
    expect(result.reviewCount).toBe(MIN_REVIEWS_TO_DISPLAY - 1);
  });

  it("shows the honest average once the threshold is met", () => {
    const result = summarize(4 + 5 + 3, 3);
    expect(result.displayRating).toBeCloseTo(4);
    expect(result.reviewCount).toBe(3);
  });

  it("never blends the prior into the displayed rating", () => {
    // 5 perfect reviews should display as a perfect 5, not pulled toward the prior.
    const result = summarize(5 * 5, 5);
    expect(result.displayRating).toBe(5);
  });

  it("pulls the sort score toward a neutral prior with zero reviews", () => {
    const result = summarize(0, 0);
    expect(result.displayRating).toBeNull();
    expect(result.sortScore).toBeCloseTo(4.0);
  });

  it("lets enough good reviews outweigh the prior in the sort score", () => {
    const fewGreat = summarize(5, 1); // one 5-star review
    const manyGreat = summarize(5 * 50, 50); // fifty 5-star reviews
    expect(manyGreat.sortScore).toBeGreaterThan(fewGreat.sortScore);
  });

  it("ranks a business with many strong reviews above one lucky 5-star review", () => {
    const oneLuckyFive = summarize(5, 1);
    const fortyAtFourPointFive = summarize(4.5 * 40, 40);
    expect(fortyAtFourPointFive.sortScore).toBeGreaterThan(oneLuckyFive.sortScore);
  });
});
