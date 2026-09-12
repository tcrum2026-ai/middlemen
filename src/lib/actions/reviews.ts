"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import type { ActionState } from "@/lib/actions/auth";

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

  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Pick a rating from 1 to 5" };
  }
  if (comment.length < 5) {
    return { error: "Please add a short comment about your experience" };
  }

  const business = await prisma.businessProfile.findUnique({ where: { id: businessId } });
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

  revalidatePath(`/businesses/${businessId}`);
  if (verifiedDealId) revalidatePath(`/dashboard/customer/deals/${verifiedDealId}`);
  revalidatePath("/dashboard/business");
}
