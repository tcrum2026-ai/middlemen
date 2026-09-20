import Link from "next/link";
import type { ReactNode } from "react";
import { DashboardNav } from "./nav";
import { MobileNav } from "./mobile-nav";
import { switchBusinessAction } from "./actions";
import { BusinessSwitcher } from "./business-switcher";
import { Logo } from "@/components/ui";
import { workspace } from "@/lib/session";
import { needsVerification } from "@/lib/auth";
import { entitlement } from "@/lib/entitlement";
import { VerifyBanner } from "./verify-banner";
import { DemoBanner } from "./demo-banner";
import { DATA_IS_EPHEMERAL } from "@/lib/db";
import { demoModeEnabled, spendState } from "@/lib/demo";
import { signOutAction } from "@/app/auth-actions";
import { listApprovals, listCallRequests, listConversations, listKbGaps } from "@/lib/repo";
import { assistantConfigured } from "@/lib/assistant";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { business, user, canWrite, options } = await workspace();
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

          {options.length > 1 ? (
            <div className="min-w-0 max-w-[12rem] sm:max-w-none">
              <BusinessSwitcher businesses={options} current={business.id} action={switchBusinessAction} />
            </div>
          ) : (
            <span className="min-w-0 truncate text-sm font-medium">{business.name}</span>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-3 text-xs text-mist-400">
            {assistantConfigured() ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-jade-500" />
                <span className="hidden sm:inline">Assistant live</span>
              </span>
            ) : (
              <Link
                href="/dashboard/integrations#assistant"
                title="No ANTHROPIC_API_KEY set — replies come from the scripted fallback. Click for setup steps."
                className="inline-flex items-center gap-1.5 rounded-full border border-ink-700 px-2 py-1 transition hover:border-amber-glow/40 hover:text-mist-200"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-glow" />
                <span className="hidden sm:inline">Scripted mode — set ANTHROPIC_API_KEY</span>
                <span className="sm:hidden">Scripted</span>
              </Link>
            )}
            {user ? (
              <>
                <Link href="/connect" className="btn btn-ghost hidden px-3 py-1.5 sm:inline-flex">
                  Add business
                </Link>
                <form action={signOutAction}>
                  <button
                    className="btn btn-ghost px-3 py-1.5"
                    title={`Signed in as ${user.email}`}
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/signin" className="btn btn-ghost hidden px-3 py-1.5 sm:inline-flex">
                  Sign in
                </Link>
                <Link href="/signup" className="btn btn-primary px-3 py-1.5">
                  Start free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {demoModeEnabled() ? <DemoBanner ephemeral={DATA_IS_EPHEMERAL} spendOff={spendState().off} /> : null}

      {user && needsVerification(user) ? (
        <VerifyBanner email={user.email} blocking={entitlement(business).blockedTitle?.includes("email") ?? false} />
      ) : null}

      {!canWrite ? (
        <div className="border-b border-amber-glow/25 bg-amber-glow/[0.06]">
          <div className="mx-auto flex max-w-[92rem] flex-wrap items-center gap-3 px-4 py-2.5 text-sm sm:px-5">
            <span className="text-mist-300">
              You&apos;re exploring the <span className="font-medium text-mist-100">demo workspace</span>. Click
              anything — changes are refused, not saved.
            </span>
            <Link href="/signup" className="btn btn-primary ml-auto px-3 py-1.5 text-xs">
              Get your own
            </Link>
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex max-w-[92rem] gap-6 px-4 py-6 sm:px-5">
        <aside className="hidden w-52 shrink-0 lg:block">
          {/* Follows you down a long page; scrolls inside itself if it ever outgrows the screen. */}
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pb-4">
            <DashboardNav counts={counts} />
          </div>
        </aside>
        <main className="min-w-0 flex-1 pb-16">{children}</main>
      </div>
    </div>
  );
}
