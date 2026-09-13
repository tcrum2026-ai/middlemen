"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function deleteReviewAction(formData: FormData) {
  await requireRole("ADMIN");

  const reviewId = formData.get("reviewId");
  if (typeof reviewId !== "string" || !reviewId) return;

  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) return;

  await prisma.review.delete({ where: { id: reviewId } });

  revalidatePath("/dashboard/admin/reviews");
  revalidatePath("/businesses");
  revalidatePath(`/businesses/${review.businessId}`);
}
