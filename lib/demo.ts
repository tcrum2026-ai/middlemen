import "server-only";
import { getDb, now } from "./db";

/**
 * Public-demo settings.
 *
 * A deployment meant for clicking through rather than running a business:
 * one workspace, already full of realistic data, that anyone with the link
 * can drive. It exists because "read the marketing page" and "use the thing"
 * are very different ways of judging software.
 *
 * Everything here is off unless LOBBY_DEMO_PASSWORD is set, so a real
 * deployment cannot grow a shared login by accident.
 */

export function demoModeEnabled(): boolean {
  return Boolean(process.env.LOBBY_DEMO_PASSWORD?.trim());
}

export function demoEmail(): string {
  return (process.env.LOBBY_DEMO_EMAIL?.trim() || "demo@lobby.app").toLowerCase();
}

/**
 * True when nothing in this deployment can spend money.
 *
 * Each of these is a paid service. The app already refuses to pretend when
 * one is missing; this states the whole position in one place so a demo can
 * say it out loud rather than asking someone to take it on trust.
 */
export function spendState(): { canSpend: boolean; off: string[]; on: string[] } {
  const checks: [string, boolean][] = [
    ["Claude API (replies)", Boolean(process.env.ANTHROPIC_API_KEY?.trim())],
    ["Stripe (subscriptions)", Boolean(process.env.STRIPE_SECRET_KEY?.trim())],
    ["Resend (platform email)", Boolean(process.env.RESEND_API_KEY?.trim())],
    ["Twilio voice bridge", Boolean(process.env.VOICE_BRIDGE_SECRET?.trim())],
  ];
  return {
    canSpend: checks.some(([, live]) => live),
    on: checks.filter(([, live]) => live).map(([name]) => name),
    off: checks.filter(([, live]) => !live).map(([name]) => name),
  };
}

/**
 * Gives the demo account ownership of the seeded workspace.
 *
 * Without an owner the dashboard is read-only, which is right for a stranger
 * browsing but useless for someone who was asked to try every feature. Runs
 * after seeding, is idempotent, and does nothing at all when demo mode is off.
 */
export async function ensureDemoAccount(): Promise<void> {
  if (!demoModeEnabled()) return;

  const db = getDb();
  const business = db.prepare("SELECT id FROM businesses ORDER BY created_at LIMIT 1").get() as
    | { id: string }
    | undefined;
  if (!business) return;

  const email = demoEmail();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: string } | undefined;
  if (existing) {
    db.prepare("UPDATE businesses SET owner_id = ? WHERE owner_id IS NULL").run(existing.id);
    return;
  }

  // Imported here so the password hashing lives in exactly one place.
  const { createUser } = await import("./auth");
  const created = await createUser({
    email,
    name: "Demo account",
    password: process.env.LOBBY_DEMO_PASSWORD!.trim(),
  });
  if ("error" in created) return;

  db.transaction(() => {
    // Already confirmed: there is no inbox to receive a link, and holding a
    // demo back for an unclicked email would be a silly first impression.
    db.prepare("UPDATE users SET email_verified_at = ? WHERE id = ?").run(now(), created.user.id);
    db.prepare("UPDATE businesses SET owner_id = ? WHERE owner_id IS NULL").run(created.user.id);
  })();
}
