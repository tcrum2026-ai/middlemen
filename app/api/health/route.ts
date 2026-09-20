import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { assistantConfigured } from "@/lib/assistant";
import { DATA_IS_EPHEMERAL } from "@/lib/db";
import { demoEmail, demoModeEnabled, spendState } from "@/lib/demo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Liveness plus the two things most likely to be misconfigured on a new deploy. */
export async function GET() {
  let database = "unreachable";
  try {
    getDb().prepare("SELECT 1").get();
    database = "ok";
  } catch (error) {
    database = error instanceof Error ? error.message.slice(0, 120) : "error";
  }

  const healthy = database === "ok";
  const { canSpend, on, off } = spendState();
  const spend = { canSpendMoney: canSpend, live: on, off };
  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      database,
      assistant: assistantConfigured() ? "live" : "scripted fallback (no ANTHROPIC_API_KEY)",
      // Checkable rather than promised: every paid service this app can
      // reach, and whether it is switched on. A demo says "nothing here
      // costs money"; this is how someone verifies that without trusting us.
      billable: spend,
      storage: DATA_IS_EPHEMERAL ? "temporary (resets on restart)" : "persistent",
      demo: demoModeEnabled() ? { enabled: true, signIn: demoEmail() } : { enabled: false },
      time: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  );
}
