import "server-only";
import { getUserById } from "./auth";
import { notifySlack } from "./delivery";
import { platformMailConfigured, sendPlatformEmail } from "./platform-mail";
import { throttle, type ThrottleWindow } from "./throttle";
import type { Business } from "./types";

/**
 * Tells the operator something is waiting for them.
 *
 * The review queue only works if someone looks at it. Until now the only way
 * anyone found out was a Slack message, and most businesses this is built for
 * do not use Slack — so an approval could sit unread all weekend while the
 * customer waited, which is precisely the failure the queue exists to avoid.
 *
 * Slack when it is connected, and an email to the workspace owner otherwise.
 * Both are best-effort: a notification that fails must never take the
 * customer's reply down with it.
 */

/** One email per workspace per half hour, however much arrives. */
const EMAIL_EVERY_MS = 30 * 60_000;

const windows: Map<string, ThrottleWindow> =
  (globalThis as { __lobbyNotify?: Map<string, ThrottleWindow> }).__lobbyNotify ??
  ((globalThis as { __lobbyNotify?: Map<string, ThrottleWindow> }).__lobbyNotify = new Map());

export interface Notice {
  /** One line: what happened. */
  title: string;
  /** A sentence or two of context. */
  summary: string;
  /** Where in the dashboard to deal with it. */
  path: string;
}

export async function notifyOperator(business: Business, notice: Notice): Promise<void> {
  await Promise.allSettled([slack(business, notice), email(business, notice)]);
}

async function slack(business: Business, notice: Notice): Promise<void> {
  await notifySlack({
    businessId: business.id,
    text: `:bell: *${notice.title}*\n${notice.summary}`,
  }).catch(() => {});
}

async function email(business: Business, notice: Notice): Promise<void> {
  if (!platformMailConfigured() || !business.owner_id) return;

  // A busy Saturday should not mean forty emails. The first one goes out
  // immediately; the rest are counted and mentioned in the next.
  const decision = throttle(windows.get(business.id), Date.now(), EMAIL_EVERY_MS);
  windows.set(business.id, decision.next);
  if (!decision.send) return;
  const alsoWaiting = decision.alsoWaiting;

  const owner = getUserById(business.owner_id);
  // Only tell someone who has proved they can be told.
  if (!owner?.email_verified_at) return;

  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ?? "";
  const link = site ? `\n\n${site}${notice.path}` : "";
  const backlog =
    alsoWaiting > 0
      ? `\n\n${alsoWaiting} other item${alsoWaiting === 1 ? "" : "s"} came in since the last email.`
      : "";

  await sendPlatformEmail({
    to: owner.email,
    subject: `${business.name}: ${notice.title}`,
    body:
      `${notice.summary}${link}${backlog}\n\n` +
      `Your assistant handled everything it was allowed to; this is the part it wasn't.\n\n— Lobby`,
  }).catch(() => {});
}

/** Test seam: forget the throttle windows. */
export function resetNotifyWindows(): void {
  windows.clear();
}
