/**
 * "Has enough time passed to send another one of these?"
 *
 * Pure, so the rule can be tested without waiting half an hour. Used for
 * operator notifications: the first thing that needs attention should reach
 * someone immediately, and a busy Saturday should not mean forty emails.
 */

export interface ThrottleWindow {
  /** Epoch ms of the last send. */
  last: number;
  /** How many were swallowed since then. */
  suppressed: number;
}

export interface ThrottleDecision {
  send: boolean;
  /** How many were swallowed since the last send, to mention in this one. */
  alsoWaiting: number;
  /** The window to store back. */
  next: ThrottleWindow;
}

export function throttle(
  window: ThrottleWindow | undefined,
  now: number,
  everyMs: number,
): ThrottleDecision {
  // Never sent before: this one goes, whatever the interval.
  if (!window) return { send: true, alsoWaiting: 0, next: { last: now, suppressed: 0 } };

  if (now - window.last < everyMs) {
    return {
      send: false,
      alsoWaiting: 0,
      next: { last: window.last, suppressed: window.suppressed + 1 },
    };
  }

  return { send: true, alsoWaiting: window.suppressed, next: { last: now, suppressed: 0 } };
}
