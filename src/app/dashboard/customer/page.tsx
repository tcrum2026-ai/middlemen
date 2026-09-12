import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Badge from "@/components/Badge";

export default async function CustomerDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER") redirect("/login");

  const requests = await prisma.request.findMany({
    where: { customerId: user.id },
    orderBy: { createdAt: "desc" },
    include: { offers: true },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Your requests</h1>
          <p className="mt-1 text-sm text-stone-600">
            Track offers coming in and let AI find your best deal.
          </p>
        </div>
        <Link
          href="/dashboard/customer/new"
          className="rounded-md bg-stone-900 px-4 py-2 font-semibold text-white hover:bg-stone-800"
        >
          + New request
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center">
          <p className="text-stone-600">You haven&apos;t posted a request yet.</p>
          <Link
            href="/dashboard/customer/new"
            className="mt-4 inline-block font-semibold text-stone-900 underline hover:text-stone-600"
          >
            Post your first request →
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {requests.map((r) => (
            <Link
              key={r.id}
              href={`/dashboard/customer/requests/${r.id}`}
              className="block rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-stone-400 hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-stone-900">{r.title}</h2>
                  <p className="mt-1 text-sm text-stone-500">
                    {r.category} · Budget ${r.budgetMin.toFixed(0)}–${r.budgetMax.toFixed(0)} ·{" "}
                    {r.offers.length} offer{r.offers.length === 1 ? "" : "s"}
                  </p>
                </div>
                <Badge status={r.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
