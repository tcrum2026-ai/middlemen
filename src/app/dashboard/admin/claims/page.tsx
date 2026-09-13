import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { approveClaimAction, rejectClaimAction } from "@/lib/actions/admin-claims";

export default async function AdminClaimsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const claims = await prisma.claimRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { business: true, user: true },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href="/dashboard/admin" className="text-sm text-stone-600 hover:text-stone-900">
        ← Back to overview
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-stone-900">Claim requests</h1>
      <p className="mt-1 text-sm text-stone-600">
        These requesters&apos; email domains didn&apos;t match the listing&apos;s website, so they
        need a manual check before we hand over the listing.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-stone-900">
        Pending ({claims.length})
      </h2>
      {claims.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">No claim requests waiting on review.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {claims.map((claim) => (
            <div key={claim.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm">
                    <Link
                      href={`/businesses/${claim.businessId}`}
                      className="font-medium text-stone-900 hover:underline"
                    >
                      {claim.business.companyName}
                    </Link>{" "}
                    <span className="text-stone-500">
                      claimed by {claim.user.name} ({claim.user.email}) ·{" "}
                      {claim.createdAt.toLocaleDateString()}
                    </span>
                  </p>
                  {claim.business.website && (
                    <p className="mt-1 text-xs text-stone-500">
                      Listing website: {claim.business.website}
                    </p>
                  )}
                  {claim.note && (
                    <p className="mt-2 rounded-md bg-stone-50 p-2 text-sm text-stone-700">
                      &ldquo;{claim.note}&rdquo;
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <form action={approveClaimAction}>
                    <input type="hidden" name="claimId" value={claim.id} />
                    <button
                      type="submit"
                      className="rounded-md bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-800"
                    >
                      Approve
                    </button>
                  </form>
                  <form action={rejectClaimAction}>
                    <input type="hidden" name="claimId" value={claim.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
