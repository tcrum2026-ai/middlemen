"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { sendNewMessageEmail } from "@/lib/mail";

export async function sendMessageAction(formData: FormData) {
  const user = await requireUser();
  const dealId = formData.get("dealId");
  const body = String(formData.get("body") ?? "").trim();
  if (typeof dealId !== "string" || !dealId || !body) return;

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { business: { include: { user: true } }, customer: true, request: true },
  });
  if (!deal) return;

  const isCustomer = deal.customerId === user.id;
  const isBusinessOwner = deal.business.userId === user.id;
  if (!isCustomer && !isBusinessOwner) return;

  await prisma.message.create({
    data: { dealId, senderId: user.id, body: body.slice(0, 2000) },
  });

  if (isCustomer && deal.business.user) {
    await sendNewMessageEmail(deal.business.user.email, {
      requestTitle: deal.request.title,
      dealPath: `/dashboard/business/deals/${dealId}`,
    });
  } else if (isBusinessOwner) {
    await sendNewMessageEmail(deal.customer.email, {
      requestTitle: deal.request.title,
      dealPath: `/dashboard/customer/deals/${dealId}`,
    });
  }

  revalidatePath(`/dashboard/customer/deals/${dealId}`);
  revalidatePath(`/dashboard/business/deals/${dealId}`);
}
