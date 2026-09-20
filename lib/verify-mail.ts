import "server-only";
import { headers } from "next/headers";
import { createEmailVerification, verificationAvailable, type User } from "./auth";
import { sendPlatformEmail } from "./platform-mail";

/**
 * Sends the "is this really your address" email.
 *
 * Shared by sign-up and the resend button so the wording and the link shape
 * can only be written once. Silently does nothing when platform mail is not
 * configured — there is no link to deliver, and every surface that asks about
 * verification checks `verificationAvailable()` before saying a word about it.
 */
export async function sendVerificationEmail(user: User): Promise<{ sent: boolean; detail: string }> {
  if (!verificationAvailable()) return { sent: false, detail: "platform mail is not configured" };

  const token = createEmailVerification(user.id);
  const link = `${await siteUrl()}/verify?token=${encodeURIComponent(token)}`;

  return sendPlatformEmail({
    to: user.email,
    subject: "Confirm your email for Lobby",
    body:
      `Hi ${user.name},\n\n` +
      `Confirm this address so your assistant can start answering, and so we can ` +
      `reach you about your account:\n\n${link}\n\n` +
      `The link works for two days. If you didn't create a Lobby account, ignore ` +
      `this email — nothing was set up in your name that we will keep.\n\n` +
      `— Lobby`,
  });
}

async function siteUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
