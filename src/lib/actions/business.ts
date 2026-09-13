"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { businessProfileSchema } from "@/lib/validation";
import type { ActionState } from "@/lib/actions/auth";

// Best-effort hostname extraction so "https://www.example.com/path" and
// "example.com" both normalize to "example.com" for a domain comparison.
function extractDomain(value: string): string | null {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return new URL(withProtocol).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

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

/**
 * A business owner claims an existing, unclaimed directory listing as their
 * own. Instantly granting ownership on a single click would let anyone
 * hijack a listing's reviews and future deals, so this only auto-approves
 * when the requester's email domain matches the listing's website — a cheap
 * but meaningful signal — and otherwise queues the request for an admin to
 * review.
 */
export async function claimBusinessAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireRole("BUSINESS");
  const businessId = formData.get("businessId");
  if (typeof businessId !== "string" || !businessId) {
    return { error: "Missing business" };
  }
  const note = formData.get("note");

  const alreadyOwned = await prisma.businessProfile.findUnique({ where: { userId: user.id } });
  if (alreadyOwned) {
    return { error: "You've already claimed or created a listing" };
  }

  const pendingClaim = await prisma.claimRequest.findFirst({
    where: { userId: user.id, status: "PENDING" },
  });
  if (pendingClaim) {
    return { error: "You already have a claim request awaiting review" };
  }

  const listing = await prisma.businessProfile.findUnique({ where: { id: businessId } });
  if (!listing) {
    return { error: "Listing not found" };
  }
  if (listing.claimed || listing.userId) {
    return { error: "This listing has already been claimed" };
  }

  const existingRequest = await prisma.claimRequest.findUnique({
    where: { businessId_userId: { businessId, userId: user.id } },
  });
  if (existingRequest) {
    return { error: "You've already requested to claim this listing" };
  }

  const websiteDomain = listing.website ? extractDomain(listing.website) : null;
  const emailDomain = user.email.split("@")[1]?.toLowerCase() ?? null;
  const autoVerified = Boolean(websiteDomain && emailDomain && websiteDomain === emailDomain);

  if (autoVerified) {
    await prisma.$transaction([
      prisma.businessProfile.update({
        where: { id: businessId },
        data: { userId: user.id, claimed: true, source: "SELF_CLAIMED" },
      }),
      prisma.claimRequest.create({
        data: {
          businessId,
          userId: user.id,
          status: "APPROVED",
          decidedAt: new Date(),
          note: typeof note === "string" && note ? note : null,
        },
      }),
    ]);
    redirect("/dashboard/business");
  }

  await prisma.claimRequest.create({
    data: {
      businessId,
      userId: user.id,
      note: typeof note === "string" && note ? note : null,
    },
  });

  revalidatePath(`/businesses/${businessId}`);
  return {
    message:
      "Your claim request has been submitted for review. We'll email you once it's approved.",
  };
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
