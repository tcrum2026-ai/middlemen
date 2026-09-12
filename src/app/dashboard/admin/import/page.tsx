import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isGooglePlacesConfigured, MIN_SOURCE_RATING, MIN_SOURCE_REVIEWS } from "@/lib/importers/googlePlaces";
import { runImportBatchNowAction } from "@/lib/actions/import";
import EnqueueImportForm from "@/components/forms/EnqueueImportForm";
import SubmitButton from "@/components/SubmitButton";

export default async function AdminImportPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const configured = isGooglePlacesConfigured();

  const [pending, done, failed, recent] = await Promise.all([
    prisma.importQueueItem.count({ where: { status: "PENDING" } }),
    prisma.importQueueItem.count({ where: { status: "DONE" } }),
    prisma.importQueueItem.count({ where: { status: "FAILED" } }),
    prisma.importQueueItem.findMany({ orderBy: { createdAt: "desc" }, take: 25 }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href="/dashboard/admin" className="text-sm text-stone-600 hover:text-stone-900">
        ← Back to overview
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-stone-900">Background business import</h1>
      <p className="mt-1 max-w-2xl text-sm text-stone-600">
        Queue ZIP codes and a category, and a background job pulls in real businesses from Google
        Places that clear {MIN_SOURCE_RATING.toFixed(1)}+ stars and {MIN_SOURCE_REVIEWS}+ reviews —
        skipping anything already claimed. It runs automatically every 15 minutes and works through
        a few areas per run.
      </p>

      {!configured && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Not active yet.</strong> Add a <code className="font-mono">GOOGLE_PLACES_API_KEY</code>{" "}
          environment variable in your Netlify site settings to turn this on. Nothing runs (and no API
          costs are incurred) until that key is set.
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Pending" value={pending.toString()} />
        <StatCard label="Imported" value={done.toString()} />
        <StatCard label="Failed" value={failed.toString()} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-stone-900">Queue new areas</h2>
          <div className="mt-4">
            <EnqueueImportForm />
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-stone-900">Run a batch now</h2>
          <p className="mt-1 text-sm text-stone-500">
            Skip the wait and process the next few pending items immediately — useful for testing.
          </p>
          <form action={runImportBatchNowAction} className="mt-4">
            <SubmitButton
              pendingText="Running..."
              className="rounded-md bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-60"
            >
              Run next batch now
            </SubmitButton>
          </form>
        </div>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-stone-900">Recent queue activity</h2>
      {recent.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">Nothing queued yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-stone-200 text-sm">
            <thead className="bg-stone-50 text-left text-xs font-semibold uppercase text-stone-500">
              <tr>
                <th className="px-4 py-3">ZIP</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {recent.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium text-stone-900">{item.zipCode}</td>
                  <td className="px-4 py-3 text-stone-600">{item.category}</td>
                  <td className="px-4 py-3 text-stone-600">{item.status}</td>
                  <td className="px-4 py-3 text-stone-600">
                    {item.status === "DONE" && `${item.resultCount ?? 0} businesses`}
                    {item.status === "FAILED" && (
                      <span className="text-red-600">{item.errorMessage}</span>
                    )}
                    {item.status === "PENDING" && "—"}
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-stone-900">{value}</p>
    </div>
  );
}
