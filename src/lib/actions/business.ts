"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { businessProfileSchema } from "@/lib/validation";
import type { ActionState } from "@/lib/actions/auth";

function parseListingFields(formData: FormData) {
  return businessProfileSchema.safeParse({
    companyName: formData.get("companyName"),
    category: formData.get("category"),
    description: formData.get("description"),
    phone: formData.get("phone") ?? "",
    website: formData.get("website") ?? "",
    hours: formData.get("hours") ?? "",
    addressLine: formData.get("addressLine") ?? "",
    city: formData.get("city") ?? "",
    state: formData.get("state") ?? "",
    zipCode: formData.get("zipCode"),
  });
}

export async function saveBusinessProfileAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireRole("BUSINESS");

  const parsed = parseListingFields(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await prisma.businessProfile.findUnique({ where: { userId: user.id } });
  if (!existing) {
    return { error: "Claim or create a listing first" };
  }

  await prisma.businessProfile.update({ where: { id: existing.id }, data: parsed.data });
  revalidatePath("/dashboard/business");
}

/** A business owner claims an existing, unclaimed directory listing as their own. */
export async function claimBusinessAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireRole("BUSINESS");
  const businessId = formData.get("businessId");
  if (typeof businessId !== "string" || !businessId) {
    return { error: "Missing business" };
  }

  const alreadyOwned = await prisma.businessProfile.findUnique({ where: { userId: user.id } });
  if (alreadyOwned) {
    return { error: "You've already claimed or created a listing" };
  }

  const listing = await prisma.businessProfile.findUnique({ where: { id: businessId } });
  if (!listing) {
    return { error: "Listing not found" };
  }
  if (listing.claimed || listing.userId) {
    return { error: "This listing has already been claimed" };
  }

  await prisma.businessProfile.update({
    where: { id: businessId },
    data: { userId: user.id, claimed: true, source: "SELF_CLAIMED" },
  });

  redirect("/dashboard/business");
}

/** A business owner creates a brand-new listing when they can't find an existing one to claim. */
export async function createOwnListingAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireRole("BUSINESS");

  const alreadyOwned = await prisma.businessProfile.findUnique({ where: { userId: user.id } });
  if (alreadyOwned) {
    return { error: "You've already claimed or created a listing" };
  }

  const parsed = parseListingFields(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.businessProfile.create({
    data: { ...parsed.data, userId: user.id, claimed: true, source: "SELF_CLAIMED" },
  });

  redirect("/dashboard/business");
}
