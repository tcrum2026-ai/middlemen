import { beforeEach, describe, expect, it } from "vitest";
import { rankOffers, type OfferForRanking, type RequestForRanking } from "@/lib/ai";

describe("rankOffers (deterministic fallback)", () => {
  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  const request: RequestForRanking = {
    title: "Repaint a house",
    description: "Exterior repaint of a 3-bedroom house",
    category: "Home Services",
    budgetMin: 1500,
    budgetMax: 3000,
  };

  it("returns an empty array for no offers", async () => {
    const result = await rankOffers(request, []);
    expect(result).toEqual([]);
  });

  it("ranks a cheaper, faster, higher-rated offer above a pricier, slower, lower-rated one", async () => {
    const offers: OfferForRanking[] = [
      {
        id: "great",
        price: 1800,
        description: "Great value",
        deliveryDays: 5,
        businessName: "BrightPaint",
        businessRating: 4.8,
      },
      {
        id: "worse",
        price: 2900,
        description: "Slower and pricier",
        deliveryDays: 20,
        businessName: "SlowPaint",
        businessRating: 3.2,
      },
    ];

    const ranked = await rankOffers(request, offers);
    expect(ranked).toHaveLength(2);
    expect(ranked[0].offerId).toBe("great");
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
    expect(ranked[0].rationale).toBeTruthy();
    expect(ranked[1].rationale).toBeTruthy();
  });

  it("penalizes offers priced over budget", async () => {
    const offers: OfferForRanking[] = [
      {
        id: "in-budget",
        price: 2000,
        description: "Within budget",
        deliveryDays: 10,
        businessName: "A",
        businessRating: 4.0,
      },
      {
        id: "over-budget",
        price: 6000,
        description: "Way over budget",
        deliveryDays: 10,
        businessName: "B",
        businessRating: 4.0,
      },
    ];

    const ranked = await rankOffers(request, offers);
    const overBudgetResult = ranked.find((r) => r.offerId === "over-budget")!;
    const inBudgetResult = ranked.find((r) => r.offerId === "in-budget")!;
    expect(inBudgetResult.score).toBeGreaterThan(overBudgetResult.score);
    expect(overBudgetResult.rationale.toLowerCase()).toContain("over");
  });

  it("scores are always within 0-100", async () => {
    const offers: OfferForRanking[] = [
      { id: "a", price: 1, description: "x", deliveryDays: 1, businessName: "A", businessRating: 5 },
      { id: "b", price: 999999, description: "x", deliveryDays: 365, businessName: "B", businessRating: 0.5 },
    ];
    const ranked = await rankOffers(request, offers);
    for (const r of ranked) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
  });
});
