import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isStripeConfigured } from "@/lib/stripe";
import Badge from "@/components/Badge";
import SubmitButton from "@/components/SubmitButton";
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
    include: { offer: true, request: true, business: true },
  });

  if (!deal || deal.customerId !== user.id) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href={`/dashboard/customer/requests/${deal.requestId}`}
        className="text-sm text-indigo-600 hover:text-indigo-700"
      >
        ← Back to request
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Deal with {deal.business.companyName}</h1>
        <Badge status={deal.status} />
      </div>

      {(simulated || paid) && (
        <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Payment confirmed{simulated ? " (simulated demo payment)" : ""}. Thanks for using
          DealBridge!
        </p>
      )}

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">{deal.request.title}</h2>
        <p className="mt-1 text-sm text-slate-600">{deal.offer.description}</p>

        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Deal amount</dt>
            <dd className="font-medium text-slate-900">${deal.amount.toFixed(2)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Platform commission ({(deal.commissionRate * 100).toFixed(1)}%)</dt>
            <dd className="font-medium text-slate-900">${deal.commissionAmount.toFixed(2)}</dd>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2">
            <dt className="text-slate-700">Business receives</dt>
            <dd className="font-semibold text-slate-900">
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
              <p className="mt-2 text-center text-xs text-slate-500">
                Demo mode: no Stripe key configured, so this instantly marks the deal as paid.
              </p>
            )}
          </form>
        )}

        {deal.status !== "PENDING_PAYMENT" && (
          <p className="mt-6 text-sm text-slate-600">
            {deal.status === "PAID" && "Payment received. The business will complete the job."}
            {deal.status === "COMPLETED" && "This deal is complete. Thanks for using DealBridge!"}
          </p>
        )}
      </div>
    </div>
  );
}
