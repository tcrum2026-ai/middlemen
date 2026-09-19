/**
 * Whether a workspace may answer, given what it has used and what it pays for.
 *
 * Pure on purpose: the counting lives in lib/entitlement.ts, which needs the
 * database, but the decision itself does not. These are the rules that decide
 * whether a paying customer's phone gets answered, so they are worth being
 * able to test exhaustively rather than by hand.
 */

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";

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
