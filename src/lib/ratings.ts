import { prisma } from "@/lib/db";

export type RatingSummary = {
  rating: number;
  reviewCount: number;
};

/**
 * A business's displayed rating is the live average of its real reviews.
 * New businesses with no reviews yet fall back to their seeded base rating
 * so the AI matcher and UI have something sensible to show before any
 * deals have completed.
 */
export async function getBusinessRatingSummary(
  businessId: string,
  fallbackRating: number
): Promise<RatingSummary> {
  const result = await prisma.review.aggregate({
    where: { businessId },
    _avg: { rating: true },
    _count: true,
  });

  if (result._count === 0 || result._avg.rating == null) {
    return { rating: fallbackRating, reviewCount: 0 };
  }

  return { rating: result._avg.rating, reviewCount: result._count };
}

export async function getBusinessRatingSummaries(
  businesses: { id: string; rating: number }[]
): Promise<Map<string, RatingSummary>> {
  const grouped = await prisma.review.groupBy({
    by: ["businessId"],
    where: { businessId: { in: businesses.map((b) => b.id) } },
    _avg: { rating: true },
    _count: true,
  });

  const byId = new Map(grouped.map((g) => [g.businessId, g]));

  return new Map(
    businesses.map((b) => {
      const agg = byId.get(b.id);
      if (!agg || agg._count === 0 || agg._avg.rating == null) {
        return [b.id, { rating: b.rating, reviewCount: 0 }];
      }
      return [b.id, { rating: agg._avg.rating, reviewCount: agg._count }];
    })
  );
}
