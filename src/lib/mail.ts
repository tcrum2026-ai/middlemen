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

// Every field interpolated into an email body below can originate from
// free-text user input (a business name, a request title, an account
// display name, an admin's resolution note) and gets sent, as live HTML, to
// a *different* party's inbox — so it must be escaped, the same as
// rendering it in a browser would require. Unescaped, a title like
// `<a href="...">` would render as a real clickable link appearing to come
// from DealBridge itself.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Marks a string as already-safe HTML (a server-built URL, or another
// html`...` result being composed into a larger one) so `html` below
// passes it through unescaped instead of double-escaping it.
class SafeHtml {
  constructor(public readonly value: string) {}
}

export function raw(value: string): SafeHtml {
  return new SafeHtml(value);
}

// Tagged template that escapes every interpolated value by default —
// forgetting to call escapeHtml() on one field (the exact bug this file
// used to have) is no longer possible; call raw() explicitly for the rare
// value that's genuinely already-safe HTML, like a server-built URL.
function html(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce((result, str, i) => {
    if (i === 0) return str;
    const value = values[i - 1];
    const safe = value instanceof SafeHtml ? value.value : escapeHtml(String(value));
    return result + safe + str;
  }, "");
}

export async function sendNewOfferEmail(
  to: string,
  params: { requestTitle: string; requestId: string; companyName: string },
): Promise<void> {
  await sendEmail({
    to,
    // The subject line is plain text, not HTML — escaping it would show
    // literal "&#39;" etc. in the recipient's inbox, so it uses the raw value.
    subject: `New offer on "${params.requestTitle}"`,
    html: html`
      <p>${params.companyName} just submitted an offer on your request "${params.requestTitle}".</p>
      <p><a href="${raw(`${siteUrl()}/dashboard/customer/requests/${params.requestId}`)}">View the offer</a></p>
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
    html: html`
      <p>Good news — your offer on "${params.requestTitle}" was accepted.</p>
      <p><a href="${raw(`${siteUrl()}/dashboard/business/deals/${params.dealId}`)}">View the deal</a></p>
    `,
  });
}

export async function sendClaimApprovedEmail(to: string, companyName: string): Promise<void> {
  await sendEmail({
    to,
    subject: `Your claim on "${companyName}" was approved`,
    html: html`
      <p>You now own the "${companyName}" listing on DealBridge.</p>
      <p><a href="${raw(`${siteUrl()}/dashboard/business`)}">Manage your listing</a></p>
    `,
  });
}

export async function sendClaimRejectedEmail(to: string, companyName: string): Promise<void> {
  await sendEmail({
    to,
    subject: `Your claim on "${companyName}" was not approved`,
    html: html`
      <p>We couldn't verify your claim on "${companyName}", so it was not approved.</p>
      <p>If this is a mistake, you can submit a new claim with more detail on how to verify you own the business.</p>
    `,
  });
}

export async function sendNewMessageEmail(
  to: string,
  params: { requestTitle: string; dealPath: string },
): Promise<void> {
  await sendEmail({
    to,
    subject: `New message about "${params.requestTitle}"`,
    html: html`
      <p>You have a new message on the deal for "${params.requestTitle}".</p>
      <p><a href="${raw(`${siteUrl()}${params.dealPath}`)}">View the conversation</a></p>
    `,
  });
}

export async function sendNewClaimRequestEmail(
  to: string,
  params: { companyName: string; requesterName: string },
): Promise<void> {
  await sendEmail({
    to,
    subject: `New claim request on "${params.companyName}"`,
    html: html`
      <p>${params.requesterName} requested to claim "${params.companyName}" and needs manual review — every claim does, since a matching email domain is only a hint, never proof of ownership.</p>
      <p><a href="${raw(`${siteUrl()}/dashboard/admin/claims`)}">Review the request</a></p>
    `,
  });
}

export async function sendDealFlaggedEmail(
  to: string,
  params: { requestTitle: string; reporterName: string },
): Promise<void> {
  await sendEmail({
    to,
    subject: `Issue reported on "${params.requestTitle}"`,
    html: html`
      <p>${params.reporterName} reported an issue with the deal for "${params.requestTitle}".</p>
      <p><a href="${raw(`${siteUrl()}/dashboard/admin/disputes`)}">Review the report</a></p>
    `,
  });
}

export async function sendDealFlagResolvedEmail(
  to: string,
  params: { requestTitle: string; resolutionNote: string | null },
): Promise<void> {
  await sendEmail({
    to,
    subject: `Your reported issue on "${params.requestTitle}" was resolved`,
    html: html`
      <p>An admin reviewed the issue you reported on the deal for "${params.requestTitle}".</p>
      ${params.resolutionNote ? raw(html`<p>${params.resolutionNote}</p>`) : ""}
    `,
  });
}

export async function sendDealCompletedEmail(
  to: string,
  params: { requestTitle: string; companyName: string; dealId: string },
): Promise<void> {
  await sendEmail({
    to,
    subject: `"${params.requestTitle}" is marked complete — leave a review?`,
    html: html`
      <p>${params.companyName} marked your deal for "${params.requestTitle}" as complete.</p>
      <p><a href="${raw(`${siteUrl()}/dashboard/customer/deals/${params.dealId}`)}">Leave a review</a> to help other customers pick the best business.</p>
    `,
  });
}

export async function sendNewReviewEmail(
  to: string,
  params: { customerName: string; rating: number; companyName: string },
): Promise<void> {
  await sendEmail({
    to,
    subject: `${params.customerName} left ${params.companyName} a ${params.rating}-star review`,
    html: html`
      <p>${params.customerName} left ${params.companyName} a ${params.rating}-star review on DealBridge.</p>
      <p><a href="${raw(`${siteUrl()}/dashboard/business`)}">View your reviews</a></p>
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
    // resetUrl is server-built from a random hex token, never user text.
    html: html`
      <p>Someone requested a password reset for your DealBridge account.</p>
      <p><a href="${raw(resetUrl)}">Click here to choose a new password</a>. This link expires in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });
}
