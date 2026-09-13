import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getBusinessRatingSummary, MIN_REVIEWS_TO_DISPLAY } from "@/lib/ratings";
import BusinessListingForm from "@/components/forms/BusinessListingForm";
import ClaimButton from "@/components/forms/ClaimButton";
import { createOwnListingAction, saveBusinessProfileAction } from "@/lib/actions/business";
import Badge from "@/components/Badge";

export default async function BusinessDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "BUSINESS") redirect("/login");

  const profile = user.businessProfile;

  if (!profile) {
    const pendingClaim = await prisma.claimRequest.findFirst({
      where: { userId: user.id, status: "PENDING" },
      include: { business: true },
    });

    if (pendingClaim) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
          <h1 className="text-2xl font-bold text-stone-900">Claim pending review</h1>
          <p className="mt-2 text-sm text-stone-600">
            Your request to claim <strong>{pendingClaim.business.companyName}</strong> is awaiting
            admin review. We&apos;ll email you at {user.email} once it&apos;s decided.
          </p>
        </div>
      );
    }

    const { q } = await searchParams;
    const matches = q
      ? await prisma.businessProfile.findMany({
          where: {
            claimed: false,
            companyName: { contains: q, mode: "insensitive" },
          },
          take: 10,
        })
      : [];

    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-stone-900">Is your business already listed?</h1>
        <p className="mt-1 text-sm text-stone-600">
          We add businesses to the directory even before they sign up. Search for yours to claim
          it — or create a new listing if you can&apos;t find it.
        </p>

        <form method="get" className="mt-6 flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by company name"
            className="flex-1 rounded-md border border-stone-300 px-3 py-2 focus:border-stone-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-md bg-stone-900 px-4 py-2 font-semibold text-white hover:bg-stone-800"
          >
            Search
          </button>
        </form>

        {q && (
          <div className="mt-4 space-y-3">
            {matches.length === 0 ? (
              <p className="text-sm text-stone-500">No unclaimed listing found for &quot;{q}&quot;.</p>
            ) : (
              matches.map((m) => (
                <div key={m.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-stone-900">{m.companyName}</p>
                      <p className="text-sm text-stone-500">
                        {m.category} · {[m.city, m.state, m.zipCode].filter(Boolean).join(", ")}
                      </p>
                    </div>
                    <ClaimButton businessId={m.id} />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <details className="mt-8 rounded-xl border border-stone-200 bg-white p-6">
          <summary className="cursor-pointer font-semibold text-stone-900">
            Can&apos;t find your business? Create a new listing
          </summary>
          <div className="mt-4">
            <BusinessListingForm action={createOwnListingAction} submitLabel="Create listing" />
          </div>
        </details>
      </div>
    );
  }

  const [openRequestsCount, offers, deals, reviews, ratingSummary] = await Promise.all([
    prisma.request.count({ where: { status: "OPEN", category: profile.category, zipCode: profile.zipCode } }),
    prisma.offer.findMany({
      where: { businessId: profile.id },
      orderBy: { createdAt: "desc" },
      include: { request: true },
    }),
    prisma.deal.findMany({
      where: { businessId: profile.id },
      orderBy: { createdAt: "desc" },
      include: { request: true },
    }),
    prisma.review.findMany({
      where: { businessId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { customer: true },
    }),
    getBusinessRatingSummary(profile.id),
  ]);

  const totalEarned = deals
    .filter((d) => d.status === "COMPLETED" || d.status === "PAID")
    .reduce((sum, d) => sum + (d.amount - d.commissionAmount), 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">{profile.companyName}</h1>
          <p className="mt-1 text-sm text-stone-500">
            {profile.category} ·{" "}
            {ratingSummary.displayRating != null
              ? `⭐ ${ratingSummary.displayRating.toFixed(1)} (${ratingSummary.reviewCount} review${
                  ratingSummary.reviewCount === 1 ? "" : "s"
                })`
              : `New — ${ratingSummary.reviewCount}/${MIN_REVIEWS_TO_DISPLAY} reviews needed to show a rating`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/businesses/${profile.id}`}
            className="rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            View public page
          </Link>
          <Link
            href="/dashboard/business/requests"
            className="rounded-md bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
          >
            Browse open requests
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Open requests near you" value={openRequestsCount.toString()} />
        <StatCard label="Offers submitted" value={offers.length.toString()} />
        <StatCard label="Net earnings (after commission)" value={`$${totalEarned.toFixed(2)}`} />
      </div>

      <h2 className="mt-10 text-lg font-semibold text-stone-900">Your deals</h2>
      {deals.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">No won deals yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {deals.map((deal) => (
            <Link
              key={deal.id}
              href={`/dashboard/business/deals/${deal.id}`}
              className="block rounded-xl border border-stone-200 bg-white p-4 shadow-sm hover:border-stone-400"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-stone-900">{deal.request.title}</p>
                  <p className="text-sm text-stone-500">
                    ${deal.amount.toFixed(2)} · you receive $
                    {(deal.amount - deal.commissionAmount).toFixed(2)} after commission
                  </p>
                </div>
                <Badge status={deal.status} />
              </div>
            </Link>
          ))}
        </div>
      )}

      <h2 className="mt-10 text-lg font-semibold text-stone-900">Reviews</h2>
      {reviews.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">
          No reviews yet — customers can review you directly from your public page, or after a
          completed deal.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium text-stone-900">{review.customer.name}</p>
                <p className="text-sm text-amber-600">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p>
              </div>
              <p className="mt-2 text-sm text-stone-600">{review.comment}</p>
            </div>
          ))}
        </div>
      )}

      <h2 className="mt-10 text-lg font-semibold text-stone-900">Your offers</h2>
      {offers.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">
          You haven&apos;t submitted any offers yet.{" "}
          <Link href="/dashboard/business/requests" className="text-stone-900 underline">
            Browse open requests →
          </Link>
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {offers.map((offer) => (
            <Link
              key={offer.id}
              href={`/dashboard/business/requests/${offer.requestId}`}
              className="block rounded-xl border border-stone-200 bg-white p-4 shadow-sm hover:border-stone-400"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-stone-900">{offer.request.title}</p>
                  <p className="text-sm text-stone-500">
                    Your offer: ${offer.price.toFixed(0)} · {offer.deliveryDays}-day delivery
                    {offer.aiScore != null && ` · AI score ${Math.round(offer.aiScore)}/100`}
                  </p>
                </div>
                <Badge status={offer.status} />
              </div>
            </Link>
          ))}
        </div>
      )}

      <details className="mt-10 rounded-xl border border-stone-200 bg-white p-6">
        <summary className="cursor-pointer font-semibold text-stone-900">Edit business listing</summary>
        <div className="mt-4">
          <BusinessListingForm
            action={saveBusinessProfileAction}
            initial={{
              companyName: profile.companyName,
              category: profile.category,
              description: profile.description,
              phone: profile.phone ?? "",
              website: profile.website ?? "",
              hours: profile.hours ?? "",
              addressLine: profile.addressLine ?? "",
              city: profile.city ?? "",
              state: profile.state ?? "",
              zipCode: profile.zipCode,
            }}
          />
        </div>
      </details>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-stone-900">{value}</p>
    </div>
  );
}
