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
