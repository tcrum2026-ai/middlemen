"use client";

import { useState } from "react";
import { Badge } from "@/components/ui";
import { ChartIcon, InboxIcon, PhoneIcon, ShieldIcon, SparkIcon } from "@/components/icons";

type TabId = "inbox" | "calls" | "approvals" | "playground" | "analytics";

const TABS: { id: TabId; label: string; icon: typeof InboxIcon; caption: string }[] = [
  { id: "inbox", label: "Inbox", icon: InboxIcon, caption: "Every channel in one thread per customer — already answered." },
  { id: "calls", label: "Call queue", icon: PhoneIcon, caption: "The only path to a phone call, and it comes briefed." },
  { id: "approvals", label: "Approvals", icon: ShieldIcon, caption: "Money and risk stop here. Nothing below has been sent." },
  { id: "playground", label: "Playground", icon: SparkIcon, caption: "Test it against real questions without touching your records." },
  { id: "analytics", label: "Analytics", icon: ChartIcon, caption: "What it absorbed, and what still needed a person." },
];

const AI = "#16a874";
const HUMAN = "#6675ea";

function Chrome({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-ink-700 bg-ink-950">
      <div className="flex items-center gap-2 border-b border-ink-700 bg-ink-900/60 px-4 py-2.5">
        <span className="flex gap-1.5">
          {["#3a4150", "#3a4150", "#3a4150"].map((c, i) => (
            <span key={i} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
          ))}
        </span>
        <span className="ml-2 text-xs text-mist-400">{title}</span>
      </div>
      {children}
    </div>
  );
}

function Row({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex items-center gap-3 border-b border-ink-800 px-4 py-3 last:border-0 ${className}`}>{children}</div>;
}

const THREADS = [
  { who: "DW", name: "Dana Whitfield", subject: "Water heater leaking", channel: "web", by: "AI", time: "2m" },
  { who: "MB", name: "Marcus Bell", subject: "Quote for 6 rental units", channel: "email", by: "AI", time: "18m" },
  { who: "PR", name: "Priya Raman", subject: "Reschedule Thursday visit", channel: "sms", by: "AI", time: "1h" },
  { who: "OC", name: "Owen Castellanos", subject: "Refund request", channel: "email", by: "Human", time: "3h" },
];

const BARS = [
  [7, 1], [9, 2], [6, 1], [8, 3], [11, 1], [9, 2], [12, 2],
  [10, 1], [13, 3], [8, 1], [14, 2], [11, 1], [9, 2], [12, 1],
];

export function WorkspaceShowcase() {
  const [tab, setTab] = useState<TabId>("inbox");
  const active = TABS.find((t) => t.id === tab)!;
  const peak = Math.max(...BARS.flat());

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Workspace screens">
        {TABS.map((item) => {
          const Icon = item.icon;
          const on = item.id === tab;
          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={on}
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition ${
                on
                  ? "border-jade-500/50 bg-jade-500/10 text-jade-300"
                  : "border-ink-700 text-mist-400 hover:border-ink-600 hover:text-mist-100"
              }`}
            >
              <Icon width={15} height={15} />
              {item.label}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-sm text-mist-400">{active.caption}</p>

      <div className="mt-4">
        {tab === "inbox" ? (
          <Chrome title="Inbox">
            {THREADS.map((thread) => (
              <Row key={thread.name}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-ink-700 bg-ink-850 text-[11px] font-semibold">
                  {thread.who}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{thread.name}</span>
                  <span className="block truncate text-xs text-mist-400">{thread.subject}</span>
                </span>
                <span className="hidden text-[11px] uppercase tracking-wide text-mist-400 sm:block">{thread.channel}</span>
                <Badge tone={thread.by === "AI" ? "jade" : "iris"}>{thread.by}</Badge>
                <span className="w-8 text-right text-xs text-mist-400">{thread.time}</span>
              </Row>
            ))}
          </Chrome>
        ) : null}

        {tab === "calls" ? (
          <Chrome title="Call queue">
            <div className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <PhoneIcon width={15} height={15} className="text-amber-glow" />
                <span className="text-sm font-semibold">Dana Whitfield · (555) 271-8890</span>
                <Badge tone="rose">urgent</Badge>
              </div>
              <div className="mt-3 rounded-lg border border-ink-700 bg-ink-900/60 p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-mist-400">Brief</p>
                <p className="mt-1.5 text-sm leading-relaxed text-mist-300">
                  Leak at the base of the tank, now spraying; cold supply shut off. Booked tomorrow 12–2pm. Likely
                  full replacement ($1,400–$2,600 installed) —{" "}
                  <span className="text-mist-100">she has not been quoted a price yet</span>.
                </p>
              </div>
              <div className="mt-3 flex gap-2">
                <span className="btn btn-primary px-3 py-1.5 text-xs">Take the call</span>
                <span className="btn btn-ghost px-3 py-1.5 text-xs">Reassign</span>
              </div>
            </div>
          </Chrome>
        ) : null}

        {tab === "approvals" ? (
          <Chrome title="Approvals">
            <div className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">Refund request — $320 drain service</span>
                <Badge tone="rose">high risk</Badge>
                <Badge tone="amber">42% confident</Badge>
              </div>
              <p className="mt-2 text-sm text-mist-400">
                Repeat backup inside the 12-month guarantee. Policy needs owner approval, so the assistant stopped
                short of promising money back.
              </p>
              <div className="mt-3 rounded-lg border border-ink-700 bg-ink-900/60 p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-mist-400">
                  Draft — sends only if you approve
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-mist-300">
                  I&apos;m sorry the drain backed up again. That job is inside our 12-month labor guarantee, so the
                  return visit is free. On the refund: I&apos;m passing that to our owner today.
                </p>
              </div>
              <div className="mt-3 flex gap-2">
                <span className="btn btn-primary px-3 py-1.5 text-xs">Approve &amp; send</span>
                <span className="btn btn-ghost px-3 py-1.5 text-xs">Reject</span>
              </div>
            </div>
          </Chrome>
        ) : null}

        {tab === "playground" ? (
          <Chrome title="Playground — dry run">
            <div className="space-y-3 p-4">
              <p className="ml-auto max-w-[75%] rounded-2xl bg-jade-500 px-3.5 py-2.5 text-sm text-ink-950">
                Do you offer a 60% discount for new customers?
              </p>
              <div className="max-w-[85%]">
                <p className="rounded-2xl border border-ink-700 bg-ink-850 px-3.5 py-2.5 text-sm leading-relaxed">
                  That one isn&apos;t in my notes, so I&apos;d rather not guess. I&apos;ve flagged it for a teammate
                  and they&apos;ll follow up with an answer shortly.
                </p>
                <p className="mt-2 text-xs text-mist-400">
                  <span className="text-mist-300">Checked knowledge base</span> — no match for “60% discount”
                </p>
              </div>
              <p className="border-t border-ink-800 pt-3 text-xs text-mist-400">
                Nothing was booked, filed or queued — dry run.
              </p>
            </div>
          </Chrome>
        ) : null}

        {tab === "analytics" ? (
          <Chrome title="Analytics">
            <div className="p-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  ["Handled by AI", "79%"],
                  ["Hours saved", "15h"],
                  ["Pipeline", "$3,493"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-ink-700 bg-ink-900/60 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-mist-400">{label}</p>
                    <p className="mt-1 text-lg font-semibold text-jade-400">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-4 text-[11px] text-mist-300">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: AI }} /> Handled by the assistant
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: HUMAN }} /> Needed a person
                </span>
              </div>

              <div className="mt-3 flex h-28 items-end gap-2">
                {BARS.map(([ai, human], index) => (
                  <div key={index} className="flex h-full flex-1 items-end justify-center gap-[2px]">
                    <span className="w-1/2 rounded-t" style={{ height: `${(ai / peak) * 100}%`, background: AI }} />
                    <span
                      className="w-1/2 rounded-t"
                      style={{ height: `${(human / peak) * 100}%`, background: HUMAN, minHeight: 3 }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </Chrome>
        ) : null}
      </div>
    </div>
  );
}
