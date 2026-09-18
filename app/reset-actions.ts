"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { completePasswordReset, createPasswordReset, startSession } from "@/lib/auth";
import { platformMailConfigured, sendPlatformEmail } from "@/lib/platform-mail";
import { QUOTAS, rateLimitAll } from "@/lib/rate-limit";
import { ensureSeeded } from "@/lib/seed";

function field(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}

async function callerIp(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headerList.get("x-real-ip")?.trim() || "unknown";
}

async function siteUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  return `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
}

export interface ForgotState {
  error?: string;
  sent?: boolean;
}

export async function requestResetAction(_prev: ForgotState | null, data: FormData): Promise<ForgotState> {
  ensureSeeded();
  const email = field(data, "email").trim();
  if (!email) return { error: "Enter the email address on the account." };

  if (!platformMailConfigured()) {
    // Saying "check your inbox" when nothing can be sent would be a lie the
    // visitor only discovers by waiting.
    return {
      error: "Password reset email isn't set up on this deployment yet. Contact whoever runs it.",
    };
  }

  const limit = rateLimitAll([
    { key: `reset:ip:${await callerIp()}`, quota: QUOTAS.signUpPerIp },
    { key: `reset:email:${email.toLowerCase()}`, quota: QUOTAS.signUpPerIp },
  ]);
  if (!limit.ok) return { error: "Too many reset requests. Try again later." };

  const reset = createPasswordReset(email);
  if (reset) {
    const link = `${await siteUrl()}/reset?token=${encodeURIComponent(reset.token)}`;
    const result = await sendPlatformEmail({
      to: reset.user.email,
      subject: "Reset your Lobby password",
      body:
        `Hi ${reset.user.name},\n\n` +
        `Someone asked to reset the password on your Lobby account. If that was you, ` +
        `open this link within the hour:\n\n${link}\n\n` +
        `If it wasn't you, ignore this email — nothing has changed, and the link ` +
        `expires on its own.\n`,
    });
    if (!result.sent) console.error("Password reset email failed:", result.detail);
    if (process.env.NODE_ENV !== "production") {
      // So the flow can be finished locally without wiring up a mail provider.
      console.info(`[dev] password reset link for ${reset.user.email}: ${link}`);
    }
  }

  // Identical response whether or not the account exists: this form must not
  // become a way to find out who has an account here.
  return { sent: true };
}

export interface ResetState {
  error?: string;
}

export async function completeResetAction(_prev: ResetState | null, data: FormData): Promise<ResetState> {
  ensureSeeded();
  const token = field(data, "token");
  const password = field(data, "password");
  const confirm = field(data, "confirm");

  if (!token) return { error: "That link is missing its token. Request a new one." };
  if (password !== confirm) return { error: "Those two passwords don't match." };

  const limit = rateLimitAll([{ key: `resetdo:ip:${await callerIp()}`, quota: QUOTAS.signInPerIp }]);
  if (!limit.ok) return { error: "Too many attempts. Try again later." };

  const outcome = await completePasswordReset(token, password);
  if (!outcome.ok) return { error: outcome.error };

  // The reset dropped every session, including any an intruder held; this
  // starts a fresh one for the person who just proved they own the inbox.
  await startSession(outcome.userId);
  redirect("/dashboard");
}
