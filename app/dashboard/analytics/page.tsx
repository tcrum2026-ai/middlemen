import { Card, PageHeader, StatTile, usd } from "@/components/ui";
import { activeBusiness } from "@/lib/session";
import { listEvents, metrics } from "@/lib/repo";

/**
 * Series colours are stepped for the dark chart surface and validated for
 * colour-vision separation; identity is also carried by the legend and the
 * table view below, never by colour alone.
 */
const AI_COLOR = "#16a874";
const HUMAN_COLOR = "#6675ea";

function dayLabel(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { day: "numeric" });
}

export default async function AnalyticsPage() {
  const business = await activeBusiness();
  const stats = metrics(business.id);
  const events = listEvents(business.id, 400);

  const peak = Math.max(1, ...stats.byDay.map((d) => Math.max(d.ai, d.human)));
  const channelPeak = Math.max(1, ...stats.byChannel.map((c) => c.count));
  const totalHandled = stats.aiHandled + stats.humanHandled;

  const byKind = [...events.reduce((map, event) => {
    map.set(event.kind, (map.get(event.kind) ?? 0) + 1);
    return map;
  }, new Map<string, number>())]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="What your assistant actually absorbed, and what still needed a person."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Handled by AI"
          value={`${Math.round(stats.deflectionRate * 100)}%`}
          hint={`${stats.aiHandled} of ${totalHandled} interactions`}
          tone="jade"
        />
        <StatTile label="Hours saved" value={`${Math.round(stats.minutesSaved / 60)}h`} hint="Last 14 days" tone="jade" />
        <StatTile label="Appointments booked" value={String(stats.appointments)} hint="Active on the calendar" />
        <StatTile label="Pipeline created" value={usd(stats.pipelineCents)} hint={`${stats.leads} leads`} />
      </div>

      <Card className="mt-5 !p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-700 px-5 py-3.5">
          <div>
            <h2 className="font-semibold">Interactions per day</h2>
            <p className="text-xs text-mist-400">Last 14 days</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-mist-300">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: AI_COLOR }} />
              Handled by {business.assistant_name}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: HUMAN_COLOR }} />
              Needed a person
            </span>
          </div>
        </div>

        <div className="px-5 py-6">
          <div className="mb-7 flex h-56 items-end gap-2.5">
            {stats.byDay.map((day) => (
              <div
                key={day.date}
                className="group relative flex h-full min-w-0 flex-1 items-end justify-center gap-[2px]"
              >
                <span
                  className="w-1/2 rounded-t transition-opacity group-hover:opacity-80"
                  style={{
                    height: `${(day.ai / peak) * 100}%`,
                    background: AI_COLOR,
                    minHeight: day.ai ? 3 : 0,
                  }}
                />
                <span
                  className="w-1/2 rounded-t transition-opacity group-hover:opacity-80"
                  style={{
                    height: `${(day.human / peak) * 100}%`,
                    background: HUMAN_COLOR,
                    minHeight: day.human ? 3 : 0,
                  }}
                />
                <span className="absolute -bottom-6 text-[11px] tabular-nums text-mist-400">
                  {dayLabel(day.date)}
                </span>
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-ink-700 bg-ink-850 px-2.5 py-1.5 text-xs shadow-lg group-hover:block">
                  <p className="font-medium">
                    {new Date(`${day.date}T12:00:00`).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-mist-300">
                    {day.ai} by {business.assistant_name}
                  </p>
                  <p className="text-mist-300">{day.human} by a person</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <details className="border-t border-ink-800 px-5 py-3">
          <summary className="cursor-pointer text-xs text-mist-400">View as table</summary>
          <table className="mt-3 w-full text-left text-xs">
            <thead className="text-mist-400">
              <tr>
                <th className="py-1 font-medium">Day</th>
                <th className="py-1 font-medium">AI</th>
                <th className="py-1 font-medium">Person</th>
              </tr>
            </thead>
            <tbody className="text-mist-300">
              {stats.byDay.map((day) => (
                <tr key={day.date} className="border-t border-ink-800">
                  <td className="py-1">{day.date}</td>
                  <td className="py-1 tabular-nums">{day.ai}</td>
                  <td className="py-1 tabular-nums">{day.human}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Where conversations come from</h2>
          <ul className="mt-4 space-y-3">
            {stats.byChannel.length === 0 ? (
              <li className="text-sm text-mist-400">No conversations yet.</li>
            ) : (
              stats.byChannel.map((channel) => (
                <li key={channel.channel} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-sm capitalize text-mist-300">{channel.channel}</span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-800">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${(channel.count / channelPeak) * 100}%`, background: AI_COLOR }}
                    />
                  </span>
                  <span className="w-6 text-right text-sm tabular-nums text-mist-300">{channel.count}</span>
                </li>
              ))
            )}
          </ul>
        </Card>

        <Card>
          <h2 className="font-semibold">What it spent its time on</h2>
          <ul className="mt-4 space-y-2.5">
            {byKind.map(([kind, count]) => (
              <li key={kind} className="flex items-center gap-3 text-sm">
                <span className="min-w-0 flex-1 truncate capitalize text-mist-300">{kind.replace(/_/g, " ")}</span>
                <span className="tabular-nums text-mist-400">{count}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
