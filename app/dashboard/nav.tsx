"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import {
  CalendarIcon,
  CardIcon,
  CodeIcon,
  ContactsIcon,
  GapIcon,
  SendIcon,
  ChartIcon,
  GearIcon,
  HomeIcon,
  InboxIcon,
  LeadIcon,
  BookIcon,
  PhoneIcon,
  PlugIcon,
  ShieldIcon,
  SparkIcon,
  TeamIcon,
} from "@/components/icons";

export interface NavCounts {
  inbox: number;
  calls: number;
  approvals: number;
  gaps: number;
}

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  badge?: keyof NavCounts;
}

/**
 * Seventeen links in one flat column is a wall. Grouped by what you came here
 * to do: clear today's work, look after customers, teach the assistant, set it up.
 */
const GROUPS: { heading?: string; items: NavItem[] }[] = [
  {
    items: [
      { href: "/dashboard", label: "Overview", icon: HomeIcon },
      { href: "/dashboard/analytics", label: "Analytics", icon: ChartIcon },
    ],
  },
  {
    heading: "Today",
    items: [
      { href: "/dashboard/inbox", label: "Inbox", icon: InboxIcon, badge: "inbox" },
      { href: "/dashboard/calls", label: "Call queue", icon: PhoneIcon, badge: "calls" },
      { href: "/dashboard/approvals", label: "Approvals", icon: ShieldIcon, badge: "approvals" },
      { href: "/dashboard/appointments", label: "Schedule", icon: CalendarIcon },
    ],
  },
  {
    heading: "Customers",
    items: [
      { href: "/dashboard/leads", label: "Leads", icon: LeadIcon },
      { href: "/dashboard/contacts", label: "Contacts", icon: ContactsIcon },
      { href: "/dashboard/automations", label: "Follow-ups", icon: SendIcon },
    ],
  },
  {
    heading: "Your assistant",
    items: [
      { href: "/dashboard/knowledge", label: "Knowledge", icon: BookIcon },
      { href: "/dashboard/gaps", label: "Gaps", icon: GapIcon, badge: "gaps" },
      { href: "/dashboard/playground", label: "Playground", icon: SparkIcon },
    ],
  },
  {
    heading: "Setup",
    items: [
      { href: "/dashboard/install", label: "Install", icon: CodeIcon },
      { href: "/dashboard/integrations", label: "Integrations", icon: PlugIcon },
      { href: "/dashboard/team", label: "Team", icon: TeamIcon },
      { href: "/dashboard/billing", label: "Billing", icon: CardIcon },
      { href: "/dashboard/settings", label: "Settings", icon: GearIcon },
    ],
  },
];

export function DashboardNav({ counts, onNavigate }: { counts: NavCounts; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-6">
      {GROUPS.map((group, index) => (
        <div key={group.heading ?? index}>
          {group.heading ? (
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-mist-400/70">
              {group.heading}
            </p>
          ) : null}
          <div className="space-y-0.5">
            {group.items.map(({ href, label, icon: Icon, badge }) => {
              const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
              const count = badge ? counts[badge] : 0;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                    active
                      ? "bg-ink-850 font-medium text-mist-100"
                      : "text-mist-400 hover:bg-ink-850/60 hover:text-mist-100"
                  }`}
                >
                  <Icon width={17} height={17} className={active ? "text-jade-400" : ""} />
                  {label}
                  {count > 0 ? (
                    <span className="ml-auto rounded-full bg-ink-700 px-1.5 py-0.5 text-[11px] font-semibold text-mist-100">
                      {count}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
