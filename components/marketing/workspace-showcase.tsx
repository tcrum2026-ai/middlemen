"use client";

import { useState } from "react";
import { ChartIcon, InboxIcon, PhoneIcon, ShieldIcon, SparkIcon } from "@/components/icons";
import { Screenshot } from "./screenshot";

type TabId = "inbox" | "calls" | "approvals" | "playground" | "analytics";

/**
 * Real screenshots of the actual demo workspace — not a redrawn mockup. Retake
 * with `node scripts/screenshots.mjs` against a freshly seeded dev server
 * whenever the dashboard's design changes enough that these look stale.
 */
const TABS: { id: TabId; label: string; icon: typeof InboxIcon; caption: string; src: string }[] = [
  {
    id: "inbox",
    label: "Inbox",
    icon: InboxIcon,
    caption: "Every channel in one thread per customer — already answered.",
    src: "/marketing/shots/inbox.png",
  },
  {
    id: "calls",
    label: "Call queue",
    icon: PhoneIcon,
    caption: "The only path to a phone call, and it comes briefed.",
    src: "/marketing/shots/calls.png",
  },
  {
    id: "approvals",
    label: "Approvals",
    icon: ShieldIcon,
    caption: "Money and risk stop here. Nothing below has been sent.",
    src: "/marketing/shots/approvals.png",
  },
  {
    id: "playground",
    label: "Playground",
    icon: SparkIcon,
    caption: "Test it against real questions without touching your records.",
    src: "/marketing/shots/playground.png",
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: ChartIcon,
    caption: "What it absorbed, and what still needed a person.",
    src: "/marketing/shots/analytics.png",
  },
];

export function WorkspaceShowcase() {
  const [tab, setTab] = useState<TabId>("inbox");
  const active = TABS.find((t) => t.id === tab)!;

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
        <Screenshot
          key={active.id}
          src={active.src}
          alt={`The real ${active.label} screen in the Lobby dashboard`}
          title={active.label}
          aspect="16 / 11"
        />
      </div>
    </div>
  );
}
