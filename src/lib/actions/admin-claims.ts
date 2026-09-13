"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { sendClaimApprovedEmail, sendClaimRejectedEmail } from "@/lib/mail";

export async function approveClaimAction(formData: FormData) {
  await requireRole("ADMIN");
  const claimId = formData.get("claimId");
  if (typeof claimId !== "string" || !claimId) return;

  const claim = await prisma.claimRequest.findUnique({
    where: { id: claimId },
    include: { business: true, user: true },
  });
  if (!claim || claim.status !== "PENDING") return;
  if (claim.business.claimed) {
    // Someone else's claim on the same listing was already approved.
    await prisma.claimRequest.update({
      where: { id: claimId },
      data: { status: "REJECTED", decidedAt: new Date() },
    });
    revalidatePath("/dashboard/admin/claims");
    return;
  }

  await prisma.$transaction([
    prisma.businessProfile.update({
      where: { id: claim.businessId },
      data: { userId: claim.userId, claimed: true, source: "SELF_CLAIMED" },
    }),
    prisma.claimRequest.update({
      where: { id: claimId },
      data: { status: "APPROVED", decidedAt: new Date() },
    }),
  ]);

  await sendClaimApprovedEmail(claim.user.email, claim.business.companyName);

  revalidatePath("/dashboard/admin/claims");
  revalidatePath(`/businesses/${claim.businessId}`);
}

export async function rejectClaimAction(formData: FormData) {
  await requireRole("ADMIN");
  const claimId = formData.get("claimId");
  if (typeof claimId !== "string" || !claimId) return;

  const claim = await prisma.claimRequest.findUnique({
    where: { id: claimId },
    include: { business: true, user: true },
  });
  if (!claim || claim.status !== "PENDING") return;

  await prisma.claimRequest.update({
    where: { id: claimId },
    data: { status: "REJECTED", decidedAt: new Date() },
  });

  await sendClaimRejectedEmail(claim.user.email, claim.business.companyName);

  revalidatePath("/dashboard/admin/claims");
}
