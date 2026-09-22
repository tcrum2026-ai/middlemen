import Link from "next/link";
import { Badge, Card, PageHeader } from "@/components/ui";
import { workspace } from "@/lib/session";
import { usage } from "@/lib/repo";
import { entitlement } from "@/lib/entitlement";
import { billingConfigured, voiceMeterConfigured } from "@/lib/billing";
import { usd } from "@/components/ui";
import { ManageBilling, PlanPicker } from "./plan-picker";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ subscribed?: string }>;
}) {
  const { business, canWrite } = await workspace();
  const justSubscribed = (await searchParams).subscribed === "1";
  const configured = billingConfigured();
  const stats = usage(business.id);
  const state = entitlement(business);
  const plan = state.plan;
  const paying = state.status === "active" || state.status === "past_due";
  // Stripe already knows this customer and is charging them, so plan changes
  // and cancellation belong in its portal, not in a second Checkout session.
  const manageable = configured && paying && Boolean(business.stripe_customer_id);
  const pct = Math.min(100, Math.round((state.used.conversations / state.allowance.conversations) * 100));
  const voicePct = state.allowance.voiceMinutes
    ? Math.min(100, Math.round((state.used.voiceMinutes / state.allowance.voiceMinutes) * 100))
    : 0;

  return (
    <div>
      <PageHeader
        title="Billing & usage"
        subtitle="What you're on, what you've used, and what it would cost to leave."
      />

      {justSubscribed ? (
        <div className="mb-5 rounded-xl border border-jade-500/30 bg-jade-500/[0.06] px-4 py-3 text-sm text-mist-200">
          <span className="font-medium text-jade-400">Payment received.</span> Stripe confirms subscriptions to us
          in the background, so the plan below updates within a few seconds of the receipt landing in your inbox.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{plan.name} plan</h2>
                  {state.trialing ? (
                    <Badge tone={state.trialDaysLeft > 3 ? "jade" : "amber"}>
                      {state.trialDaysLeft > 0 ? `trial · ${state.trialDaysLeft} days left` : "trial ended"}
                    </Badge>
                  ) : (
                    <Badge tone={state.status === "active" ? "jade" : "rose"}>{state.status}</Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-mist-400">{plan.blurb}</p>
              </div>
              <div className="ml-auto shrink-0 text-right">
                {state.trialing ? (
                  <>
                    <p className="text-2xl font-semibold text-jade-400">Free</p>
                    <p className="text-sm text-mist-400">then ${plan.monthly}/mo</p>
                  </>
                ) : (
                  <p className="text-2xl font-semibold tabular-nums">
                    ${plan.monthly}
                    <span className="text-sm font-normal text-mist-400">/mo</span>
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-mist-300">Conversations this month</span>
                <span className="tabular-nums">
                  {state.used.conversations.toLocaleString()} / {state.allowance.conversations.toLocaleString()}
                </span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink-800">
                <div
                  className="h-full rounded-full bg-jade-500"
                  style={{ width: `${state.used.conversations ? Math.max(pct, 1) : 0}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-mist-400">
                A conversation is one customer thread, however many messages it takes. You are billed nothing extra
                for a long one.
              </p>

              {state.allowance.voiceMinutes > 0 ? (
                <div className="mt-5">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-mist-300">Answered call minutes</span>
                    <span className="tabular-nums">
                      {state.used.voiceMinutes.toLocaleString()} / {state.allowance.voiceMinutes.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink-800">
                    <div
                      className={`h-full rounded-full ${state.overageMinutes ? "bg-amber-glow" : "bg-jade-500"}`}
                      style={{ width: `${state.used.voiceMinutes ? Math.max(voicePct, 1) : 0}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-mist-400">
                    {state.trialing
                      ? "Trial minutes are free. When they run out the assistant stops answering calls and they " +
                        "ring your handoff number instead."
                      : state.overageMinutes
                        ? `${state.overageMinutes} minute${state.overageMinutes === 1 ? "" : "s"} over, worth ` +
                          `${usd(state.overageCents)}. ` +
                          (voiceMeterConfigured()
                            ? "Reported to Stripe automatically as calls end."
                            : "Lobby measures this; it does not yet bill it automatically, so add it to their " +
                              "invoice yourself.")
                        : `Extra minutes are $${(plan.overagePerMinute ?? 0).toFixed(2)} each, measured to the second.`}
                  </p>
                </div>
              ) : (
                <p className="mt-5 text-xs text-mist-400">
                  This plan does not include answering calls. Pro adds the phone.
                </p>
              )}

              {state.blockedReason ? (
                <p className="mt-5 rounded-lg border border-amber-glow/30 bg-amber-glow/[0.06] px-3 py-2 text-sm text-mist-200">
                  <span className="font-medium text-amber-glow">The assistant has stopped answering.</span>{" "}
                  {state.blockedReason} Messages are still captured and handed to your team.
                </p>
              ) : null}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/#pricing" className="btn btn-ghost">Compare plans</Link>
              <Link href="/dashboard/settings" className="btn btn-ghost">Export or delete your data</Link>
            </div>
          </Card>

          <Card>
            <h2 className="font-semibold">{state.trialing ? "Pick a plan" : "Change plan"}</h2>
            <p className="mt-1 mb-4 text-sm text-mist-400">
              {state.trialing
                ? "Your trial keeps working until you do. Subscribing lifts the allowance the same minute the payment clears."
                : "Switching takes effect immediately; Stripe prorates the difference on your next invoice."}
            </p>
            {canWrite ? (
              <PlanPicker
                currentPlan={plan.id}
                paying={paying}
                manageable={manageable}
                configured={configured}
              />
            ) : (
              <p className="rounded-lg border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-mist-400">
                This is the read-only demo workspace.{" "}
                <Link href="/signup" className="link">
                  Create your own
                </Link>{" "}
                to subscribe.
              </p>
            )}
          </Card>

          <Card className="!p-0">
            <div className="border-b border-ink-700 px-5 py-3.5">
              <h2 className="font-semibold">This month, in detail</h2>
            </div>
            <dl className="divide-y divide-ink-800">
              {[
                ["Conversations opened", state.used.conversations],
                ["Messages exchanged", stats.messagesThisMonth],
                ["Handled without a person", stats.aiHandled],
                ["Escalated to a person", stats.escalated],
                ["Calls queued for your team", stats.callsQueued],
                ["Follow-ups sent", stats.followUpsSent],
              ].map(([label, value]) => (
                <div key={label as string} className="flex items-center justify-between px-5 py-3 text-sm">
                  <dt className="text-mist-300">{label}</dt>
                  <dd className="tabular-nums">{(value as number).toLocaleString()}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <h2 className="font-semibold">Invoices</h2>
            <p className="mt-2 text-sm leading-relaxed text-mist-400">
              {configured
                ? "Receipts and invoices are emailed by Stripe, and every past invoice lives in the billing portal Stripe links from those emails."
                : "No payment provider is connected on this deployment, so there are no invoices to show."}
            </p>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <h2 className="text-sm font-semibold">What happens if you stop</h2>
            <ul className="mt-3 space-y-2.5 text-sm text-mist-300">
              <li>The assistant stops replying immediately — no wind-down period.</li>
              <li>Your conversations, contacts and knowledge stay exportable for 30 days.</li>
              <li>Deleting the workspace deletes them straight away.</li>
              <li>No exit fee, no export fee, no call with anyone.</li>
            </ul>
            <Link href="/dashboard/settings" className="btn btn-ghost mt-4 w-full justify-center">
              Export everything now
            </Link>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold">Cancelling</h2>
            <p className="mt-2 text-sm text-mist-400">
              {manageable
                ? "One click, and it takes effect at the end of the period you've paid for — no retention flow, no phone call. The assistant keeps answering until then. Your card lives at Stripe, so this is also where you change it."
                : state.trialing
                  ? "Nothing to cancel — you haven't been charged, and you won't be unless you pick a plan. Let the trial run out and the assistant simply stops answering."
                  : "There's no live subscription on this workspace, so there's nothing to cancel."}
            </p>
            {manageable ? <ManageBilling /> : null}
          </Card>
        </aside>
      </div>
    </div>
  );
}
