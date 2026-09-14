"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { sendNewReviewEmail } from "@/lib/mail";
import type { ActionState } from "@/lib/actions/auth";

function parseReviewInput(formData: FormData): { rating: number; comment: string } | { error: string } {
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Pick a rating from 1 to 5" };
  }
  if (comment.length < 5) {
    return { error: "Please add a short comment about your experience" };
  }

  return { rating, comment };
}

export async function submitReviewAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireRole("CUSTOMER");
  const businessId = formData.get("businessId");
  const dealId = formData.get("dealId");
  if (typeof businessId !== "string" || !businessId) {
    return { error: "Missing business" };
  }

  const parsedInput = parseReviewInput(formData);
  if ("error" in parsedInput) {
    return { error: parsedInput.error };
  }
  const { rating, comment } = parsedInput;

  const business = await prisma.businessProfile.findUnique({
    where: { id: businessId },
    include: { user: true },
  });
  if (!business) {
    return { error: "Business not found" };
  }

  let verifiedDealId: string | null = null;
  if (typeof dealId === "string" && dealId) {
    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal || deal.customerId !== user.id || deal.businessId !== businessId) {
      return { error: "Deal not found" };
    }
    if (deal.status !== "COMPLETED") {
      return { error: "You can review a deal once it's marked complete" };
    }
    verifiedDealId = deal.id;
  }

  try {
    await prisma.review.create({
      data: {
        businessId,
        customerId: user.id,
        dealId: verifiedDealId,
        rating,
        comment: comment.slice(0, 1000),
      },
    });
  } catch {
    return { error: "You've already reviewed this business" };
  }

  if (business.user) {
    await sendNewReviewEmail(business.user.email, {
      customerName: user.name,
      rating,
      companyName: business.companyName,
    });
  }

  revalidatePath(`/businesses/${businessId}`);
  if (verifiedDealId) revalidatePath(`/dashboard/customer/deals/${verifiedDealId}`);
  revalidatePath("/dashboard/business");
}

export async function editReviewAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireRole("CUSTOMER");
  const reviewId = formData.get("reviewId");
  if (typeof reviewId !== "string" || !reviewId) {
    return { error: "Missing review" };
  }

  const parsedInput = parseReviewInput(formData);
  if ("error" in parsedInput) {
    return { error: parsedInput.error };
  }
  const { rating, comment } = parsedInput;

  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review || review.customerId !== user.id) {
    return { error: "Review not found" };
  }

  await prisma.review.update({
    where: { id: reviewId },
    data: { rating, comment: comment.slice(0, 1000) },
  });

  revalidatePath(`/businesses/${review.businessId}`);
  revalidatePath("/dashboard/business");
  return { message: "Your review has been updated." };
}
