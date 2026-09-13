import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rankOffers } from "@/lib/ai";
import { getBusinessRatingSummaries } from "@/lib/ratings";
import Badge from "@/components/Badge";
import AcceptOfferButton from "@/components/forms/AcceptOfferButton";
import StarRating from "@/components/StarRating";
import { cancelRequestAction } from "@/lib/actions/requests";

export default async function CustomerRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER") redirect("/login");

  const { id } = await params;
  const request = await prisma.request.findUnique({
    where: { id },
    include: { offers: { include: { business: true } }, deal: true },
  });

  if (!request || request.customerId !== user.id) notFound();

  const offerBusinessIds = new Set(request.offers.map((o) => o.businessId));

  const [directoryMatches, ratingSummaries] = await Promise.all([
    request.status === "OPEN"
      ? prisma.businessProfile.findMany({
          where: {
            category: request.category,
            zipCode: request.zipCode,
            id: { notIn: [...offerBusinessIds] },
          },
          take: 6,
        })
      : Promise.resolve([]),
    getBusinessRatingSummaries(request.offers.map((o) => o.business.id)),
  ]);

  const directoryRatings = await getBusinessRatingSummaries(directoryMatches.map((b) => b.id));

  let orderedOffers = request.offers;

  if (request.offers.length > 0 && request.status === "OPEN") {
    const ranked = await rankOffers(
      {
        title: request.title,
        description: request.description,
        category: request.category,
        budgetMin: request.budgetMin,
        budgetMax: request.budgetMax,
      },
      request.offers.map((o) => ({
        id: o.id,
        price: o.price,
        description: o.description,
        deliveryDays: o.deliveryDays,
        businessName: o.business.companyName,
        businessRating: ratingSummaries.get(o.business.id)?.sortScore ?? 4,
      }))
    );

    await Promise.all(
      ranked.map((r) =>
        prisma.offer.update({
          where: { id: r.offerId },
          data: { aiScore: r.score, aiRationale: r.rationale },
        })
      )
    );

    const rankById = new Map(ranked.map((r) => [r.offerId, r]));
    orderedOffers = [...request.offers]
      .map((o) => {
        const rank = rankById.get(o.id);
        return rank ? { ...o, aiScore: rank.score, aiRationale: rank.rationale } : o;
      })
      .sort((a, b) => (b.aiScore ?? 0) - (a.aiScore ?? 0));
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/dashboard/customer" className="text-sm text-stone-600 hover:text-stone-900">
        ← Back to requests
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">{request.title}</h1>
          <p className="mt-1 text-sm text-stone-500">
            {request.category} · {request.zipCode} · Budget ${request.budgetMin.toFixed(0)}–$
            {request.budgetMax.toFixed(0)}
          </p>
        </div>
        <Badge status={request.status} />
      </div>
      <p className="mt-4 whitespace-pre-wrap text-stone-700">{request.description}</p>

      {request.status === "OPEN" && !request.deal && (
        <form action={cancelRequestAction} className="mt-3">
          <input type="hidden" name="requestId" value={request.id} />
          <button type="submit" className="text-sm font-medium text-red-600 hover:underline">
            Cancel request
          </button>
        </form>
      )}

      {request.deal && (
        <div className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
          You accepted an offer for this request.{" "}
          <Link href={`/dashboard/customer/deals/${request.deal.id}`} className="font-semibold underline">
            View deal →
          </Link>
        </div>
      )}

      {directoryMatches.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-stone-900">
            Businesses we found in your area
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            These {request.category.toLowerCase()} businesses serve {request.zipCode} and haven&apos;t
            sent an offer yet — we notify them about requests like yours.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {directoryMatches.map((biz) => {
              const summary = directoryRatings.get(biz.id);
              return (
                <Link
                  key={biz.id}
                  href={`/businesses/${biz.id}`}
                  className="block rounded-xl border border-stone-200 bg-white p-4 shadow-sm hover:border-stone-400"
                >
                  <p className="font-medium text-stone-900">{biz.companyName}</p>
                  <div className="mt-1">
                    <StarRating
                      rating={summary?.displayRating ?? null}
                      reviewCount={summary?.reviewCount ?? 0}
                      size="sm"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <h2 className="mt-10 text-lg font-semibold text-stone-900">
        Offers ({request.offers.length})
      </h2>
      {request.offers.length > 0 && request.status === "OPEN" && (
        <p className="mt-1 text-sm text-stone-500">
          Ranked by AI from best to worst overall value for you.
        </p>
      )}

      {orderedOffers.length === 0 ? (
        <p className="mt-4 text-stone-500">No offers yet — check back soon.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {orderedOffers.map((offer, idx) => (
            <div
              key={offer.id}
              className={`rounded-xl border bg-white p-5 shadow-sm ${
                idx === 0 && request.status === "OPEN"
                  ? "border-amber-400 ring-1 ring-amber-200"
                  : "border-stone-200"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-stone-900">{offer.business.companyName}</h3>
                    {idx === 0 && request.status === "OPEN" && (
                      <span className="rounded-full bg-stone-900 px-2 py-0.5 text-xs font-semibold text-white">
                        AI Top Pick
                      </span>
                    )}
                    <Badge status={offer.status} />
                  </div>
                  <p className="mt-1 text-sm text-stone-500">
                    {(() => {
                      const s = ratingSummaries.get(offer.business.id);
                      return s?.displayRating != null
                        ? `⭐ ${s.displayRating.toFixed(1)} (${s.reviewCount} reviews)`
                        : "New business";
                    })()}
                    {" · "}
                    {offer.deliveryDays}-day delivery
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-stone-900">${offer.price.toFixed(0)}</p>
                  {offer.aiScore != null && (
                    <p className="text-xs font-medium text-amber-700">AI score: {Math.round(offer.aiScore)}/100</p>
                  )}
                </div>
              </div>
              <p className="mt-3 text-sm text-stone-700">{offer.description}</p>
              {offer.aiRationale && (
                <p className="mt-3 rounded-md bg-stone-50 p-3 text-sm text-stone-600">
                  <span className="font-medium text-stone-700">AI take: </span>
                  {offer.aiRationale}
                </p>
              )}
              {request.status === "OPEN" && (
                <div className="mt-4">
                  <AcceptOfferButton offerId={offer.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
