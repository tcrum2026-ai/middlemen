"use server";

import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { authenticate, createUser, endSession, startSession } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/verify-mail";
import { ensureSeeded } from "@/lib/seed";
import { BUSINESS_COOKIE } from "@/lib/session";
import { QUOTAS, rateLimitAll } from "@/lib/rate-limit";

function field(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}

const FALLBACK = "/dashboard";

/** Server actions don't receive the Request, so the address comes from headers(). */
async function callerIp(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headerList.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Only same-site paths. Prefix checks are not enough: the URL parser treats a
 * backslash as a slash for http(s), so "/\evil.com" resolves to another origin
 * while looking like a relative path. Resolve it and compare origins instead.
 */
function safeNext(raw: string): string {
  if (!raw || !raw.startsWith("/") || raw.includes("\\")) return FALLBACK;
  try {
    const sentinel = "https://lobby.invalid";
    const url = new URL(raw, sentinel);
    if (url.origin !== sentinel) return FALLBACK;
    return `${url.pathname}${url.search}`;
  } catch {
    return FALLBACK;
  }
}

export async function signInAction(_prev: { error?: string } | null, data: FormData) {
  ensureSeeded();
  const email = field(data, "email");
  const password = field(data, "password");
  if (!email || !password) return { error: "Email and password, please." };

  // Counted per address and per account, so guessing can be spread across
  // neither many accounts from one machine nor one account from many.
  const limit = rateLimitAll([
    { key: `signin:ip:${await callerIp()}`, quota: QUOTAS.signInPerIp },
    { key: `signin:email:${email.trim().toLowerCase()}`, quota: QUOTAS.signInPerIp },
  ]);
  if (!limit.ok) {
    return { error: `Too many sign-in attempts. Try again in ${Math.ceil(limit.retryAfter / 60)} minutes.` };
  }

  const user = await authenticate(email, password);
  if (!user) return { error: "That email and password don't match an account." };

  await startSession(user.id);
  redirect(safeNext(field(data, "next")));
}

export async function signUpAction(_prev: { error?: string } | null, data: FormData) {
  ensureSeeded();

  const limit = rateLimitAll([{ key: `signup:ip:${await callerIp()}`, quota: QUOTAS.signUpPerIp }]);
  if (!limit.ok) {
    return { error: "Too many accounts created from here recently. Try again later." };
  }

  const result = await createUser({
    email: field(data, "email"),
    name: field(data, "name"),
    password: field(data, "password"),
  });
  if ("error" in result) return result;

  // Best effort: a mail provider being down must not stop someone signing up.
  // The dashboard shows an unverified banner with a resend either way.
  void sendVerificationEmail(result.user).catch(() => {});

  await startSession(result.user.id);
  redirect("/connect");
}

export async function signOutAction() {
  await endSession();
  const store = await cookies();
  store.delete(BUSINESS_COOKIE);
  redirect("/");
}
