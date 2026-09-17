import Link from "next/link";
import type { ReactNode } from "react";
import { DashboardNav } from "./nav";
import { MobileNav } from "./mobile-nav";
import { switchBusinessAction } from "./actions";
import { BusinessSwitcher } from "./business-switcher";
import { Logo } from "@/components/ui";
import { activeBusiness } from "@/lib/session";
import { listApprovals, listBusinesses, listCallRequests, listConversations, listKbGaps } from "@/lib/repo";
import { assistantConfigured } from "@/lib/assistant";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const business = await activeBusiness();
  const businesses = listBusinesses();
  const counts = {
    inbox: listConversations(business.id).filter((c) => c.status !== "closed").length,
    calls: listCallRequests(business.id).filter((c) => c.status !== "done").length,
    approvals: listApprovals(business.id).filter((a) => a.status === "pending").length,
    gaps: listKbGaps(business.id).filter((g) => g.status === "open").length,
  };

  return (
    <div className="min-h-screen bg-ink-950">
      <header className="sticky top-0 z-20 border-b border-ink-800 bg-ink-950/90 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3 px-4 py-3 sm:px-5">
          <MobileNav counts={counts} />
          <Link href="/" className="hidden sm:block">
            <Logo />
          </Link>

          <div className="min-w-0 max-w-[12rem] sm:max-w-none">
            <BusinessSwitcher
              businesses={businesses}
              current={business.id}
              action={switchBusinessAction}
            />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-3 text-xs text-mist-400">
            {assistantConfigured() ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-jade-500" />
                <span className="hidden sm:inline">Assistant live</span>
              </span>
            ) : (
              <span
                title="No ANTHROPIC_API_KEY set — replies come from the scripted fallback"
                className="inline-flex items-center gap-1.5 rounded-full border border-ink-700 px-2 py-1"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-glow" />
                <span className="hidden sm:inline">Scripted mode — set ANTHROPIC_API_KEY</span>
                <span className="sm:hidden">Scripted</span>
              </span>
            )}
            <Link href="/connect" className="btn btn-ghost hidden px-3 py-1.5 sm:inline-flex">
              Add business
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[92rem] gap-6 px-4 py-6 sm:px-5">
        <aside className="hidden w-52 shrink-0 lg:block">
          <DashboardNav counts={counts} />
        </aside>
        <main className="min-w-0 flex-1 pb-16">{children}</main>
      </div>
    </div>
  );
}
