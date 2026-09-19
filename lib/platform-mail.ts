import "server-only";

/**
 * Mail the product itself sends — password resets, and nothing else so far.
 *
 * Deliberately separate from lib/delivery.ts, which sends *on behalf of a
 * workspace* using that workspace's own Resend key. A password reset happens
 * before anyone knows which workspace is involved, and it would be wrong to
 * spend a customer's sending reputation on our transactional mail.
 */

/**
 * Where platform mail is posted.
 *
 * Resend by default. Overridable because some deployments send through a
 * Resend-compatible relay inside their own network — and because a mail path
 * that can only be exercised against the real provider is a mail path nobody
 * checks until a customer does not get their password reset.
 */
function endpoint(): string {
  return (process.env.RESEND_API_BASE?.trim().replace(/\/$/, "") || "https://api.resend.com") + "/emails";
}

export function platformMailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.AUTH_FROM_EMAIL?.trim());
}

export interface MailResult {
  sent: boolean;
  detail: string;
}

export async function sendPlatformEmail(input: {
  to: string;
  subject: string;
  body: string;
}): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.AUTH_FROM_EMAIL?.trim();
  if (!apiKey || !from) {
    return { sent: false, detail: "RESEND_API_KEY and AUTH_FROM_EMAIL are not set" };
  }

  try {
    const response = await fetch(endpoint(), {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: input.to, subject: input.subject, text: input.body }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 200);
      return { sent: false, detail: `Resend returned ${response.status}: ${detail}` };
    }
    return { sent: true, detail: "sent" };
  } catch (error) {
    return { sent: false, detail: error instanceof Error ? error.message.slice(0, 200) : "send failed" };
  }
}
