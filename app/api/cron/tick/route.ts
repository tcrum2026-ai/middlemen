import { ensureSeeded } from "@/lib/seed";
import { tick } from "@/lib/scheduler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Runs the follow-up pass on demand, for deployments driving it externally.
 *
 * Fails closed: without CRON_SECRET this endpoint accepts nothing. It sends
 * real email and SMS on a customer's behalf, so an open URL here is a way
 * for a stranger to spend their money and their sending reputation.
 */
export async function POST(request: Request) {
  ensureSeeded();

  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return Response.json({ error: "Scheduled work is not configured" }, { status: 503 });
  }

  const given = request.headers.get("x-cron-secret") ?? "";
  const { timingSafeEqual } = await import("node:crypto");
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return Response.json({ error: "Bad secret" }, { status: 403 });
  }

  return Response.json(await tick());
}
