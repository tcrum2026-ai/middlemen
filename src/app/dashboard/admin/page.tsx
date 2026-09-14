import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Badge from "@/components/Badge";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const [userCount, businessCount, requestCount, offerCount, deals, pendingClaimCount, openDisputeCount] =
    await Promise.all([
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.user.count({ where: { role: "BUSINESS" } }),
      prisma.request.count(),
      prisma.offer.count(),
      prisma.deal.findMany({
        orderBy: { createdAt: "desc" },
        include: { request: true, business: true, customer: true },
      }),
      prisma.claimRequest.count({ where: { status: "PENDING" } }),
      prisma.dealFlag.count({ where: { status: "OPEN" } }),
    ]);

  const totalCommission = deals
    .filter((d) => d.status === "PAID" || d.status === "COMPLETED")
    .reduce((sum, d) => sum + d.commissionAmount, 0);
  const totalVolume = deals
    .filter((d) => d.status === "PAID" || d.status === "COMPLETED")
    .reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">Platform overview</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/admin/disputes"
            className="relative rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            Reported issues
            {openDisputeCount > 0 && (
              <span className="ml-2 rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">
                {openDisputeCount}
              </span>
            )}
          </Link>
          <Link
            href="/dashboard/admin/claims"
            className="relative rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            Claim requests
            {pendingClaimCount > 0 && (
              <span className="ml-2 rounded-full bg-amber-500 px-1.5 py-0.5 text-xs font-bold text-white">
                {pendingClaimCount}
              </span>
            )}
          </Link>
          <Link
            href="/dashboard/admin/reviews"
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            Reviews
          </Link>
          <Link
            href="/dashboard/admin/import"
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            Background import
          </Link>
          <Link
            href="/dashboard/admin/businesses"
            className="rounded-md bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
          >
            Manage business directory
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Customers" value={userCount.toString()} />
        <StatCard label="Businesses" value={businessCount.toString()} />
        <StatCard label="Requests posted" value={requestCount.toString()} />
        <StatCard label="Offers submitted" value={offerCount.toString()} />
        <StatCard label="Gross deal volume" value={`$${totalVolume.toFixed(2)}`} />
        <StatCard label="Commission revenue" value={`$${totalCommission.toFixed(2)}`} highlight />
      </div>

      <h2 className="mt-10 text-lg font-semibold text-stone-900">All deals</h2>
      {deals.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">No deals yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-stone-200 text-sm">
            <thead className="bg-stone-50 text-left text-xs font-semibold uppercase text-stone-500">
              <tr>
                <th className="px-4 py-3">Request</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Commission</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {deals.map((deal) => (
                <tr key={deal.id}>
                  <td className="px-4 py-3 font-medium text-stone-900">{deal.request.title}</td>
                  <td className="px-4 py-3 text-stone-600">{deal.customer.name}</td>
                  <td className="px-4 py-3 text-stone-600">{deal.business.companyName}</td>
                  <td className="px-4 py-3 text-stone-600">${deal.amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-stone-600">${deal.commissionAmount.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <Badge status={deal.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-5 shadow-sm ${
        highlight ? "border-amber-300 bg-amber-50" : "border-stone-200 bg-white"
      }`}
    >
      <p className="text-sm text-stone-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${highlight ? "text-amber-800" : "text-stone-900"}`}>
        {value}
      </p>
    </div>
  );
}
