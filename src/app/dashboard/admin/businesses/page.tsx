import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import BusinessListingForm from "@/components/forms/BusinessListingForm";
import {
  addBusinessListingAction,
  deleteBusinessListingAction,
  importBusinessesAction,
} from "@/lib/actions/admin-businesses";
import ImportBusinessesForm from "@/components/forms/ImportBusinessesForm";

export default async function AdminBusinessesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const businesses = await prisma.businessProfile.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href="/dashboard/admin" className="text-sm text-stone-600 hover:text-stone-900">
        ← Back to overview
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-stone-900">Business directory</h1>
      <p className="mt-1 text-sm text-stone-600">
        Businesses don&apos;t need an account to appear here. Add them one at a time or import a
        batch by ZIP code — owners can later find and claim their listing to manage it themselves.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-stone-900">Add one business</h2>
          <div className="mt-4">
            <BusinessListingForm action={addBusinessListingAction} submitLabel="Add to directory" />
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-stone-900">Bulk import (JSON)</h2>
          <p className="mt-1 text-sm text-stone-500">
            Paste an array of businesses, e.g. from research on businesses in a given ZIP code, or
            from a data provider like Google Places / Yelp Fusion.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-md bg-stone-50 p-3 text-xs text-stone-600">
{`[{
  "companyName": "Example Plumbing Co.",
  "category": "Home Services",
  "description": "Licensed plumbers serving...",
  "phone": "555-123-4567",
  "website": "example.com",
  "addressLine": "123 Main St",
  "city": "Springfield",
  "state": "IL",
  "zipCode": "62701"
}]`}
          </pre>
          <div className="mt-4">
            <ImportBusinessesForm action={importBusinessesAction} />
          </div>
        </div>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-stone-900">
        All listings ({businesses.length})
      </h2>
      <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-stone-200 text-sm">
          <thead className="bg-stone-50 text-left text-xs font-semibold uppercase text-stone-500">
            <tr>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">ZIP</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {businesses.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-3 font-medium text-stone-900">
                  <Link href={`/businesses/${b.id}`} className="hover:text-stone-900">
                    {b.companyName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-stone-600">{b.category}</td>
                <td className="px-4 py-3 text-stone-600">{b.zipCode}</td>
                <td className="px-4 py-3 text-stone-600">
                  {b.claimed ? "Claimed" : "Unclaimed"}
                </td>
                <td className="px-4 py-3 text-right">
                  {!b.claimed && (
                    <form action={deleteBusinessListingAction}>
                      <input type="hidden" name="businessId" value={b.id} />
                      <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
                        Delete
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
