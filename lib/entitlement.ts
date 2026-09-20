import "server-only";
import { getDb } from "./db";
import { getUserById, needsVerification } from "./auth";
import { TRIAL_ALLOWANCE, planById, type Plan } from "./marketing";
import { blockFor, overage, trialDaysLeft, type Allowance } from "./plan-rules";
import type { Business } from "./types";

/**
 * What a workspace is allowed this month, and whether it has run out.
 *
 * This module does the counting; lib/plan-rules.ts holds the decision, so the
 * rules can be tested without a database. Written conversations and
 * answered-call minutes are counted separately because they cost roughly 3x
 * apart to serve — see PRICING.md. Running out never drops a customer's
 * message: the assistant stops replying and the thread is handed to a person,
 * which is what the terms promise.
 */

export type { Allowance } from "./plan-rules";

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
  const trialEndsAt = business.trial_ends_at ? new Date(business.trial_ends_at).getTime() : 0;
  const trialing = business.subscription_status === "trialing";
  const now = Date.now();

  // A trial is deliberately smaller than any paid plan: enough to prove the
  // thing works, not enough to run a business on for free.
  const allowance: Allowance = trialing
    ? { conversations: TRIAL_ALLOWANCE.conversations, voiceMinutes: TRIAL_ALLOWANCE.voiceMinutes }
    : { conversations: plan.conversations, voiceMinutes: plan.voiceMinutes };

  const block = blockFor({
    status: business.subscription_status,
    trialEndsAt,
    now,
    conversationsUsed: conversations,
    allowance,
    // Only looked up while trialing: this runs on every inbound message, and
    // a paid workspace has no reason to pay for the query.
    ownerUnverified: trialing && needsVerification(business.owner_id ? getUserById(business.owner_id) : null),
  });

  const over = overage(voiceMinutes, allowance, plan.overagePerMinute, trialing);

  return {
    plan,
    status: business.subscription_status,
    trialing,
    trialDaysLeft: trialDaysLeft(trialEndsAt, now),
    allowance,
    used: { conversations, voiceMinutes },
    canAnswer: block === null,
    blockedReason: block?.reason ?? null,
    blockedTitle: block?.title ?? null,
    overageMinutes: over.minutes,
    overageCents: over.cents,
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
