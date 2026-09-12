import Link from "next/link";
import { prisma } from "@/lib/db";
import { getBusinessRatingSummaries } from "@/lib/ratings";
import StarRating from "@/components/StarRating";
import { CATEGORIES } from "@/lib/validation";
import type { Prisma } from "@prisma/client";

export const metadata = { title: "Find a local business" };

export default async function BusinessDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ zip?: string; category?: string }>;
}) {
  const { zip, category } = await searchParams;

  const where: Prisma.BusinessProfileWhereInput = {};
  if (zip) where.zipCode = zip.trim();
  if (category) where.category = category;

  const businesses = await prisma.businessProfile.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  const ratingSummaries = await getBusinessRatingSummaries(businesses.map((b) => b.id));

  const sorted = [...businesses].sort(
    (a, b) => (ratingSummaries.get(b.id)?.sortScore ?? 0) - (ratingSummaries.get(a.id)?.sortScore ?? 0)
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-stone-900">Find a local business</h1>
      <p className="mt-1 text-sm text-stone-600">
        Browse every business in the directory — no account required. Businesses are ranked by
        real customer reviews. Some listings are sourced from{" "}
        <a
          href="https://www.google.com/maps"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Google Places
        </a>
        .
      </p>

      <form method="get" className="mt-6 flex flex-wrap gap-3">
        <input
          type="text"
          name="zip"
          defaultValue={zip}
          placeholder="ZIP code"
          className="w-32 rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
        />
        <select
          name="category"
          defaultValue={category ?? ""}
          className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
        >
          Search
        </button>
        {(zip || category) && (
          <Link href="/businesses" className="flex items-center text-sm text-stone-500 hover:text-stone-700">
            Clear
          </Link>
        )}
      </form>

      {sorted.length === 0 ? (
        <p className="mt-10 text-stone-500">
          No businesses match yet{zip ? ` in ${zip}` : ""}
          {category ? ` for ${category}` : ""}.
        </p>
      ) : (
        <div className="mt-8 space-y-3">
          {sorted.map((b) => {
            const summary = ratingSummaries.get(b.id);
            return (
              <Link
                key={b.id}
                href={`/businesses/${b.id}`}
                className="block rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-stone-400 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-stone-900">{b.companyName}</h2>
                      {!b.claimed && (
                        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500">
                          Unclaimed
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-stone-500">
                      {b.category} · {[b.city, b.state, b.zipCode].filter(Boolean).join(", ")}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm text-stone-600">{b.description}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <StarRating rating={summary?.displayRating ?? null} reviewCount={summary?.reviewCount ?? 0} />
                    {b.source === "GOOGLE_IMPORTED" && b.sourceRating != null && (
                      <p className="mt-1 text-xs text-stone-400">{b.sourceRating.toFixed(1)}★ on Google</p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
