import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteReviewAction } from "@/lib/actions/admin-reviews";

export default async function AdminReviewsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { business: true, customer: true },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href="/dashboard/admin" className="text-sm text-stone-600 hover:text-stone-900">
        ← Back to overview
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-stone-900">Review moderation</h1>
      <p className="mt-1 text-sm text-stone-600">
        Remove fraudulent or abusive reviews. Deleting a review recalculates that business&apos;s
        rating immediately.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-stone-900">
        All reviews ({reviews.length})
      </h2>
      {reviews.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">No reviews yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-stone-500">
                    <Link href={`/businesses/${review.businessId}`} className="font-medium text-stone-900 hover:underline">
                      {review.business.companyName}
                    </Link>{" "}
                    · reviewed by {review.customer.name} · {review.createdAt.toLocaleDateString()}
                  </p>
                  <p className="mt-1 text-amber-600">
                    {"★".repeat(review.rating)}
                    {"☆".repeat(5 - review.rating)}
                  </p>
                  <p className="mt-2 text-sm text-stone-700">{review.comment}</p>
                </div>
                <form action={deleteReviewAction}>
                  <input type="hidden" name="reviewId" value={review.id} />
                  <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
