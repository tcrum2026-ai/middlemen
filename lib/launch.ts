/**
 * The public launch date, shown as a countdown on the homepage.
 *
 * One constant, not a string typed into a component: the countdown, the
 * "Launching <date>" copy and anything else that needs this date all read
 * from here, so moving the date is a one-line change instead of a grep.
 */
export const LAUNCH_DATE = new Date("2026-10-22T00:00:00-04:00");

export function launchDateLabel(): string {
  return LAUNCH_DATE.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
