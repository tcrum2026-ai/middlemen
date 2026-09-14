import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveDealFlagAction } from "@/lib/actions/deal-flags";

export default async function AdminDisputesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const flags = await prisma.dealFlag.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "asc" },
    include: {
      reporter: true,
      deal: { include: { request: true, customer: true, business: true } },
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href="/dashboard/admin" className="text-sm text-stone-600 hover:text-stone-900">
        ← Back to overview
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-stone-900">Reported issues</h1>
      <p className="mt-1 text-sm text-stone-600">
        Either party on a paid deal can report a problem here. Resolving a report emails the
        reporter with your note.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-stone-900">Open ({flags.length})</h2>
      {flags.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">No open reports.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {flags.map((flag) => (
            <div key={flag.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <p className="text-sm">
                <span className="font-medium text-stone-900">{flag.deal.request.title}</span>{" "}
                <span className="text-stone-500">
                  · {flag.deal.customer.name} ↔ {flag.deal.business.companyName} · reported by{" "}
                  {flag.reporter.name} · {flag.createdAt.toLocaleDateString()}
                </span>
              </p>
              <p className="mt-2 rounded-md bg-stone-50 p-2 text-sm text-stone-700">{flag.reason}</p>
              <form action={resolveDealFlagAction} className="mt-3 flex flex-wrap items-end gap-2">
                <input type="hidden" name="flagId" value={flag.id} />
                <div className="flex-1">
                  <label htmlFor={`note-${flag.id}`} className="block text-xs font-medium text-stone-600">
                    Resolution note (emailed to reporter)
                  </label>
                  <input
                    id={`note-${flag.id}`}
                    name="resolutionNote"
                    type="text"
                    placeholder="e.g. Refunded via Stripe, business followed up directly, etc."
                    className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-md bg-stone-900 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-800"
                >
                  Mark resolved
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
