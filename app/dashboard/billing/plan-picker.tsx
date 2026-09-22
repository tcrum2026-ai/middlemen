"use client";

import { useState } from "react";
import { CheckIcon } from "@/components/icons";
import { Badge } from "@/components/ui";
import { PLANS, type PlanId } from "@/lib/marketing";

/** Shared: ask the server for a Stripe URL and go there. */
async function open(
  path: string,
  body: Record<string, string>,
): Promise<string | null> {
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
    if (json.url) {
      window.location.href = json.url;
      return null;
    }
    return json.error ?? "Something went wrong. Try again in a moment.";
  } catch {
    return "Could not reach the server. Check your connection and try again.";
  }
}

/**
 * The only place in the product that starts a payment.
 *
 * Two different destinations, and the difference matters: a workspace with no
 * live subscription goes to Checkout, but one that is already being charged
 * goes to the billing portal instead. Checkout in subscription mode creates a
 * *new* subscription every time it runs — sending a paying customer through it
 * to "switch plans" would bill them for both.
 */
export function PlanPicker({
  currentPlan,
  paying,
  manageable,
  configured,
}: {
  currentPlan: PlanId;
  /** A subscription is being charged, not just selected. */
  paying: boolean;
  /** Stripe knows this customer, so plan changes belong in the portal. */
  manageable: boolean;
  configured: boolean;
}) {
  const [pending, setPending] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(plan: PlanId) {
    setError(null);
    setPending(plan);
    const message = manageable
      ? await open("/api/billing/portal", {})
      : await open("/api/billing/checkout", { plan });
    if (message) setError(message);
    setPending(null);
  }

  return (
    <div>
      {!configured ? (
        <p className="mb-4 rounded-lg border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-mist-400">
          No payment provider is connected on this deployment, so nothing can be charged yet. Set{" "}
          <code className="text-mist-200">STRIPE_SECRET_KEY</code> and the plan price ids to turn these on.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                onClick={() => choose(plan.id)}
                className={`btn mt-5 w-full justify-center ${
                  plan.featured && !current ? "btn-primary" : "btn-ghost"
                }`}
              >
                {current
                  ? "You're on this plan"
                  : pending === plan.id
                    ? "Opening…"
                    : manageable
                      ? `Switch to ${plan.name}`
                      : `Subscribe — $${plan.monthly}/mo`}
              </button>
            </div>
          );
        })}
      </div>

      {manageable ? (
        <p className="mt-4 text-xs text-mist-400">
          Switching opens Stripe, where the change takes effect immediately and the difference is prorated onto
          your next invoice. We never see your card.
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-rose-400/30 bg-rose-400/[0.06] px-3 py-2 text-sm text-mist-200"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * "Cancel in one click" is on the pricing page, so the click has to exist in
 * the product rather than in an email Stripe sent weeks ago.
 */
export function ManageBilling({ label = "Manage or cancel" }: { label?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setError(null);
          setBusy(true);
          const message = await open("/api/billing/portal", {});
          if (message) setError(message);
          setBusy(false);
        }}
        className="btn btn-ghost mt-4 w-full justify-center"
      >
        {busy ? "Opening…" : label}
      </button>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-mist-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
