import "server-only";
import { getDb } from "./db";
import { TRIAL_ALLOWANCE, planById, type Plan } from "./marketing";
import type { Business } from "./types";

/**
 * What a workspace is allowed this month, and whether it has run out.
 *
 * Written conversations and answered-call minutes are counted separately
 * because they cost roughly 3x apart to serve — see PRICING.md. Running out
 * never drops a customer's message: the assistant stops replying and the thread
 * is handed to a person, which is what the terms promise.
 */

export interface Allowance {
  conversations: number;
  voiceMinutes: number;
}

export interface Entitlement {
  plan: Plan;
  /** Trial, paid, lapsed. */
  status: Business["subscription_status"];
  trialing: boolean;
  trialDaysLeft: number;
  allowance: Allowance;
  used: { conversations: number; voiceMinutes: number };
  /** True when the assistant may answer. */
  canAnswer: boolean;
  /** Why not, when it may not. Written for the operator, not the customer. */
  blockedReason: string | null;
  /** Approval-queue heading for a captured message. Matches the reason. */
  blockedTitle: string | null;
  overageMinutes: number;
  overageCents: number;
}

function monthStart(): string {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

export function entitlement(business: Business): Entitlement {
  const db = getDb();
  const since = monthStart();

  const conversations = (
    db
      .prepare("SELECT COUNT(*) AS c FROM conversations WHERE business_id = ? AND created_at >= ?")
      .get(business.id, since) as { c: number }
  ).c;

  const voiceSeconds = (
    db
      .prepare(
        "SELECT COALESCE(SUM(duration_seconds), 0) AS s FROM conversations " +
          "WHERE business_id = ? AND channel = 'voice' AND created_at >= ?",
      )
      .get(business.id, since) as { s: number }
  ).s;
  const voiceMinutes = Math.ceil(voiceSeconds / 60);

  const plan = planById(business.plan);
  const trialEnds = business.trial_ends_at ? new Date(business.trial_ends_at).getTime() : 0;
  const trialing = business.subscription_status === "trialing";
  const trialExpired = trialing && trialEnds > 0 && trialEnds < Date.now();
  const trialDaysLeft = trialEnds ? Math.max(0, Math.ceil((trialEnds - Date.now()) / 86_400_000)) : 0;

  // A trial is deliberately smaller than any paid plan: enough to prove the
  // thing works, not enough to run a business on for free.
  const allowance: Allowance = trialing
    ? { conversations: TRIAL_ALLOWANCE.conversations, voiceMinutes: TRIAL_ALLOWANCE.voiceMinutes }
    : { conversations: plan.conversations, voiceMinutes: plan.voiceMinutes };

  let blockedReason: string | null = null;
  let blockedTitle: string | null = null;
  if (business.subscription_status === "canceled") {
    blockedTitle = "Needs a reply — subscription cancelled";
    blockedReason = "This workspace's subscription was cancelled.";
  } else if (business.subscription_status === "past_due") {
    blockedTitle = "Needs a reply — payment failed";
    blockedReason = "The last payment failed. Update the card to start answering again.";
  } else if (trialExpired) {
    blockedTitle = "Needs a reply — trial ended";
    blockedReason = "The free trial has ended. Choose a plan to start answering again.";
  } else if (conversations >= allowance.conversations) {
    blockedTitle = "Needs a reply — allowance reached";
    blockedReason = `This month's ${allowance.conversations.toLocaleString()} conversations are used up.`;
  }

  // Minutes over the allowance bill rather than block — that is what the
  // per-minute rate on the pricing page is for.
  const overageMinutes = Math.max(0, voiceMinutes - allowance.voiceMinutes);
  const rate = trialing ? 0 : (plan.overagePerMinute ?? 0);

  return {
    plan,
    status: business.subscription_status,
    trialing,
    trialDaysLeft,
    allowance,
    used: { conversations, voiceMinutes },
    canAnswer: blockedReason === null,
    blockedReason,
    blockedTitle,
    overageMinutes,
    overageCents: Math.round(overageMinutes * rate * 100),
  };
}

/** True when this workspace may answer a call, as opposed to any message. */
export function canAnswerCalls(business: Business): boolean {
  if (!business.voice_enabled) return false;
  const state = entitlement(business);
  if (!state.canAnswer) return false;
  // Starter has no voice allowance at all; a trial gets a small one.
  return state.allowance.voiceMinutes > 0;
}
