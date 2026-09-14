"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { extractDomain } from "@/lib/domain";
import { sendNewClaimRequestEmail } from "@/lib/mail";
import { parseListingFields } from "@/lib/listingFields";
import type { ActionState } from "@/lib/actions/auth";

export async function saveBusinessProfileAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireRole("BUSINESS");

  const parsed = parseListingFields(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (!user.businessProfile) {
    return { error: "Claim or create a listing first" };
  }

  await prisma.businessProfile.update({ where: { id: user.businessProfile.id }, data: parsed.data });
  revalidatePath("/dashboard/business");
}

/**
 * A business owner claims an existing, unclaimed directory listing as their
 * own. This always queues the request for an admin to review and approve —
 * it can never auto-approve, because signup never verifies that a user
 * actually controls the inbox at their stated email address. An email
 * domain matching the listing's website is surfaced to the admin as a
 * helpful (but unverified) hint, not a substitute for their judgment: an
 * attacker can type any email address at signup, so trusting a domain
 * string match alone would let anyone claim (and take over the reviews,
 * deals, and payouts of) any business whose website they can see on the
 * public directory.
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

  if (user.businessProfile) {
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
  const domainMatched = Boolean(websiteDomain && emailDomain && websiteDomain === emailDomain);

  await prisma.claimRequest.create({
    data: {
      businessId,
      userId: user.id,
      domainMatched,
      note: typeof note === "string" && note ? note : null,
    },
  });

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { email: true } });
  await Promise.all(
    admins.map((admin) =>
      sendNewClaimRequestEmail(admin.email, { companyName: listing.companyName, requesterName: user.name }),
    ),
  );

  revalidatePath(`/businesses/${businessId}`);
  return {
    message:
      "Your claim request has been submitted for review. We'll email you once it's approved.",
  };
}

/**
 * A business owner creates a brand-new listing when they can't find an
 * existing one to claim. Blocked on a case-insensitive name+ZIP match
 * against the directory for the same reason claimBusinessAction requires
 * admin review: without this check, anyone could stand up a duplicate
 * listing for a business they don't own, complete with its own reviews and
 * deals, alongside — or in place of — the real one.
 */
export async function createOwnListingAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireRole("BUSINESS");

  if (user.businessProfile) {
    return { error: "You've already claimed or created a listing" };
  }

  const parsed = parseListingFields(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existingListing = await prisma.businessProfile.findFirst({
    where: {
      companyName: { equals: parsed.data.companyName, mode: "insensitive" },
      zipCode: parsed.data.zipCode,
    },
  });
  if (existingListing) {
    return {
      error: `"${parsed.data.companyName}" already exists in ${parsed.data.zipCode} — claim it instead of creating a duplicate.`,
    };
  }

  await prisma.businessProfile.create({
    data: { ...parsed.data, userId: user.id, claimed: true, source: "SELF_CLAIMED" },
  });

  redirect("/dashboard/business");
}
