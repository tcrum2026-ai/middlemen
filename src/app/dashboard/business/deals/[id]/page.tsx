import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Badge from "@/components/Badge";
import SubmitButton from "@/components/SubmitButton";
import MessageThread from "@/components/MessageThread";
import { markDealCompletedAction } from "@/lib/actions/deals";

export default async function BusinessDealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "BUSINESS") redirect("/login");
  if (!user.businessProfile) redirect("/dashboard/business");

  const { id } = await params;
  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      offer: true,
      request: true,
      customer: true,
      review: true,
      messages: { orderBy: { createdAt: "asc" }, include: { sender: true } },
    },
  });

  if (!deal || deal.businessId !== user.businessProfile.id) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href="/dashboard/business" className="text-sm text-stone-600 hover:text-stone-900">
        ← Back to dashboard
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">Deal with {deal.customer.name}</h1>
        <Badge status={deal.status} />
      </div>

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
            <dd className="font-medium text-stone-900">-${deal.commissionAmount.toFixed(2)}</dd>
          </div>
          <div className="flex justify-between border-t border-stone-200 pt-2">
            <dt className="text-stone-700">You receive</dt>
            <dd className="font-semibold text-stone-900">
              ${(deal.amount - deal.commissionAmount).toFixed(2)}
            </dd>
          </div>
        </dl>

        {deal.status === "PENDING_PAYMENT" && (
          <p className="mt-6 text-sm text-stone-500">Waiting for the customer to pay.</p>
        )}
        {deal.status === "PAID" && (
          <form action={markDealCompletedAction} className="mt-6">
            <input type="hidden" name="dealId" value={deal.id} />
            <SubmitButton pendingText="Updating...">Mark job completed</SubmitButton>
          </form>
        )}
        {deal.status === "COMPLETED" && (
          <p className="mt-6 text-sm text-stone-600">
            This deal is complete.{" "}
            {deal.review
              ? "The customer left a review below."
              : "The customer hasn't left a review yet."}
          </p>
        )}
      </div>

      {deal.review && (
        <div className="mt-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-stone-900">Customer review</h2>
          <p className="mt-2 text-amber-600">
            {"★".repeat(deal.review.rating)}
            {"☆".repeat(5 - deal.review.rating)}
          </p>
          <p className="mt-2 text-sm text-stone-600">{deal.review.comment}</p>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <MessageThread dealId={deal.id} messages={deal.messages} currentUserId={user.id} />
      </div>
    </div>
  );
}
