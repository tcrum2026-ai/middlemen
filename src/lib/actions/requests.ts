"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { requestSchema } from "@/lib/validation";
import type { ActionState } from "@/lib/actions/auth";

export async function createRequestAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireRole("CUSTOMER");

  const parsed = requestSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    zipCode: formData.get("zipCode"),
    budgetMin: formData.get("budgetMin"),
    budgetMax: formData.get("budgetMax"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const request = await prisma.request.create({
    data: { customerId: user.id, ...parsed.data },
  });

  revalidatePath("/dashboard/customer");
  redirect(`/dashboard/customer/requests/${request.id}`);
}

/**
 * A customer edits an OPEN request's own details. Only allowed before any
 * offers exist — a business that already bid did so against the original
 * title/description/budget, and changing those out from under them isn't
 * fair to a bid already made in good faith.
 */
export async function editRequestAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireRole("CUSTOMER");
  const requestId = formData.get("requestId");
  if (typeof requestId !== "string" || !requestId) {
    return { error: "Missing request" };
  }

  const existing = await prisma.request.findUnique({
    where: { id: requestId },
    include: { offers: true },
  });
  if (!existing || existing.customerId !== user.id) {
    return { error: "Request not found" };
  }
  if (existing.status !== "OPEN" || existing.offers.length > 0) {
    return { error: "This request can no longer be edited" };
  }

  const parsed = requestSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    zipCode: formData.get("zipCode"),
    budgetMin: formData.get("budgetMin"),
    budgetMax: formData.get("budgetMax"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.request.update({ where: { id: requestId }, data: parsed.data });

  revalidatePath(`/dashboard/customer/requests/${requestId}`);
  redirect(`/dashboard/customer/requests/${requestId}`);
}

export async function cancelRequestAction(formData: FormData) {
  const user = await requireRole("CUSTOMER");
  const requestId = formData.get("requestId");
  if (typeof requestId !== "string" || !requestId) return;

  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: { deal: true },
  });
  if (!request || request.customerId !== user.id) return;
  if (request.status !== "OPEN" || request.deal) return;

  await prisma.request.update({ where: { id: requestId }, data: { status: "CANCELLED" } });

  revalidatePath(`/dashboard/customer/requests/${requestId}`);
  revalidatePath("/dashboard/customer");
}
