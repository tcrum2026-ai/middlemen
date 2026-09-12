"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function sendMessageAction(formData: FormData) {
  const user = await requireUser();
  const dealId = formData.get("dealId");
  const body = String(formData.get("body") ?? "").trim();
  if (typeof dealId !== "string" || !dealId || !body) return;

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { business: true },
  });
  if (!deal) return;

  const isCustomer = deal.customerId === user.id;
  const isBusinessOwner = deal.business.userId === user.id;
  if (!isCustomer && !isBusinessOwner) return;

  await prisma.message.create({
    data: { dealId, senderId: user.id, body: body.slice(0, 2000) },
  });

  revalidatePath(`/dashboard/customer/deals/${dealId}`);
  revalidatePath(`/dashboard/business/deals/${dealId}`);
}
