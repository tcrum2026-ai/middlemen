import "server-only";
import { getDb, id, now } from "./db";
import { credentials } from "./integrations";
import { stripeApiBase } from "./billing";

export interface Delivery {
  id: string;
  business_id: string;
  channel: "email" | "sms" | "slack";
  recipient: string;
  subject: string | null;
  body: string;
  status: "sent" | "failed" | "skipped";
  detail: string | null;
  created_at: string;
}

function record(input: Omit<Delivery, "id" | "created_at">): Delivery {
  const delivery: Delivery = { ...input, id: id("dlv"), created_at: now() };
  getDb()
    .prepare(
      `INSERT INTO deliveries (id, business_id, channel, recipient, subject, body, status, detail, created_at)
       VALUES (@id, @business_id, @channel, @recipient, @subject, @body, @status, @detail, @created_at)`,
    )
    .run(delivery);
  return delivery;
}

export function listDeliveries(businessId: string, limit = 50): Delivery[] {
  return getDb()
    .prepare("SELECT * FROM deliveries WHERE business_id = ? ORDER BY created_at DESC LIMIT ?")
    .all(businessId, limit) as Delivery[];
}

async function post(url: string, init: RequestInit & { timeoutMs?: number }): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? 10_000);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Every send follows the same shape: no credentials means "skipped" with a
 * reason, never a silent no-op and never a thrown error that loses the message.
 */
export async function sendEmail(input: {
  businessId: string;
  to: string;
  subject: string;
  body: string;
}): Promise<Delivery> {
  const base = {
    business_id: input.businessId,
    channel: "email" as const,
    recipient: input.to,
    subject: input.subject,
    body: input.body,
  };

  const creds = credentials(input.businessId, "resend");
  if (!creds) {
    return record({ ...base, status: "skipped", detail: "No email provider connected" });
  }

  try {
    // Same override as platform mail, for the same two reasons: relays
    // exist, and a send path that can only be exercised against the real
    // provider is one nobody checks until a customer does not get their
    // appointment reminder.
    const endpoint =
      (process.env.RESEND_API_BASE?.trim().replace(/\/$/, "") || "https://api.resend.com") + "/emails";
    const response = await post(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: creds.from_email,
        to: [input.to],
        subject: input.subject,
        text: input.body,
      }),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 200);
      return record({ ...base, status: "failed", detail: `${response.status}: ${detail}` });
    }
    return record({ ...base, status: "sent", detail: null });
  } catch (error) {
    return record({ ...base, status: "failed", detail: message(error) });
  }
}

export async function sendSms(input: {
  businessId: string;
  to: string;
  body: string;
}): Promise<Delivery> {
  const base = {
    business_id: input.businessId,
    channel: "sms" as const,
    recipient: input.to,
    subject: null,
    body: input.body,
  };

  const creds = credentials(input.businessId, "twilio");
  if (!creds) {
    return record({ ...base, status: "skipped", detail: "No SMS provider connected" });
  }

  try {
    const response = await post(
      `https://api.twilio.com/2010-04-01/Accounts/${creds.account_sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${creds.account_sid}:${creds.auth_token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ From: creds.from_number, To: input.to, Body: input.body }),
      },
    );
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 200);
      return record({ ...base, status: "failed", detail: `${response.status}: ${detail}` });
    }
    return record({ ...base, status: "sent", detail: null });
  } catch (error) {
    return record({ ...base, status: "failed", detail: message(error) });
  }
}

export async function notifySlack(input: {
  businessId: string;
  text: string;
}): Promise<Delivery> {
  const base = {
    business_id: input.businessId,
    channel: "slack" as const,
    recipient: "channel",
    subject: null,
    body: input.text,
  };

  const creds = credentials(input.businessId, "slack");
  if (!creds) {
    return record({ ...base, status: "skipped", detail: "Slack not connected" });
  }

  try {
    const response = await post(creds.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: input.text }),
    });
    return response.ok
      ? record({ ...base, status: "sent", detail: null })
      : record({ ...base, status: "failed", detail: `${response.status}` });
  } catch (error) {
    return record({ ...base, status: "failed", detail: message(error) });
  }
}

/** A payment link for an accepted quote, when Stripe is connected. */
export async function createPaymentLink(input: {
  businessId: string;
  description: string;
  amountCents: number;
  currency?: string;
}): Promise<{ url: string } | { error: string }> {
  const creds = credentials(input.businessId, "stripe");
  if (!creds) return { error: "Stripe not connected" };

  try {
    const priceResponse = await post(`${stripeApiBase()}/v1/prices`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.secret_key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        currency: input.currency ?? "usd",
        unit_amount: String(input.amountCents),
        "product_data[name]": input.description.slice(0, 250),
      }),
    });
    if (!priceResponse.ok) return { error: await stripeMessage(priceResponse) };
    const price = (await priceResponse.json()) as { id: string };

    const linkResponse = await post(`${stripeApiBase()}/v1/payment_links`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.secret_key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ "line_items[0][price]": price.id, "line_items[0][quantity]": "1" }),
    });
    if (!linkResponse.ok) return { error: await stripeMessage(linkResponse) };

    const link = (await linkResponse.json()) as { url: string };
    return { url: link.url };
  } catch (error) {
    return { error: message(error) };
  }
}

/**
 * Stripe's refusal, as a sentence.
 *
 * The raw body is a JSON envelope; pasting that into the dashboard makes the
 * operator read a stack of braces to find the one line that tells them their
 * key is wrong. Stripe already masks the key inside the message.
 */
async function stripeMessage(response: Response): Promise<string> {
  const body = await response.text();
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    if (parsed.error?.message) return parsed.error.message.slice(0, 200);
  } catch {
    // Not JSON — a gateway error page, most likely. Fall through.
  }
  return body.slice(0, 200) || `Stripe returned ${response.status}`;
}

function message(error: unknown): string {
  if (error instanceof Error) return error.name === "AbortError" ? "Timed out" : error.message.slice(0, 200);
  return "Unknown error";
}
