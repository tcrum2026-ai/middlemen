"use server";

import { prisma } from "@/lib/db";
import { requireUser, hashPassword, verifyPassword } from "@/lib/auth";
import { isRateLimited, recordRateLimitHit } from "@/lib/rateLimit";
import { changePasswordSchema } from "@/lib/validation";
import type { ActionState } from "@/lib/actions/auth";

const CHANGE_PASSWORD_LIMIT = { limit: 10, windowMs: 15 * 60 * 1000 };

export async function changePasswordAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const rateLimitKey = `changepw:${user.id}`;
  if (await isRateLimited(rateLimitKey, CHANGE_PASSWORD_LIMIT)) {
    return { error: "Too many attempts. Please wait 15 minutes and try again." };
  }

  if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    await recordRateLimitHit(rateLimitKey);
    return { error: "Current password is incorrect" };
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return { message: "Your password has been updated." };
}
