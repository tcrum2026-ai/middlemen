import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Badge from "@/components/Badge";
import NewOfferForm from "@/components/forms/NewOfferForm";

export default async function BusinessRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "BUSINESS") redirect("/login");
  if (!user.businessProfile) redirect("/dashboard/business");

  const { id } = await params;
  const request = await prisma.request.findUnique({
    where: { id },
    include: { offers: { where: { businessId: user.businessProfile.id } } },
  });

  if (!request) notFound();

  const myOffer = request.offers[0];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href="/dashboard/business/requests" className="text-sm text-indigo-600 hover:text-indigo-700">
        ← Back to open requests
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{request.title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {request.category} · Budget ${request.budgetMin.toFixed(0)}–${request.budgetMax.toFixed(0)}
          </p>
        </div>
        <Badge status={request.status} />
      </div>
      <p className="mt-4 whitespace-pre-wrap text-slate-700">{request.description}</p>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {myOffer ? (
          <div>
            <h2 className="font-semibold text-slate-900">Your offer</h2>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-slate-700">
                ${myOffer.price.toFixed(0)} · {myOffer.deliveryDays}-day delivery
              </p>
              <Badge status={myOffer.status} />
            </div>
            <p className="mt-2 text-sm text-slate-600">{myOffer.description}</p>
            {myOffer.aiScore != null && (
              <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
                <span className="font-medium text-slate-700">AI score: {Math.round(myOffer.aiScore)}/100. </span>
                {myOffer.aiRationale}
              </p>
            )}
          </div>
        ) : request.status === "OPEN" ? (
          <>
            <h2 className="font-semibold text-slate-900">Submit your offer</h2>
            <div className="mt-4">
              <NewOfferForm requestId={request.id} />
            </div>
          </>
        ) : (
          <p className="text-slate-500">This request is no longer accepting offers.</p>
        )}
      </div>
    </div>
  );
}
