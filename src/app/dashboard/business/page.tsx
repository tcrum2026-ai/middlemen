import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import BusinessProfileForm from "@/components/forms/BusinessProfileForm";
import Badge from "@/components/Badge";
import { markDealCompletedAction } from "@/lib/actions/deals";
import SubmitButton from "@/components/SubmitButton";

export default async function BusinessDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "BUSINESS") redirect("/login");

  const profile = user.businessProfile;

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">Set up your business profile</h1>
        <p className="mt-1 text-sm text-slate-600">
          Customers will see this when reviewing your offers.
        </p>
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <BusinessProfileForm />
        </div>
      </div>
    );
  }

  const [openRequestsCount, offers, deals] = await Promise.all([
    prisma.request.count({ where: { status: "OPEN", category: profile.category } }),
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
  ]);

  const totalEarned = deals
    .filter((d) => d.status === "COMPLETED" || d.status === "PAID")
    .reduce((sum, d) => sum + (d.amount - d.commissionAmount), 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{profile.companyName}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {profile.category} · ⭐ {profile.rating.toFixed(1)}
          </p>
        </div>
        <Link
          href="/dashboard/business/requests"
          className="rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700"
        >
          Browse open requests
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Open requests in your category" value={openRequestsCount.toString()} />
        <StatCard label="Offers submitted" value={offers.length.toString()} />
        <StatCard label="Net earnings (after commission)" value={`$${totalEarned.toFixed(2)}`} />
      </div>

      <h2 className="mt-10 text-lg font-semibold text-slate-900">Your deals</h2>
      {deals.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No won deals yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {deals.map((deal) => (
            <div key={deal.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-slate-900">{deal.request.title}</p>
                  <p className="text-sm text-slate-500">
                    ${deal.amount.toFixed(2)} · you receive $
                    {(deal.amount - deal.commissionAmount).toFixed(2)} after commission
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge status={deal.status} />
                  {deal.status === "PAID" && (
                    <form action={markDealCompletedAction}>
                      <input type="hidden" name="dealId" value={deal.id} />
                      <SubmitButton
                        pendingText="Updating..."
                        className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                      >
                        Mark completed
                      </SubmitButton>
                    </form>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="mt-10 text-lg font-semibold text-slate-900">Your offers</h2>
      {offers.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          You haven&apos;t submitted any offers yet.{" "}
          <Link href="/dashboard/business/requests" className="text-indigo-600 hover:text-indigo-700">
            Browse open requests →
          </Link>
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {offers.map((offer) => (
            <Link
              key={offer.id}
              href={`/dashboard/business/requests/${offer.requestId}`}
              className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-300"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-slate-900">{offer.request.title}</p>
                  <p className="text-sm text-slate-500">
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

      <details className="mt-10 rounded-xl border border-slate-200 bg-white p-6">
        <summary className="cursor-pointer font-semibold text-slate-900">Edit business profile</summary>
        <div className="mt-4">
          <BusinessProfileForm
            initial={{
              companyName: profile.companyName,
              category: profile.category,
              description: profile.description,
            }}
          />
        </div>
      </details>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
