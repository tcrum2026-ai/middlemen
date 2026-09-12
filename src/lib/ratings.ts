import { prisma } from "@/lib/db";

/**
 * A business needs at least this many real reviews before we show a public
 * star rating. Below the threshold we show "New" instead — showing a number
 * built from one or two reviews is misleading, and platforms that fake a
 * "smoothed" number to get around this end up accused of cooking the books.
 */
export const MIN_REVIEWS_TO_DISPLAY = 3;

/** Neutral prior used only to keep sorting/matching sane before a business
 * has enough reviews to earn a real rating. Never shown to users. */
const PRIOR_MEAN = 4.0;
const PRIOR_WEIGHT = MIN_REVIEWS_TO_DISPLAY;

export type RatingSummary = {
  /** The honest arithmetic average of real reviews, or null if there aren't
   * enough yet to display. This is what customers see. */
  displayRating: number | null;
  reviewCount: number;
  /** Bayesian-weighted score, pulled toward a neutral prior for businesses
   * with few or no reviews. Used only to sort/rank listings so a single
   * lucky 5-star review doesn't outrank a business with 40 solid reviews —
   * never shown as a rating itself. */
  sortScore: number;
};

function summarize(sum: number, count: number): RatingSummary {
  const sortScore = (PRIOR_WEIGHT * PRIOR_MEAN + sum) / (PRIOR_WEIGHT + count);
  return {
    displayRating: count >= MIN_REVIEWS_TO_DISPLAY ? sum / count : null,
    reviewCount: count,
    sortScore,
  };
}

export async function getBusinessRatingSummary(businessId: string): Promise<RatingSummary> {
  const result = await prisma.review.aggregate({
    where: { businessId },
    _sum: { rating: true },
    _count: true,
  });
  return summarize(result._sum.rating ?? 0, result._count);
}

export async function getBusinessRatingSummaries(
  businessIds: string[]
): Promise<Map<string, RatingSummary>> {
  const grouped = await prisma.review.groupBy({
    by: ["businessId"],
    where: { businessId: { in: businessIds } },
    _sum: { rating: true },
    _count: true,
  });

  const byId = new Map(grouped.map((g) => [g.businessId, g]));

  return new Map(
    businessIds.map((id) => {
      const agg = byId.get(id);
      return [id, summarize(agg?._sum.rating ?? 0, agg?._count ?? 0)];
    })
  );
}
