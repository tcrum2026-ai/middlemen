"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/auth";
import { computeCommission } from "@/lib/commission";
import { createDealCheckoutSession, isStripeConfigured } from "@/lib/stripe";
import type { ActionState } from "@/lib/actions/auth";

export async function acceptOfferAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireRole("CUSTOMER");
  const offerId = formData.get("offerId");
  if (typeof offerId !== "string" || !offerId) {
    return { error: "Missing offer" };
  }

  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: { request: true },
  });

  if (!offer || offer.request.customerId !== user.id) {
    return { error: "Offer not found" };
  }
  if (offer.request.status !== "OPEN") {
    return { error: "This request has already been resolved" };
  }

  const { amount, commissionRate, commissionAmount } = computeCommission(offer.price);

  const [deal] = await prisma.$transaction([
    prisma.deal.create({
      data: {
        requestId: offer.requestId,
        offerId: offer.id,
        customerId: user.id,
        businessId: offer.businessId,
        amount,
        commissionRate,
        commissionAmount,
      },
    }),
    prisma.offer.update({ where: { id: offer.id }, data: { status: "ACCEPTED" } }),
    prisma.offer.updateMany({
      where: { requestId: offer.requestId, id: { not: offer.id } },
      data: { status: "REJECTED" },
    }),
    prisma.request.update({ where: { id: offer.requestId }, data: { status: "CLOSED" } }),
  ]);

  revalidatePath(`/dashboard/customer/requests/${offer.requestId}`);
  revalidatePath("/dashboard/customer");
  redirect(`/dashboard/customer/deals/${deal.id}`);
}

export async function payDealAction(formData: FormData) {
  const user = await requireUser();
  const dealId = formData.get("dealId");
  if (typeof dealId !== "string" || !dealId) return;

  const deal = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!deal || deal.customerId !== user.id || deal.status !== "PENDING_PAYMENT") {
    return;
  }

  if (isStripeConfigured()) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const checkoutUrl = await createDealCheckoutSession({
      dealId: deal.id,
      amount: deal.amount,
      description: `DealBridge deal #${deal.id.slice(-8)}`,
      successUrl: `${baseUrl}/dashboard/customer/deals/${deal.id}?paid=1`,
      cancelUrl: `${baseUrl}/dashboard/customer/deals/${deal.id}`,
    });
    if (checkoutUrl) {
      redirect(checkoutUrl);
    }
  }

  // Demo mode: no Stripe keys configured, so simulate a successful payment.
  await prisma.deal.update({ where: { id: deal.id }, data: { status: "PAID" } });
  revalidatePath(`/dashboard/customer/deals/${deal.id}`);
  redirect(`/dashboard/customer/deals/${deal.id}?simulated=1`);
}

export async function markDealCompletedAction(formData: FormData) {
  const user = await requireRole("BUSINESS");
  const dealId = formData.get("dealId");
  if (typeof dealId !== "string" || !dealId) return;

  const businessProfile = await prisma.businessProfile.findUnique({ where: { userId: user.id } });
  if (!businessProfile) return;

  const deal = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!deal || deal.businessId !== businessProfile.id || deal.status !== "PAID") return;

  await prisma.deal.update({ where: { id: deal.id }, data: { status: "COMPLETED" } });
  revalidatePath("/dashboard/business");
}
