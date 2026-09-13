"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { offerSchema } from "@/lib/validation";
import type { ActionState } from "@/lib/actions/auth";

export async function createOfferAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireRole("BUSINESS");
  const requestId = formData.get("requestId");
  if (typeof requestId !== "string" || !requestId) {
    return { error: "Missing request" };
  }

  const businessProfile = await prisma.businessProfile.findUnique({ where: { userId: user.id } });
  if (!businessProfile) {
    return { error: "Set up your business profile before submitting offers" };
  }

  const targetRequest = await prisma.request.findUnique({ where: { id: requestId } });
  if (!targetRequest || targetRequest.status !== "OPEN") {
    return { error: "This request is no longer open for offers" };
  }

  const parsed = offerSchema.safeParse({
    price: formData.get("price"),
    description: formData.get("description"),
    deliveryDays: formData.get("deliveryDays"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await prisma.offer.create({
      data: { requestId, businessId: businessProfile.id, ...parsed.data },
    });
  } catch {
    return { error: "You've already submitted an offer for this request" };
  }

  revalidatePath(`/dashboard/business/requests/${requestId}`);
  revalidatePath("/dashboard/business/offers");
}

export async function withdrawOfferAction(formData: FormData) {
  const user = await requireRole("BUSINESS");
  const offerId = formData.get("offerId");
  if (typeof offerId !== "string" || !offerId) return;

  const businessProfile = await prisma.businessProfile.findUnique({ where: { userId: user.id } });
  if (!businessProfile) return;

  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: { request: true },
  });
  if (!offer || offer.businessId !== businessProfile.id) return;
  if (offer.status !== "PENDING" || offer.request.status !== "OPEN") return;

  await prisma.offer.update({ where: { id: offerId }, data: { status: "WITHDRAWN" } });

  revalidatePath(`/dashboard/business/requests/${offer.requestId}`);
  revalidatePath(`/dashboard/customer/requests/${offer.requestId}`);
}
