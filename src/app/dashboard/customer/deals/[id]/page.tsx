import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isStripeConfigured } from "@/lib/stripe";
import Badge from "@/components/Badge";
import SubmitButton from "@/components/SubmitButton";
import MessageThread from "@/components/MessageThread";
import ReviewForm from "@/components/forms/ReviewForm";
import { payDealAction } from "@/lib/actions/deals";

export default async function CustomerDealPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ simulated?: string; paid?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER") redirect("/login");

  const { id } = await params;
  const { simulated, paid } = await searchParams;

  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      offer: true,
      request: true,
      business: true,
      review: true,
      messages: { orderBy: { createdAt: "asc" }, include: { sender: true } },
    },
  });

  if (!deal || deal.customerId !== user.id) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href={`/dashboard/customer/requests/${deal.requestId}`}
        className="text-sm text-stone-600 hover:text-stone-900"
      >
        ← Back to request
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">Deal with {deal.business.companyName}</h1>
        <Badge status={deal.status} />
      </div>

      {(simulated || paid) && (
        <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Payment confirmed{simulated ? " (simulated demo payment)" : ""}. Thanks for using
          DealBridge!
        </p>
      )}

      <div className="mt-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-stone-900">{deal.request.title}</h2>
        <p className="mt-1 text-sm text-stone-600">{deal.offer.description}</p>

        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-stone-500">Deal amount</dt>
            <dd className="font-medium text-stone-900">${deal.amount.toFixed(2)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-stone-500">Platform commission ({(deal.commissionRate * 100).toFixed(1)}%)</dt>
            <dd className="font-medium text-stone-900">${deal.commissionAmount.toFixed(2)}</dd>
          </div>
          <div className="flex justify-between border-t border-stone-200 pt-2">
            <dt className="text-stone-700">Business receives</dt>
            <dd className="font-semibold text-stone-900">
              ${(deal.amount - deal.commissionAmount).toFixed(2)}
            </dd>
          </div>
        </dl>

        {deal.status === "PENDING_PAYMENT" && (
          <form action={payDealAction} className="mt-6">
            <input type="hidden" name="dealId" value={deal.id} />
            <SubmitButton pendingText="Processing...">
              {isStripeConfigured() ? `Pay $${deal.amount.toFixed(2)}` : `Simulate payment of $${deal.amount.toFixed(2)}`}
            </SubmitButton>
            {!isStripeConfigured() && (
              <p className="mt-2 text-center text-xs text-stone-500">
                Demo mode: no Stripe key configured, so this instantly marks the deal as paid.
              </p>
            )}
          </form>
        )}

        {deal.status !== "PENDING_PAYMENT" && (
          <p className="mt-6 text-sm text-stone-600">
            {deal.status === "PAID" && "Payment received. The business will complete the job."}
            {deal.status === "COMPLETED" && "This deal is complete. Thanks for using DealBridge!"}
          </p>
        )}
      </div>

      {deal.status === "COMPLETED" && (
        <div className="mt-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          {deal.review ? (
            <div>
              <h2 className="font-semibold text-stone-900">Your review</h2>
              <p className="mt-2 text-amber-600">
                {"★".repeat(deal.review.rating)}
                {"☆".repeat(5 - deal.review.rating)}
              </p>
              <p className="mt-2 text-sm text-stone-600">{deal.review.comment}</p>
            </div>
          ) : (
            <div>
              <h2 className="font-semibold text-stone-900">Rate {deal.business.companyName}</h2>
              <p className="mt-1 text-sm text-stone-500">
                Your feedback helps other customers pick the best business.
              </p>
              <div className="mt-4">
                <ReviewForm businessId={deal.businessId} dealId={deal.id} />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <MessageThread dealId={deal.id} messages={deal.messages} currentUserId={user.id} />
      </div>
    </div>
  );
}
