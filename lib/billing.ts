import "server-only";
import { planById, type PlanId } from "./marketing";

/**
 * Subscription billing for Lobby itself.
 *
 * Separate from the per-workspace Stripe key under Integrations, which exists so
 * a customer can take money from *their* customers. This one is ours: it is the
 * platform account that charges for plans.
 *
 * Unconfigured, every call here reports that plainly rather than half-working —
 * the same pattern as inbound email and password reset.
 */

export function billingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_WEBHOOK_SECRET?.trim());
}

/** Stripe price ids, one per plan. Set these after creating the products. */
export function priceIdFor(plan: PlanId): string {
  return (
    {
      starter: process.env.STRIPE_PRICE_STARTER,
      pro: process.env.STRIPE_PRICE_PRO,
      business: process.env.STRIPE_PRICE_BUSINESS,
    }[plan] ?? ""
  ).trim();
}

/** Every configured price id, for turning one back into a plan. */
export function configuredPrices(): Record<PlanId, string> {
  return {
    starter: priceIdFor("starter"),
    pro: priceIdFor("pro"),
    business: priceIdFor("business"),
  };
}

export interface CheckoutResult {
  url?: string;
  error?: string;
}

/**
 * Creates a Stripe Checkout session. Uses the REST API directly rather than the
 * Stripe SDK: this is two form-encoded calls, and a dependency that ships a
 * whole API surface for it is not worth the install.
 */
export async function createCheckoutSession(input: {
  plan: PlanId;
  businessId: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<CheckoutResult> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return { error: "Billing is not configured on this deployment." };

  const price = priceIdFor(input.plan);
  if (!price) return { error: `No Stripe price is configured for the ${planById(input.plan).name} plan.` };

  const form = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    customer_email: input.customerEmail,
    // Echoed back on the webhook — how we know which workspace to upgrade.
    "metadata[business_id]": input.businessId,
    "metadata[plan]": input.plan,
    "subscription_data[metadata][business_id]": input.businessId,
    "subscription_data[metadata][plan]": input.plan,
  });

  try {
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await response.json()) as { url?: string; error?: { message?: string } };
    if (!response.ok) return { error: body.error?.message ?? `Stripe returned ${response.status}` };
    return body.url ? { url: body.url } : { error: "Stripe did not return a checkout URL." };
  } catch (error) {
    return { error: error instanceof Error ? error.message.slice(0, 200) : "Could not reach Stripe." };
  }
}

// Verification lives in lib/signatures.ts, with the Twilio one and the tests
// that cover both. Re-exported here so callers keep a single billing import.
export { stripeSignatureValid } from "./signatures";

export interface PortalResult {
  url?: string;
  error?: string;
}

/**
 * Opens Stripe's billing portal for an existing customer.
 *
 * The pricing page says "cancel in one click". Without this, that click does
 * not exist anywhere in the product — the closest thing is a receipt email
 * with a link in it, which is not one click and not in the product. Stripe
 * hosts the portal, so cancelling, changing plan and updating a card all work
 * without us building three more screens or ever touching a card number.
 */
export async function createPortalSession(input: {
  customerId: string;
  returnUrl: string;
}): Promise<PortalResult> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return { error: "Billing is not configured on this deployment." };

  const form = new URLSearchParams({ customer: input.customerId, return_url: input.returnUrl });

  try {
    const response = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await response.json()) as { url?: string; error?: { message?: string } };
    if (!response.ok) return { error: body.error?.message ?? `Stripe returned ${response.status}` };
    return body.url ? { url: body.url } : { error: "Stripe did not return a portal URL." };
  } catch (error) {
    return { error: error instanceof Error ? error.message.slice(0, 200) : "Could not reach Stripe." };
  }
}
