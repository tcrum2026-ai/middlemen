"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/auth";
import { computeCommission } from "@/lib/commission";
import { sendDealCompletedEmail, sendOfferAcceptedEmail } from "@/lib/mail";
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
    include: { request: true, business: { include: { user: true } } },
  });

  if (!offer || offer.request.customerId !== user.id) {
    return { error: "Offer not found" };
  }
  if (offer.request.status !== "OPEN") {
    return { error: "This request has already been resolved" };
  }

  const { amount, commissionRate, commissionAmount } = computeCommission(offer.price);

  // The OPEN check above reads stale data by the time this runs, so two
  // near-simultaneous accepts (a double-click across two tabs, a retried
  // request) could otherwise both pass it and each create a Deal for the
  // same request. Closing the request is done as a conditional update
  // inside the transaction itself — Postgres serializes concurrent updates
  // to the same row, so only one caller's updateMany can ever match
  // status: "OPEN" and proceed; the loser sees count 0 and the whole
  // transaction rolls back.
  let deal;
  try {
    deal = await prisma.$transaction(async (tx) => {
      const closed = await tx.request.updateMany({
        where: { id: offer.requestId, status: "OPEN" },
        data: { status: "CLOSED" },
      });
      if (closed.count === 0) {
        throw new Error("REQUEST_ALREADY_RESOLVED");
      }

      const created = await tx.deal.create({
        data: {
          requestId: offer.requestId,
          offerId: offer.id,
          customerId: user.id,
          businessId: offer.businessId,
          amount,
          commissionRate,
          commissionAmount,
        },
      });
      await tx.offer.update({ where: { id: offer.id }, data: { status: "ACCEPTED" } });
      await tx.offer.updateMany({
        where: { requestId: offer.requestId, id: { not: offer.id } },
        data: { status: "REJECTED" },
      });
      return created;
    });
  } catch (err) {
    if (err instanceof Error && err.message === "REQUEST_ALREADY_RESOLVED") {
      return { error: "This request has already been resolved" };
    }
    throw err;
  }

  if (offer.business.user) {
    await sendOfferAcceptedEmail(offer.business.user.email, {
      requestTitle: offer.request.title,
      dealId: deal.id,
    });
  }

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

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { request: true, customer: true },
  });
  if (!deal || deal.businessId !== businessProfile.id || deal.status !== "PAID") return;

  await prisma.deal.update({ where: { id: deal.id }, data: { status: "COMPLETED" } });

  await sendDealCompletedEmail(deal.customer.email, {
    requestTitle: deal.request.title,
    companyName: businessProfile.companyName,
    dealId: deal.id,
  });

  revalidatePath("/dashboard/business");
  revalidatePath(`/dashboard/customer/deals/${deal.id}`);
}
