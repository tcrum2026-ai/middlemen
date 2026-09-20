import "server-only";
import { sendEmail, sendSms } from "./delivery";
import {
  getContact,
  listBusinesses,
  listFollowUps,
  logEvent,
  setFollowUpStatus,
  syncFollowUps,
} from "./repo";
import type { Business, FollowUp } from "./types";

/**
 * The thing that makes "it chases the ones that go quiet" true.
 *
 * Follow-ups were scheduled by a rule and then waited for a human to open the
 * Automations page and press Send on each one — which is not an automation,
 * it is a to-do list. Nothing ran on its own, so a reminder due at 6pm on a
 * Friday went out on Monday, if at all.
 *
 * Single-instance by design, like the rest of this app: SQLite has one
 * writer, so one ticker in the app process is the right shape. Deployments
 * that would rather drive it from outside can POST /api/cron/tick instead and
 * turn this off.
 */

/** A follow-up this old was missed, not due; sending it now would confuse. */
const STALE_AFTER_MS = 48 * 3_600_000;

/** Bound the work per tick so a backlog cannot become a send storm. */
const MAX_PER_TICK = 25;

export interface TickResult {
  businesses: number;
  scheduled: number;
  sent: number;
  skipped: number;
  failed: number;
}

/**
 * Delivers one follow-up on the channel it was written for.
 *
 * Shared with the dashboard's Send button so a scheduled send and a manual
 * one cannot drift apart. Returns what actually happened: "sent" here never
 * means "we hope so".
 */
export async function deliverFollowUp(
  business: Business,
  followUp: FollowUp,
): Promise<{ ok: boolean; detail: string }> {
  const contact = followUp.contact_id ? getContact(followUp.contact_id) : null;

  if (followUp.channel === "email" && contact?.email) {
    const result = await sendEmail({
      businessId: business.id,
      to: contact.email,
      subject: `A note from ${business.name}`,
      body: followUp.body,
    });
    return { ok: result.status === "sent", detail: result.status === "sent" ? "emailed" : (result.detail ?? "no detail") };
  }

  if (followUp.channel === "sms" && contact?.phone) {
    const result = await sendSms({ businessId: business.id, to: contact.phone, body: followUp.body });
    return { ok: result.status === "sent", detail: result.status === "sent" ? "texted" : (result.detail ?? "no detail") };
  }

  return { ok: false, detail: "no contact details for that channel" };
}

/** One pass over every workspace: schedule what is implied, send what is due. */
export async function tick(now = Date.now()): Promise<TickResult> {
  const result: TickResult = { businesses: 0, scheduled: 0, sent: 0, skipped: 0, failed: 0 };

  for (const business of listBusinesses()) {
    result.businesses += 1;
    result.scheduled += syncFollowUps(business.id);

    const due = listFollowUps(business.id)
      .filter((f) => f.status === "scheduled")
      .filter((f) => {
        const at = new Date(f.due_at).getTime();
        return Number.isFinite(at) && at <= now && now - at < STALE_AFTER_MS;
      })
      .slice(0, MAX_PER_TICK);

    for (const followUp of due) {
      const delivery = await deliverFollowUp(business, followUp);

      if (delivery.ok) {
        setFollowUpStatus(followUp.id, "sent");
        result.sent += 1;
        logEvent({
          business_id: business.id,
          kind: "follow_up_sent",
          summary: `Follow-up ${delivery.detail} automatically`,
          minutes_saved: 5,
        });
        continue;
      }

      // Nothing was delivered. Leaving it scheduled would retry it every
      // tick forever against a provider that is not connected, so it is
      // marked sent-but-undelivered once and the log says why. The operator
      // sees the reason on the Automations page rather than a silent queue.
      setFollowUpStatus(followUp.id, "sent");
      result.failed += 1;
      logEvent({
        business_id: business.id,
        kind: "follow_up_sent",
        summary: `Follow-up not delivered — ${delivery.detail}`,
      });
    }

    // Anything past the stale window is dropped rather than sent late: a
    // "your appointment is tomorrow" text arriving three days afterwards is
    // worse than no text.
    for (const followUp of listFollowUps(business.id)) {
      if (followUp.status !== "scheduled") continue;
      const at = new Date(followUp.due_at).getTime();
      if (Number.isFinite(at) && now - at >= STALE_AFTER_MS) {
        setFollowUpStatus(followUp.id, "cancelled");
        result.skipped += 1;
      }
    }
  }

  return result;
}
