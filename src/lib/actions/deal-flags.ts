"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/auth";
import { sendDealFlagResolvedEmail, sendDealFlaggedEmail } from "@/lib/mail";
import type { ActionState } from "@/lib/actions/auth";

/**
 * Either party on a paid deal can report a problem — messaging alone gives
 * them nothing to do if the other side goes quiet or the work goes badly.
 * Only one open report per deal at a time; a second reporter's concern
 * still reaches the same admin review, just doesn't spawn a duplicate.
 */
export async function reportDealIssueAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const dealId = formData.get("dealId");
  const reason = String(formData.get("reason") ?? "").trim();

  if (typeof dealId !== "string" || !dealId) {
    return { error: "Missing deal" };
  }
  if (reason.length < 10) {
    return { error: "Please describe the issue in a bit more detail" };
  }

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { business: true, request: true },
  });
  if (!deal || (deal.customerId !== user.id && deal.business.userId !== user.id)) {
    return { error: "Deal not found" };
  }
  if (deal.status !== "PAID" && deal.status !== "COMPLETED") {
    return { error: "Issues can only be reported on a paid deal" };
  }

  const existingOpen = await prisma.dealFlag.findFirst({
    where: { dealId, status: "OPEN" },
  });
  if (existingOpen) {
    return { message: "This deal already has an open report — an admin is reviewing it." };
  }

  await prisma.dealFlag.create({
    data: { dealId, reporterId: user.id, reason: reason.slice(0, 1000) },
  });

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { email: true } });
  await Promise.all(
    admins.map((admin) =>
      sendDealFlaggedEmail(admin.email, { requestTitle: deal.request.title, reporterName: user.name }),
    ),
  );

  revalidatePath(`/dashboard/customer/deals/${dealId}`);
  revalidatePath(`/dashboard/business/deals/${dealId}`);
  return { message: "Thanks — an admin will review this and follow up." };
}

export async function resolveDealFlagAction(formData: FormData) {
  await requireRole("ADMIN");
  const flagId = formData.get("flagId");
  const resolutionNote = String(formData.get("resolutionNote") ?? "").trim();
  if (typeof flagId !== "string" || !flagId) return;

  const flag = await prisma.dealFlag.findUnique({
    where: { id: flagId },
    include: { deal: { include: { request: true } }, reporter: true },
  });
  if (!flag || flag.status !== "OPEN") return;

  await prisma.dealFlag.update({
    where: { id: flagId },
    data: {
      status: "RESOLVED",
      resolvedAt: new Date(),
      resolutionNote: resolutionNote ? resolutionNote.slice(0, 1000) : null,
    },
  });

  await sendDealFlagResolvedEmail(flag.reporter.email, {
    requestTitle: flag.deal.request.title,
    resolutionNote: resolutionNote || null,
  });

  revalidatePath("/dashboard/admin/disputes");
  revalidatePath(`/dashboard/customer/deals/${flag.dealId}`);
  revalidatePath(`/dashboard/business/deals/${flag.dealId}`);
}
