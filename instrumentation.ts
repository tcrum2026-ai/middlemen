/**
 * Next runs this once when the server starts.
 *
 * It is where the follow-up ticker lives, because this app is deliberately
 * single-instance — SQLite has one writer — so one in-process timer is the
 * right shape and needs no extra moving parts. A deployment that would
 * rather drive the work from outside can set LOBBY_SCHEDULER=off and POST
 * /api/cron/tick from cron, a GitHub Action or an uptime checker.
 */

const EVERY_MS = 5 * 60_000;

export async function register(): Promise<void> {
  // Only the Node server runtime; the edge runtime has no timers worth using
  // and would run a second copy of everything.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;


  // Dev reloads re-run this module. Without the guard every save stacks
  // another timer on the same database.
  const flag = globalThis as { __lobbyTicker?: NodeJS.Timeout };
  if (flag.__lobbyTicker) return;

  // Seed before anything serves a request, and give the demo account its
  // workspace. On a serverless host this runs per cold start, which is
  // exactly when a fresh temporary database needs filling.
  try {
    const [{ ensureSeeded }, { ensureDemoAccount, demoModeEnabled }] = await Promise.all([
      import("./lib/seed"),
      import("./lib/demo"),
    ]);
    ensureSeeded();
    await ensureDemoAccount();
    if (demoModeEnabled()) console.log("Demo mode is on: the seeded workspace has a shared owner.");
  } catch (error) {
    console.error("Startup seeding failed:", error instanceof Error ? error.message : error);
  }

  const { tick } = await import("./lib/scheduler");

  const run = async () => {
    try {
      const result = await tick();
      if (result.sent || result.failed || result.skipped) {
        console.log(
          `Follow-ups: ${result.sent} sent, ${result.failed} undeliverable, ` +
            `${result.skipped} dropped as stale, across ${result.businesses} workspace(s).`,
        );
      }
    } catch (error) {
      // A failing tick must never take the server down with it.
      console.error("Follow-up tick failed:", error instanceof Error ? error.message : error);
    }
  };

  // A serverless host freezes the container between requests, so an interval
  // is at best useless and at worst a surprise bill; the tick endpoint is the
  // right shape there.
  if (process.env.LOBBY_SCHEDULER?.trim().toLowerCase() === "off") {
    console.log("Follow-up ticker disabled — drive /api/cron/tick externally.");
    return;
  }

  flag.__lobbyTicker = setInterval(run, EVERY_MS);
  // Do not hold the process open on its own account.
  flag.__lobbyTicker.unref?.();

  // One pass shortly after boot, so a restart catches up rather than waiting
  // out the first interval.
  setTimeout(run, 15_000).unref?.();
  console.log(`Follow-up ticker started — every ${EVERY_MS / 60_000} minutes.`);
}
