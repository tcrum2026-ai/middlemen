"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { authenticate, createUser, endSession, startSession } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";
import { BUSINESS_COOKIE } from "@/lib/session";

function field(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}

const FALLBACK = "/dashboard";

/**
 * Only same-site paths. Prefix checks are not enough: the URL parser treats a
 * backslash as a slash for http(s), so "/\evil.com" resolves to another origin
 * while looking like a relative path. Resolve it and compare origins instead.
 */
function safeNext(raw: string): string {
  if (!raw || !raw.startsWith("/") || raw.includes("\\")) return FALLBACK;
  try {
    const sentinel = "https://middlemen.invalid";
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

  const user = await authenticate(email, password);
  if (!user) return { error: "That email and password don't match an account." };

  await startSession(user.id);
  redirect(safeNext(field(data, "next")));
}

export async function signUpAction(_prev: { error?: string } | null, data: FormData) {
  ensureSeeded();
  const result = await createUser({
    email: field(data, "email"),
    name: field(data, "name"),
    password: field(data, "password"),
  });
  if ("error" in result) return result;

  await startSession(result.user.id);
  redirect("/connect");
}

export async function signOutAction() {
  await endSession();
  const store = await cookies();
  store.delete(BUSINESS_COOKIE);
  redirect("/");
}
