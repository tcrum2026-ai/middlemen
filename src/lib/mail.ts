const RESEND_API_URL = "https://api.resend.com/emails";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

// Optional: without RESEND_API_KEY / RESEND_FROM_EMAIL configured, this logs
// instead of sending — callers must not depend on delivery having happened
// (e.g. the forgot-password flow always shows the same message either way).
export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    console.log(`[mail] Resend not configured — skipping email to ${to}: "${subject}"`);
    return;
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!res.ok) {
      console.error(`[mail] Resend request failed (${res.status}): ${await res.text()}`);
    }
  } catch (err) {
    console.error("[mail] Failed to send email:", err);
  }
}

const siteUrl = () => process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function sendNewOfferEmail(
  to: string,
  params: { requestTitle: string; requestId: string; companyName: string },
): Promise<void> {
  await sendEmail({
    to,
    subject: `New offer on "${params.requestTitle}"`,
    html: `
      <p>${params.companyName} just submitted an offer on your request "${params.requestTitle}".</p>
      <p><a href="${siteUrl()}/dashboard/customer/requests/${params.requestId}">View the offer</a></p>
    `,
  });
}

export async function sendOfferAcceptedEmail(
  to: string,
  params: { requestTitle: string; dealId: string },
): Promise<void> {
  await sendEmail({
    to,
    subject: `Your offer on "${params.requestTitle}" was accepted`,
    html: `
      <p>Good news — your offer on "${params.requestTitle}" was accepted.</p>
      <p><a href="${siteUrl()}/dashboard/business/deals/${params.dealId}">View the deal</a></p>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    // Dev/staging fallback so the flow is testable before a Resend domain is
    // configured — the reset link only ever reaches server logs, never the
    // client response, so this can't be used to enumerate accounts.
    console.log(`[mail] Password reset link for ${to}: ${resetUrl}`);
  }

  await sendEmail({
    to,
    subject: "Reset your DealBridge password",
    html: `
      <p>Someone requested a password reset for your DealBridge account.</p>
      <p><a href="${resetUrl}">Click here to choose a new password</a>. This link expires in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });
}
