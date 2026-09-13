"use server";

import { randomBytes, createHash } from "crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/mail";
import { isRateLimited, recordRateLimitHit } from "@/lib/rateLimit";
import { forgotPasswordSchema, loginSchema, resetPasswordSchema, signupSchema } from "@/lib/validation";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const LOGIN_LIMIT = { limit: 10, windowMs: 15 * 60 * 1000 }; // 10 failures / 15 min
const RESET_REQUEST_LIMIT = { limit: 3, windowMs: 60 * 60 * 1000 }; // 3 requests / hour

export type ActionState = { error?: string; message?: string } | undefined;

export async function signupAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, email, password, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with that email already exists" };
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role },
  });

  await createSession({ userId: user.id, role: user.role });

  redirect(role === "BUSINESS" ? "/dashboard/business" : "/dashboard/customer");
}

export async function loginAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { email, password } = parsed.data;
  const rateLimitKey = `login:${email.toLowerCase()}`;
  if (await isRateLimited(rateLimitKey, LOGIN_LIMIT)) {
    return { error: "Too many failed login attempts. Please wait 15 minutes and try again." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    await recordRateLimitHit(rateLimitKey);
    return { error: "Incorrect email or password" };
  }

  await createSession({ userId: user.id, role: user.role });

  if (user.role === "ADMIN") redirect("/dashboard/admin");
  redirect(user.role === "BUSINESS" ? "/dashboard/business" : "/dashboard/customer");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

const GENERIC_RESET_MESSAGE =
  "If an account exists for that email, we've sent a link to reset your password.";

export async function requestPasswordResetAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const rateLimitKey = `reset:${parsed.data.email.toLowerCase()}`;
  // Checked (and only recorded) before the lookup, and the response below is
  // identical either way — a rate-limited request can't be told apart from
  // one that just found no matching account.
  if (!(await isRateLimited(rateLimitKey, RESET_REQUEST_LIMIT))) {
    await recordRateLimitHit(rateLimitKey);

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (user) {
      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      });

      const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const resetUrl = `${siteUrl}/reset-password?token=${rawToken}`;
      await sendPasswordResetEmail(user.email, resetUrl);
    }
  }

  // Same response whether or not the email is registered, and whether or
  // not this request was rate-limited, so neither can be probed.
  return { message: GENERIC_RESET_MESSAGE };
}

export async function resetPasswordAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { token, password } = parsed.data;
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return { error: "This reset link is invalid or has expired. Please request a new one." };
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
  ]);

  return { message: "Your password has been updated. You can now log in." };
}
