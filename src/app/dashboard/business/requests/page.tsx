import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CATEGORIES } from "@/lib/validation";
import type { Prisma } from "@prisma/client";

export default async function BrowseRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "BUSINESS") redirect("/login");
  if (!user.businessProfile) redirect("/dashboard/business");

  const { category, sort } = await searchParams;
  const myCategory = user.businessProfile.category;
  const myZip = user.businessProfile.zipCode;

  const where: Prisma.RequestWhereInput = { status: "OPEN" };
  if (category) where.category = category;

  const orderBy: Prisma.RequestOrderByWithRelationInput =
    sort === "budget-high"
      ? { budgetMax: "desc" }
      : sort === "budget-low"
        ? { budgetMax: "asc" }
        : { createdAt: "desc" };

  const requests = await prisma.request.findMany({
    where,
    orderBy,
    include: { offers: { where: { businessId: user.businessProfile.id } } },
  });

  const sorted = category
    ? requests
    : [...requests].sort((a, b) => {
        const score = (r: (typeof requests)[number]) =>
          (r.category === myCategory ? 0 : 2) + (r.zipCode === myZip ? 0 : 1);
        return score(a) - score(b);
      });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-stone-900">Open requests</h1>
      <p className="mt-1 text-sm text-stone-600">
        {category
          ? `Showing ${category} requests.`
          : `Requests matching your category (${myCategory}) and area (${myZip}) are shown first.`}
      </p>

      <form method="get" className="mt-6 flex flex-wrap gap-3">
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
        <select
          name="sort"
          defaultValue={sort ?? "newest"}
          className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
        >
          <option value="newest">Newest first</option>
          <option value="budget-high">Highest budget first</option>
          <option value="budget-low">Lowest budget first</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
        >
          Apply
        </button>
        {(category || sort) && (
          <Link
            href="/dashboard/business/requests"
            className="flex items-center text-sm text-stone-500 hover:text-stone-700"
          >
            Clear filters
          </Link>
        )}
      </form>

      {sorted.length === 0 ? (
        <p className="mt-8 text-stone-500">No open requests match these filters right now.</p>
      ) : (
        <div className="mt-8 space-y-3">
          {sorted.map((r) => {
            const alreadyOffered = r.offers.length > 0;
            return (
              <Link
                key={r.id}
                href={`/dashboard/business/requests/${r.id}`}
                className="block rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-stone-400 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-stone-900">{r.title}</h2>
                      {r.category === myCategory && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          Your category
                        </span>
                      )}
                      {r.zipCode === myZip && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Near you
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-stone-500">
                      {r.category} · {r.zipCode} · Budget ${r.budgetMin.toFixed(0)}–${r.budgetMax.toFixed(0)}
                    </p>
                  </div>
                  {alreadyOffered && (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      Offer submitted
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
