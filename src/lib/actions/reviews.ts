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
  const dealId = formData.get("dealId");
  if (typeof dealId !== "string" || !dealId) {
    return { error: "Missing deal" };
  }

  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Pick a rating from 1 to 5" };
  }
  if (comment.length < 5) {
    return { error: "Please add a short comment about your experience" };
  }

  const deal = await prisma.deal.findUnique({ where: { id: dealId }, include: { review: true } });
  if (!deal || deal.customerId !== user.id) {
    return { error: "Deal not found" };
  }
  if (deal.status !== "COMPLETED") {
    return { error: "You can review a deal once it's marked complete" };
  }
  if (deal.review) {
    return { error: "You've already reviewed this deal" };
  }

  await prisma.review.create({
    data: {
      dealId: deal.id,
      businessId: deal.businessId,
      customerId: user.id,
      rating,
      comment: comment.slice(0, 1000),
    },
  });

  revalidatePath(`/dashboard/customer/deals/${deal.id}`);
  revalidatePath("/dashboard/business");
}
