import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function BrowseRequestsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "BUSINESS") redirect("/login");
  if (!user.businessProfile) redirect("/dashboard/business");

  const requests = await prisma.request.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    include: { offers: { where: { businessId: user.businessProfile.id } } },
  });

  const myCategory = user.businessProfile.category;
  const sorted = [...requests].sort((a, b) => {
    const aMatch = a.category === myCategory ? 0 : 1;
    const bMatch = b.category === myCategory ? 0 : 1;
    return aMatch - bMatch;
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Open requests</h1>
      <p className="mt-1 text-sm text-slate-600">
        Requests matching your category ({myCategory}) are shown first.
      </p>

      {sorted.length === 0 ? (
        <p className="mt-8 text-slate-500">No open requests right now — check back soon.</p>
      ) : (
        <div className="mt-8 space-y-3">
          {sorted.map((r) => {
            const alreadyOffered = r.offers.length > 0;
            return (
              <Link
                key={r.id}
                href={`/dashboard/business/requests/${r.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-slate-900">{r.title}</h2>
                      {r.category === myCategory && (
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                          Your category
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {r.category} · Budget ${r.budgetMin.toFixed(0)}–${r.budgetMax.toFixed(0)}
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
