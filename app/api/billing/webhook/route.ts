import { ensureSeeded } from "@/lib/seed";
import { stripeSignatureValid } from "@/lib/billing";
import { getBusiness, setSubscription } from "@/lib/repo";
import type { PlanId } from "@/lib/marketing";
import type { Business } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe tells us a subscription started, renewed, failed or ended.
 *
 * Fails closed: without a webhook secret this endpoint accepts nothing, because
 * an unverified billing webhook is a way for a stranger to grant themselves a
 * paid plan.
 */
export async function POST(request: Request) {
  ensureSeeded();

  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error("Stripe webhook rejected: STRIPE_WEBHOOK_SECRET is not set.");
    return Response.json({ error: "Billing is not configured" }, { status: 503 });
  }

  const raw = await request.text();
  if (!(await stripeSignatureValid(raw, request.headers.get("stripe-signature"), secret))) {
    return Response.json({ error: "Bad signature" }, { status: 403 });
  }

  let event: { type?: string; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const object = event.data?.object ?? {};

  // Checkout sessions and subscriptions carry our metadata directly. Invoices
  // do not — Stripe copies the subscription's metadata onto them under
  // subscription_details instead, so both places have to be checked.
  const details = (object.subscription_details ?? {}) as { metadata?: Record<string, string> };
  const metadata = {
    ...(details.metadata ?? {}),
    ...((object.metadata ?? {}) as Record<string, string>),
  };
  const businessId = metadata.business_id ?? "";
  const business = businessId ? getBusiness(businessId) : null;

  // An event for a workspace we don't have is not an error worth retrying.
  if (!business) {
    console.warn(`Stripe event ${event.type} had no matching workspace (${businessId || "no id"}).`);
    return Response.json({ received: true });
  }

  const plan = (metadata.plan as PlanId) || business.plan;
  const customer = typeof object.customer === "string" ? object.customer : business.stripe_customer_id;
  const subscription =
    typeof object.subscription === "string"
      ? object.subscription
      : typeof object.id === "string" && String(event.type).startsWith("customer.subscription")
        ? object.id
        : business.stripe_subscription_id;

  /**
   * Stripe's own subscription status, translated to ours.
   *
   * This matters more than it looks: `customer.subscription.updated` fires for
   * a cancellation and a failed payment as well as an upgrade, so treating the
   * event type alone as "they paid" would keep a dead subscription answering.
   */
  function fromStripeStatus(status: unknown): Business["subscription_status"] | null {
    switch (status) {
      case "active":
      case "trialing":
        return "active";
      case "past_due":
      case "unpaid":
      case "incomplete":
        return "past_due";
      case "canceled":
      case "incomplete_expired":
        return "canceled";
      default:
        return null;
    }
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "invoice.paid":
      setSubscription(business.id, {
        plan,
        subscription_status: "active",
        stripe_customer_id: customer,
        stripe_subscription_id: subscription,
      });
      break;

    case "customer.subscription.created":
    case "customer.subscription.updated":
      setSubscription(business.id, {
        plan,
        // The object's own status wins; an unrecognised one is left alone
        // rather than guessed at.
        subscription_status: fromStripeStatus(object.status) ?? business.subscription_status,
        stripe_customer_id: customer,
        stripe_subscription_id: subscription,
      });
      break;

    case "invoice.payment_failed":
      setSubscription(business.id, { subscription_status: "past_due" });
      break;

    case "customer.subscription.deleted":
      setSubscription(business.id, { subscription_status: "canceled" });
      break;

    default:
      // Everything else is noise we deliberately ignore.
      break;
  }

  return Response.json({ received: true });
}
