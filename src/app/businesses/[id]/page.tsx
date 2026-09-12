import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getBusinessRatingSummary } from "@/lib/ratings";
import StarRating from "@/components/StarRating";
import ReviewForm from "@/components/forms/ReviewForm";
import ClaimButton from "@/components/forms/ClaimButton";

export default async function BusinessProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [business, user] = await Promise.all([
    prisma.businessProfile.findUnique({
      where: { id },
      include: { reviews: { orderBy: { createdAt: "desc" }, include: { customer: true } } },
    }),
    getCurrentUser(),
  ]);

  if (!business) notFound();

  const summary = await getBusinessRatingSummary(business.id);
  const myReview = user ? business.reviews.find((r) => r.customerId === user.id) : undefined;
  const canClaim = !business.claimed && user?.role === "BUSINESS" && !user.businessProfile;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/businesses" className="text-sm text-stone-500 hover:text-stone-700">
        ← Back to directory
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">{business.companyName}</h1>
          <p className="mt-1 text-sm text-stone-500">
            {business.category} · {[business.city, business.state, business.zipCode].filter(Boolean).join(", ")}
          </p>
          <div className="mt-2">
            <StarRating rating={summary.displayRating} reviewCount={summary.reviewCount} size="md" />
          </div>
        </div>
        {!business.claimed && (
          <span className="shrink-0 rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-500">
            Unclaimed listing
          </span>
        )}
      </div>

      <p className="mt-4 whitespace-pre-wrap text-stone-700">{business.description}</p>

      <dl className="mt-6 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        {business.phone && (
          <div>
            <dt className="text-stone-500">Phone</dt>
            <dd className="font-medium text-stone-900">{business.phone}</dd>
          </div>
        )}
        {business.website && (
          <div>
            <dt className="text-stone-500">Website</dt>
            <dd className="font-medium text-stone-900">{business.website}</dd>
          </div>
        )}
        {business.addressLine && (
          <div>
            <dt className="text-stone-500">Address</dt>
            <dd className="font-medium text-stone-900">{business.addressLine}</dd>
          </div>
        )}
      </dl>

      {canClaim && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">Is this your business?</p>
          <div className="mt-2">
            <ClaimButton businessId={business.id} />
          </div>
        </div>
      )}

      <h2 className="mt-10 text-lg font-semibold text-stone-900">
        Reviews ({business.reviews.length})
      </h2>

      {!user && (
        <p className="mt-3 text-sm text-stone-500">
          <Link href="/login" className="text-stone-900 underline">
            Log in
          </Link>{" "}
          to write a review.
        </p>
      )}

      {user?.role === "CUSTOMER" && !myReview && (
        <div className="mt-4 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-stone-900">Write a review</h3>
          <div className="mt-4">
            <ReviewForm businessId={business.id} />
          </div>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {business.reviews.length === 0 ? (
          <p className="text-sm text-stone-500">No reviews yet.</p>
        ) : (
          business.reviews.map((review) => (
            <div key={review.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium text-stone-900">{review.customer.name}</p>
                <p className="text-amber-600">
                  {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </p>
              </div>
              <p className="mt-2 text-sm text-stone-600">{review.comment}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
