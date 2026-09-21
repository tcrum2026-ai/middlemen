/**
 * Whether a workspace may answer, given what it has used and what it pays for.
 *
 * Pure on purpose: the counting lives in lib/entitlement.ts, which needs the
 * database, but the decision itself does not. These are the rules that decide
 * whether a paying customer's phone gets answered, so they are worth being
 * able to test exhaustively rather than by hand.
 */

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";

/** Mirrors lib/marketing.ts. Repeated rather than imported so this module
 *  stays free of every other import and runnable straight from a test. */
export type PlanId = "starter" | "pro" | "business";

export interface Allowance {
  conversations: number;
  voiceMinutes: number;
}

export interface Block {
  /** Approval-queue heading for a captured message. */
  title: string;
  /** Written for the operator, not the customer. */
  reason: string;
}

export interface RuleInput {
  status: SubscriptionStatus;
  /** Epoch ms, or 0 when the workspace has no trial end recorded. */
  trialEndsAt: number;
  now: number;
  conversationsUsed: number;
  allowance: Allowance;
  /**
   * True when the owner has not confirmed their email address *and* this
   * deployment can actually send them a link. Never true where platform mail
   * is unconfigured, because then there is nothing they could do about it.
   */
  ownerUnverified?: boolean;
}

/**
 * Returns why the assistant must stop, or null when it may carry on.
 *
 * Order matters and is deliberate: a cancelled subscription outranks a failed
 * payment, which outranks an expired trial, which outranks a used-up
 * allowance. Each is a more fundamental reason than the next, and the operator
 * should be told the root cause rather than a symptom of it.
 */
export function blockFor(input: RuleInput): Block | null {
  if (input.status === "canceled") {
    return {
      title: "Needs a reply — subscription cancelled",
      reason: "This workspace's subscription was cancelled.",
    };
  }

  if (input.status === "past_due") {
    return {
      title: "Needs a reply — payment failed",
      reason: "The last payment failed. Update the card to start answering again.",
    };
  }

  // A trial with no recorded end date never expires: a missing value is a bug
  // in our data, and taking a customer's service away over one is the wrong
  // way round.
  if (input.status === "trialing" && input.trialEndsAt > 0 && input.trialEndsAt < input.now) {
    return {
      title: "Needs a reply — trial ended",
      reason: "The free trial has ended. Choose a plan to start answering again.",
    };
  }

  /**
   * A trial spends real money — model calls and, if voice is on, carrier
   * minutes — on an address nobody has proved they can receive. That is the
   * whole shape of trial farming. Paid plans are not gated on it: they have
   * already been charged, and holding a paying customer's service hostage
   * over an unclicked link is not the same trade at all.
   */
  if (input.status === "trialing" && input.ownerUnverified) {
    return {
      title: "Needs a reply — email not confirmed",
      reason: "Confirm your email address and the assistant starts answering.",
    };
  }

  if (input.conversationsUsed >= input.allowance.conversations) {
    return {
      title: "Needs a reply — allowance reached",
      reason: `This month's ${input.allowance.conversations.toLocaleString()} conversations are used up.`,
    };
  }

  return null;
}

/** Whole days left on a trial, floored at zero. */
export function trialDaysLeft(trialEndsAt: number, now: number): number {
  if (!trialEndsAt) return 0;
  return Math.max(0, Math.ceil((trialEndsAt - now) / 86_400_000));
}

/**
 * Minutes past the allowance, and what they cost.
 *
 * Voice overage bills rather than blocks — that is what the per-minute rate on
 * the pricing page is for. A trial is never charged for it.
 */
export function overage(
  voiceMinutesUsed: number,
  allowance: Allowance,
  ratePerMinute: number | null,
  trialing: boolean,
): { minutes: number; cents: number } {
  const minutes = Math.max(0, voiceMinutesUsed - allowance.voiceMinutes);
  const rate = trialing ? 0 : (ratePerMinute ?? 0);
  return { minutes, cents: Math.round(minutes * rate * 100) };
}

/**
 * A trial is deliberately smaller than any paid plan: enough to prove the
 * thing works, not enough to run a business on for free. Pulled out of
 * entitlement.ts so the same rule can decide what to report to Stripe's
 * metered billing as it decides what to show on the billing page — two
 * copies of "which allowance applies" is how they drift and one starts
 * charging for minutes the other says are still included.
 */
export function allowanceFor(
  trialing: boolean,
  plan: Allowance,
  trialAllowance: Allowance,
): Allowance {
  return trialing ? trialAllowance : plan;
}

/** The three Stripe price ids, one per plan. */
export type PriceMap = Partial<Record<PlanId, string>>;

/**
 * Which plan a Stripe object is actually being billed for.
 *
 * Not the plan in its metadata. We write that once, when Checkout creates the
 * subscription, and Stripe never rewrites it — so after a customer switches
 * plan in the billing portal, the metadata still names what they bought
 * originally while the price names what they now pay. Trusting the metadata
 * means a downgrade keeps the old allowance (they pay Starter money for
 * Business limits) and an upgrade doesn't grant the new one (they pay
 * Business money and stay capped at Starter). The price is the fact; the
 * metadata is a memory.
 *
 * Returns null when no price on the object maps to a known plan, which the
 * caller should treat as "leave the recorded plan alone" rather than guess.
 */
export function planForPrice(object: unknown, prices: PriceMap): PlanId | null {
  const priceId = extractPriceId(object);
  if (!priceId) return null;
  for (const [plan, configured] of Object.entries(prices)) {
    if (configured && configured === priceId) return plan as PlanId;
  }
  return null;
}

/**
 * Digs the price id out of a subscription or an invoice.
 *
 * Their shapes differ, and the invoice line shape changed across Stripe API
 * versions — `price.id` on older ones, `pricing.price_details.price` on
 * newer. Both are checked rather than pinning a version, because a
 * deployment's Stripe account decides which it gets, not us.
 */
function extractPriceId(object: unknown): string | null {
  if (!object || typeof object !== "object") return null;
  const o = object as Record<string, unknown>;

  const rows = [
    ...asRows(o.items),
    ...asRows(o.lines),
  ];

  for (const row of rows) {
    const price = row.price as { id?: unknown } | undefined;
    if (price && typeof price.id === "string") return price.id;

    const pricing = row.pricing as { price_details?: { price?: unknown } } | undefined;
    const detail = pricing?.price_details?.price;
    if (typeof detail === "string") return detail;
  }
  return null;
}

function asRows(value: unknown): Record<string, unknown>[] {
  if (!value || typeof value !== "object") return [];
  const data = (value as { data?: unknown }).data;
  return Array.isArray(data) ? (data.filter((r) => r && typeof r === "object") as Record<string, unknown>[]) : [];
}
