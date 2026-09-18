import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { assistantConfigured } from "@/lib/assistant";

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
  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      database,
      assistant: assistantConfigured() ? "live" : "scripted fallback (no ANTHROPIC_API_KEY)",
      time: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  );
}
