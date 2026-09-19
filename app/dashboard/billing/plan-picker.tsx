"use client";

import { useState } from "react";
import { CheckIcon } from "@/components/icons";
import { Badge } from "@/components/ui";
import { PLANS, type PlanId } from "@/lib/marketing";

/**
 * The only place in the product that starts a payment.
 *
 * It posts to /api/billing/checkout and follows the URL Stripe returns rather
 * than embedding a payment form: card details never touch this origin, which
 * is the whole reason to use hosted Checkout.
 */
export function PlanPicker({
  currentPlan,
  paying,
  configured,
}: {
  currentPlan: PlanId;
  /** True once a subscription is actually being charged, not just selected. */
  paying: boolean;
  configured: boolean;
}) {
  const [pending, setPending] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function subscribe(plan: PlanId) {
    setError(null);
    setPending(plan);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const body = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (body.url) {
        window.location.href = body.url;
        return;
      }
      setError(body.error ?? "Could not start checkout. Try again in a moment.");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div>
      {!configured ? (
        <p className="mb-4 rounded-lg border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-mist-400">
          No payment provider is connected on this deployment, so nothing can be charged yet. Set{" "}
          <code className="text-mist-200">STRIPE_SECRET_KEY</code> and the plan price ids to turn these on.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const current = plan.id === currentPlan && paying;
          return (
            <div
              key={plan.id}
              className={`card flex flex-col p-5 ${
                plan.id === currentPlan ? "border-jade-500/40 bg-jade-500/[0.04]" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">{plan.name}</h3>
                {current ? <Badge tone="jade">Current</Badge> : null}
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                ${plan.monthly}
                <span className="text-sm font-normal text-mist-400">/mo</span>
              </p>
              <ul className="mt-4 flex-1 space-y-2">
                {plan.features.slice(0, 4).map((feature) => (
                  <li key={feature} className="flex gap-2 text-xs text-mist-300">
                    <CheckIcon width={14} height={14} className="mt-0.5 shrink-0 text-jade-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={!configured || current || pending !== null}
                onClick={() => subscribe(plan.id)}
                className={`btn mt-5 w-full justify-center ${
                  plan.featured && !current ? "btn-primary" : "btn-ghost"
                }`}
              >
                {current
                  ? "You're on this plan"
                  : pending === plan.id
                    ? "Opening checkout…"
                    : paying
                      ? `Switch to ${plan.name}`
                      : `Subscribe — $${plan.monthly}/mo`}
              </button>
            </div>
          );
        })}
      </div>

      {error ? (
        <p role="alert" className="mt-4 rounded-lg border border-rose-400/30 bg-rose-400/[0.06] px-3 py-2 text-sm text-mist-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}
