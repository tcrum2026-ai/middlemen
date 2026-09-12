export type OfferForRanking = {
  id: string;
  price: number;
  description: string;
  deliveryDays: number;
  businessName: string;
  businessRating: number;
};

export type RequestForRanking = {
  title: string;
  description: string;
  category: string;
  budgetMin: number;
  budgetMax: number;
};

export type RankedOffer = {
  offerId: string;
  score: number;
  rationale: string;
};

/**
 * Ranks offers against a customer request. Uses Claude when ANTHROPIC_API_KEY
 * is configured; otherwise falls back to a deterministic scorer so the app
 * works fully offline.
 */
export async function rankOffers(
  request: RequestForRanking,
  offers: OfferForRanking[]
): Promise<RankedOffer[]> {
  if (offers.length === 0) return [];

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const aiResult = await rankOffersWithClaude(request, offers, apiKey);
      if (aiResult) return aiResult;
    } catch (err) {
      console.error("AI ranking failed, falling back to deterministic scorer:", err);
    }
  }

  return rankOffersDeterministically(request, offers);
}

async function rankOffersWithClaude(
  request: RequestForRanking,
  offers: OfferForRanking[],
  apiKey: string
): Promise<RankedOffer[] | null> {
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

  const prompt = `You are a neutral deal-matching analyst for a marketplace that connects customers to businesses. \
A customer posted this request:

Title: ${request.title}
Category: ${request.category}
Budget: $${request.budgetMin} - $${request.budgetMax}
Description: ${request.description}

Here are the competing offers from businesses, as JSON:
${JSON.stringify(
  offers.map((o) => ({
    offerId: o.id,
    price: o.price,
    deliveryDays: o.deliveryDays,
    businessName: o.businessName,
    businessRating: o.businessRating,
    description: o.description,
  })),
  null,
  2
)}

Score each offer from 0-100 on overall value to the customer (consider price vs. budget, \
business rating, delivery time, and how well the offer's description matches what the customer wants). \
Write a one-sentence rationale per offer explaining the score in plain language.

Respond with ONLY a JSON array, no other text, in this exact shape:
[{"offerId": "...", "score": 87, "rationale": "..."}]`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    console.error("Anthropic API error:", response.status, await response.text());
    return null;
  }

  const data = (await response.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = data.content?.find((c) => c.type === "text")?.text;
  if (!text) return null;

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return null;

  const parsed = JSON.parse(jsonMatch[0]) as unknown;
  if (!Array.isArray(parsed)) return null;

  const validOfferIds = new Set(offers.map((o) => o.id));
  const results: RankedOffer[] = [];
  for (const entry of parsed) {
    if (
      entry &&
      typeof entry === "object" &&
      "offerId" in entry &&
      "score" in entry &&
      "rationale" in entry &&
      typeof entry.offerId === "string" &&
      typeof entry.score === "number" &&
      typeof entry.rationale === "string" &&
      validOfferIds.has(entry.offerId)
    ) {
      results.push({
        offerId: entry.offerId,
        score: Math.max(0, Math.min(100, entry.score)),
        rationale: entry.rationale,
      });
    }
  }

  if (results.length !== offers.length) return null;
  return results.sort((a, b) => b.score - a.score);
}

function rankOffersDeterministically(
  request: RequestForRanking,
  offers: OfferForRanking[]
): RankedOffer[] {
  const prices = offers.map((o) => o.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const deliveries = offers.map((o) => o.deliveryDays);
  const minDelivery = Math.min(...deliveries);
  const maxDelivery = Math.max(...deliveries);

  const scored = offers.map((offer) => {
    const priceScore = scorePrice(offer.price, minPrice, maxPrice, request.budgetMax);
    const ratingScore = (offer.businessRating / 5) * 100;
    const deliveryScore = scoreRange(offer.deliveryDays, minDelivery, maxDelivery, true);

    const score = Math.round(priceScore * 0.45 + ratingScore * 0.3 + deliveryScore * 0.25);

    const rationale = buildRationale(offer, request, {
      isCheapest: offer.price === minPrice,
      isFastest: offer.deliveryDays === minDelivery,
      isTopRated: offer.businessRating >= 4.7,
      overBudget: offer.price > request.budgetMax,
    });

    return { offerId: offer.id, score, rationale };
  });

  return scored.sort((a, b) => b.score - a.score);
}

function scorePrice(price: number, min: number, max: number, budgetMax: number): number {
  if (price > budgetMax) {
    const overshoot = (price - budgetMax) / budgetMax;
    return Math.max(0, 40 - overshoot * 100);
  }
  if (max === min) return 100;
  return 60 + (1 - (price - min) / (max - min)) * 40;
}

function scoreRange(value: number, min: number, max: number, lowerIsBetter: boolean): number {
  if (max === min) return 100;
  const ratio = (value - min) / (max - min);
  return lowerIsBetter ? (1 - ratio) * 100 : ratio * 100;
}

function buildRationale(
  offer: OfferForRanking,
  request: RequestForRanking,
  flags: { isCheapest: boolean; isFastest: boolean; isTopRated: boolean; overBudget: boolean }
): string {
  const parts: string[] = [];
  if (flags.overBudget) {
    parts.push(`Priced $${(offer.price - request.budgetMax).toFixed(0)} over the stated budget`);
  } else if (flags.isCheapest) {
    parts.push("The lowest price among current offers");
  } else {
    parts.push(`Priced at $${offer.price.toFixed(0)}, within budget`);
  }

  if (flags.isTopRated) {
    parts.push(`from a highly-rated business (${offer.businessRating.toFixed(1)}/5)`);
  } else {
    parts.push(`rated ${offer.businessRating.toFixed(1)}/5`);
  }

  if (flags.isFastest) {
    parts.push(`with the fastest delivery (${offer.deliveryDays} days)`);
  } else {
    parts.push(`delivering in ${offer.deliveryDays} days`);
  }

  return parts.join(", ") + ".";
}
