import Link from "next/link";
import { prisma } from "@/lib/db";
import { getBusinessRatingSummaries } from "@/lib/ratings";
import StarRating from "@/components/StarRating";
import { CATEGORIES } from "@/lib/validation";
import type { Prisma } from "@prisma/client";

export const metadata = { title: "Find a local business" };

const PAGE_SIZE = 20;
const MAX_RANKED = 300;

export default async function BusinessDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ zip?: string; category?: string; q?: string; page?: string }>;
}) {
  const { zip, category, q, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const where: Prisma.BusinessProfileWhereInput = {};
  if (zip) where.zipCode = zip.trim();
  if (category) where.category = category;
  if (q) {
    where.OR = [
      { companyName: { contains: q.trim(), mode: "insensitive" } },
      { description: { contains: q.trim(), mode: "insensitive" } },
    ];
  }

  const [totalCount, businesses] = await Promise.all([
    prisma.businessProfile.count({ where }),
    prisma.businessProfile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: MAX_RANKED,
    }),
  ]);

  const ratingSummaries = await getBusinessRatingSummaries(businesses.map((b) => b.id));

  const ranked = [...businesses].sort(
    (a, b) => (ratingSummaries.get(b.id)?.sortScore ?? 0) - (ratingSummaries.get(a.id)?.sortScore ?? 0)
  );

  const totalPages = Math.max(1, Math.ceil(Math.min(totalCount, MAX_RANKED) / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const sorted = ranked.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (zip) params.set("zip", zip);
    if (category) params.set("category", category);
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/businesses?${qs}` : "/businesses";
  };

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
          name="q"
          defaultValue={q}
          placeholder="Search by name or description"
          className="w-64 rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
        />
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
        {(zip || category || q) && (
          <Link href="/businesses" className="flex items-center text-sm text-stone-500 hover:text-stone-700">
            Clear
          </Link>
        )}
      </form>

      {sorted.length === 0 ? (
        <p className="mt-10 text-stone-500">
          No businesses match yet{q ? ` for "${q}"` : ""}
          {zip ? ` in ${zip}` : ""}
          {category ? ` for ${category}` : ""}.
        </p>
      ) : (
        <>
        <p className="mt-8 text-sm text-stone-500">
          {totalCount} business{totalCount === 1 ? "" : "es"} found
          {totalPages > 1 ? ` · page ${currentPage} of ${totalPages}` : ""}
        </p>
        <div className="mt-4 space-y-3">
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
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Link
              href={pageHref(currentPage - 1)}
              aria-disabled={currentPage === 1}
              className={`rounded-md border border-stone-300 px-3 py-1.5 text-sm ${
                currentPage === 1
                  ? "pointer-events-none opacity-40"
                  : "text-stone-700 hover:bg-stone-50"
              }`}
            >
              ← Previous
            </Link>
            <span className="text-sm text-stone-500">
              Page {currentPage} of {totalPages}
            </span>
            <Link
              href={pageHref(currentPage + 1)}
              aria-disabled={currentPage === totalPages}
              className={`rounded-md border border-stone-300 px-3 py-1.5 text-sm ${
                currentPage === totalPages
                  ? "pointer-events-none opacity-40"
                  : "text-stone-700 hover:bg-stone-50"
              }`}
            >
              Next →
            </Link>
          </div>
        )}
        </>
      )}
    </div>
  );
}
