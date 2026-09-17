import Link from "next/link";
import { Badge, Card, PageHeader, usd } from "@/components/ui";
import { activeBusiness } from "@/lib/session";
import { usage } from "@/lib/repo";
import { PLANS } from "@/lib/marketing";

function monthLabel(offset: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() - offset);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default async function BillingPage() {
  const business = await activeBusiness();
  const stats = usage(business.id);
  const plan = PLANS.find((p) => p.name === "Team")!;
  const pct = Math.min(100, Math.round((stats.conversationsThisMonth / stats.included) * 100));

  return (
    <div>
      <PageHeader
        title="Billing & usage"
        subtitle="What you're on, what you've used, and what it would cost to leave."
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">{plan.name} plan</h2>
                  <Badge tone="jade">active</Badge>
                </div>
                <p className="mt-1 text-sm text-mist-400">{plan.blurb}</p>
              </div>
              <p className="text-2xl font-semibold tabular-nums">
                ${plan.monthly}
                <span className="text-sm font-normal text-mist-400">/mo</span>
              </p>
            </div>

            <div className="mt-6">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-mist-300">Conversations this month</span>
                <span className="tabular-nums">
                  {stats.conversationsThisMonth.toLocaleString()} / {stats.included.toLocaleString()}
                </span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink-800">
                <div
                  className="h-full rounded-full bg-jade-500"
                  style={{ width: `${Math.max(pct, 1)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-mist-400">
                A conversation is one customer thread, however many messages it takes. You are billed nothing extra
                for a long one.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/#pricing" className="btn btn-ghost">Compare plans</Link>
              <Link href="/dashboard/settings" className="btn btn-ghost">Export or delete your data</Link>
            </div>
          </Card>

          <Card className="!p-0">
            <div className="border-b border-ink-700 px-5 py-3.5">
              <h2 className="font-semibold">This month, in detail</h2>
            </div>
            <dl className="divide-y divide-ink-800">
              {[
                ["Conversations opened", stats.conversationsThisMonth],
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

          <Card className="!p-0">
            <div className="border-b border-ink-700 px-5 py-3.5">
              <h2 className="font-semibold">Invoices</h2>
            </div>
            <ul className="divide-y divide-ink-800">
              {[0, 1, 2].map((offset) => (
                <li key={offset} className="flex flex-wrap items-center gap-3 px-5 py-3.5 text-sm">
                  <span className="min-w-0 flex-1">{monthLabel(offset)}</span>
                  <Badge tone={offset === 0 ? "slate" : "jade"}>{offset === 0 ? "current" : "paid"}</Badge>
                  <span className="w-20 text-right tabular-nums">{usd(plan.monthly! * 100)}</span>
                </li>
              ))}
            </ul>
            <p className="px-5 py-3 text-xs text-mist-400">
              This workspace is a demo — no payment method is attached and nothing has been charged.
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
            <h2 className="text-sm font-semibold">Cancel</h2>
            <p className="mt-2 text-sm text-mist-400">
              One click, effective at the end of the period you&apos;ve paid for. We don&apos;t ask why, and there is
              no retention flow.
            </p>
            <button
              disabled
              title="No billing provider is connected in this demo workspace"
              className="btn btn-ghost mt-4 w-full cursor-not-allowed justify-center opacity-40"
            >
              Cancel subscription
            </button>
            <p className="mt-2 text-xs text-mist-400">
              Disabled here: this workspace has no billing provider connected, so there is nothing to cancel.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
