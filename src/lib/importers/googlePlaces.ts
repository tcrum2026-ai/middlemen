import { prisma } from "../db";

/**
 * Minimum bar a Google-listed business must clear before we add it to the
 * directory — this is the "certain rating and review amount" filter. Kept
 * deliberately strict: we're vouching for these listings before anyone has
 * left a DealBridge review of their own.
 */
export const MIN_SOURCE_RATING = 4.0;
export const MIN_SOURCE_REVIEWS = 20;

const PLACES_TEXT_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json";
const PLACES_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json";

export function isGooglePlacesConfigured() {
  return !!process.env.GOOGLE_PLACES_API_KEY;
}

type PlaceSearchResult = {
  place_id: string;
  name: string;
  formatted_address?: string;
  rating?: number;
  user_ratings_total?: number;
  business_status?: string;
};

type PlaceDetailsResult = {
  place_id: string;
  name: string;
  formatted_phone_number?: string;
  website?: string;
  address_components?: { long_name: string; short_name: string; types: string[] }[];
};

async function textSearch(query: string, apiKey: string): Promise<PlaceSearchResult[]> {
  const results: PlaceSearchResult[] = [];
  let pageToken: string | undefined;

  // Google returns up to 3 pages of 20 results each; a next_page_token needs
  // a short delay before it becomes valid.
  for (let page = 0; page < 3; page++) {
    const url = new URL(PLACES_TEXT_SEARCH_URL);
    url.searchParams.set("key", apiKey);
    if (pageToken) {
      url.searchParams.set("pagetoken", pageToken);
    } else {
      url.searchParams.set("query", query);
    }

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Places Text Search failed: ${res.status}`);
    const data = await res.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(`Places Text Search error: ${data.status} ${data.error_message ?? ""}`);
    }

    results.push(...(data.results ?? []));

    if (!data.next_page_token) break;
    pageToken = data.next_page_token;
    await new Promise((r) => setTimeout(r, 2000));
  }

  return results;
}

async function getPlaceDetails(placeId: string, apiKey: string): Promise<PlaceDetailsResult | null> {
  const url = new URL(PLACES_DETAILS_URL);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "place_id,name,formatted_phone_number,website,address_components");

  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== "OK") return null;
  return data.result ?? null;
}

function findComponent(details: PlaceDetailsResult, type: string) {
  return details.address_components?.find((c) => c.types.includes(type))?.long_name;
}

export type ImportOutcome = {
  imported: number;
  updated: number;
};

/**
 * Searches Google Places for `category` businesses in `zipCode`, keeps only
 * ones meeting the minimum rating/review bar, and upserts them into the
 * directory as unclaimed GOOGLE_IMPORTED listings (deduped by placeId).
 * Never touches a listing once it's been claimed.
 */
export async function importBusinessesForArea(zipCode: string, category: string): Promise<ImportOutcome> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY is not set");
  }

  const results = await textSearch(`${category} near ${zipCode}`, apiKey);
  const outcome: ImportOutcome = { imported: 0, updated: 0 };

  for (const place of results) {
    if (place.business_status && place.business_status !== "OPERATIONAL") continue;
    if ((place.rating ?? 0) < MIN_SOURCE_RATING) continue;
    if ((place.user_ratings_total ?? 0) < MIN_SOURCE_REVIEWS) continue;

    const existing = await prisma.businessProfile.findUnique({ where: { placeId: place.place_id } });
    if (existing?.claimed) continue; // never overwrite a claimed listing

    const details = await getPlaceDetails(place.place_id, apiKey);

    const data = {
      companyName: place.name,
      category,
      description: `${place.name} — found via Google Places, ${(place.rating ?? 0).toFixed(1)} stars from ${place.user_ratings_total ?? 0} Google reviews.`,
      phone: details?.formatted_phone_number ?? existing?.phone ?? undefined,
      website: details?.website ?? existing?.website ?? undefined,
      addressLine: place.formatted_address ?? existing?.addressLine ?? undefined,
      city: (details && findComponent(details, "locality")) ?? existing?.city ?? undefined,
      state: (details && findComponent(details, "administrative_area_level_1")) ?? existing?.state ?? undefined,
      zipCode: (details && findComponent(details, "postal_code")) ?? zipCode,
      source: "GOOGLE_IMPORTED" as const,
      claimed: false,
      placeId: place.place_id,
      sourceRating: place.rating,
      sourceReviewCount: place.user_ratings_total,
      lastSyncedAt: new Date(),
    };

    if (existing) {
      await prisma.businessProfile.update({ where: { id: existing.id }, data });
      outcome.updated++;
    } else {
      await prisma.businessProfile.create({ data });
      outcome.imported++;
    }
  }

  return outcome;
}
