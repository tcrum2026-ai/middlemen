import Link from "next/link";
import { Badge, Card, PageHeader, StatTile, formatDateTime, relativeTime, usd } from "@/components/ui";
import { ArrowIcon, PhoneIcon, ShieldIcon, SparkIcon } from "@/components/icons";
import { SetupChecklist } from "@/components/setup-checklist";
import { activeBusiness } from "@/lib/session";
import {
  listAppointments,
  listApprovals,
  listCallRequests,
  listConversations,
  listEvents,
  metrics,
  setupSteps,
} from "@/lib/repo";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { welcome } = await searchParams;
  const business = await activeBusiness();
  const stats = metrics(business.id);
  const calls = listCallRequests(business.id).filter((c) => c.status !== "done").slice(0, 3);
  const approvals = listApprovals(business.id).filter((a) => a.status === "pending").slice(0, 3);
  const upcoming = listAppointments(business.id)
    .filter((a) => a.status !== "cancelled" && new Date(a.starts_at).getTime() > Date.now() - 3_600_000)
    .slice(0, 4);
  const conversations = listConversations(business.id).slice(0, 5);
  const events = listEvents(business.id, 6);
  const steps = setupSteps(business.id);

  return (
    <div>
      {welcome ? (
        <div className="card mb-6 flex flex-wrap items-center gap-4 border-jade-500/40 bg-jade-500/[0.05] p-5">
          <SparkIcon className="text-jade-400" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{business.name} is connected.</p>
            <p className="text-sm text-mist-400">
              One line of code and your assistant starts answering. Everything else can wait.
            </p>
          </div>
          <Link href="/dashboard/install" className="btn btn-primary">
            Get the snippet
            <ArrowIcon width={16} height={16} />
          </Link>
        </div>
      ) : null}

      <SetupChecklist steps={steps} />

      <PageHeader
        title={`Good to see you, ${business.name}`}
        subtitle={`${business.assistant_name} is handling ${
          stats.byChannel.length || 1
        } channel${stats.byChannel.length === 1 ? "" : "s"}${
          business.voice_enabled ? ", including your phone line" : ""
        }. Anything it should not decide waits here for you.`}
        action={
          <Link href="/dashboard/inbox" className="btn btn-primary">
            Open inbox
            <ArrowIcon width={16} height={16} />
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Handled by AI"
          value={`${Math.round(stats.deflectionRate * 100)}%`}
          hint={`${stats.aiHandled} of ${stats.aiHandled + stats.humanHandled} interactions`}
          tone="jade"
        />
        <StatTile
          label="Hours saved"
          value={`${Math.round(stats.minutesSaved / 60)}h`}
          hint="Last 14 days"
          tone="jade"
        />
        <StatTile
          label="Calls waiting"
          value={String(stats.callsQueued)}
          hint="For a human — always"
          tone={stats.callsQueued > 0 ? "amber" : "slate"}
        />
        <StatTile
          label="Pipeline"
          value={usd(stats.pipelineCents)}
          hint={`${stats.leads} open leads`}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card className="!p-0 min-w-0">
          <div className="flex items-center justify-between border-b border-ink-700 px-5 py-3.5">
            <h2 className="inline-flex items-center gap-2 font-semibold">
              <PhoneIcon width={16} height={16} className="text-amber-glow" />
              Waiting on a person
            </h2>
            <Link href="/dashboard/calls" className="text-xs text-mist-400 hover:text-mist-100">
              View all
            </Link>
          </div>
          <div className="divide-y divide-ink-800">
            {calls.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-mist-400">No calls queued. Nice.</p>
            ) : (
              calls.map((call) => (
                <Link key={call.id} href="/dashboard/calls" className="block px-5 py-4 transition hover:bg-ink-850/50">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">{call.reason}</p>
                    <Badge tone={call.urgency === "urgent" ? "rose" : "slate"}>{call.urgency}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-mist-400">{call.brief}</p>
                  <p className="mt-1.5 text-xs text-mist-400">{relativeTime(call.created_at)}</p>
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card className="!p-0 min-w-0">
          <div className="flex items-center justify-between border-b border-ink-700 px-5 py-3.5">
            <h2 className="inline-flex items-center gap-2 font-semibold">
              <ShieldIcon width={16} height={16} className="text-iris" />
              Needs your approval
            </h2>
            <Link href="/dashboard/approvals" className="text-xs text-mist-400 hover:text-mist-100">
              View all
            </Link>
          </div>
          <div className="divide-y divide-ink-800">
            {approvals.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-mist-400">Nothing pending.</p>
            ) : (
              approvals.map((approval) => (
                <Link
                  key={approval.id}
                  href="/dashboard/approvals"
                  className="block px-5 py-4 transition hover:bg-ink-850/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">{approval.title}</p>
                    <Badge tone={approval.risk === "high" ? "rose" : approval.risk === "medium" ? "amber" : "slate"}>
                      {approval.risk}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-mist-400">{approval.summary}</p>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="!p-0 min-w-0 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-ink-700 px-5 py-3.5">
            <h2 className="font-semibold">Recent conversations</h2>
            <Link href="/dashboard/inbox" className="text-xs text-mist-400 hover:text-mist-100">
              Open inbox
            </Link>
          </div>
          <div className="divide-y divide-ink-800">
            {conversations.map((conversation) => (
              <Link
                key={conversation.id}
                href={`/dashboard/inbox/${conversation.id}`}
                className="flex min-w-0 items-center gap-3 px-5 py-3.5 transition hover:bg-ink-850/50"
              >
                <Badge tone={conversation.handled_by === "ai" ? "jade" : "iris"}>
                  {conversation.handled_by === "ai" ? "AI" : "Human"}
                </Badge>
                <span className="min-w-0 flex-1 truncate text-sm">{conversation.subject}</span>
                <span className="hidden text-xs uppercase tracking-wide text-mist-400 sm:inline">
                  {conversation.channel}
                </span>
                <span className="shrink-0 text-right text-xs text-mist-400">
                  {relativeTime(conversation.last_message_at)}
                </span>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="!p-0 min-w-0">
          <div className="border-b border-ink-700 px-5 py-3.5">
            <h2 className="font-semibold">Next up</h2>
          </div>
          <div className="divide-y divide-ink-800">
            {upcoming.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-mist-400">Nothing booked yet.</p>
            ) : (
              upcoming.map((appointment) => (
                <div key={appointment.id} className="px-5 py-3.5">
                  <p className="text-sm font-medium">{appointment.title}</p>
                  <p className="mt-0.5 text-xs text-mist-400">{formatDateTime(appointment.starts_at)}</p>
                  <p className="text-xs text-mist-400">{appointment.location}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-5 !p-0">
        <div className="border-b border-ink-700 px-5 py-3.5">
          <h2 className="font-semibold">Activity</h2>
        </div>
        <ul className="divide-y divide-ink-800">
          {events.map((event) => (
            <li key={event.id} className="flex min-w-0 items-center gap-3 px-5 py-3 text-sm">
              <Badge tone={event.handled_by === "ai" ? "jade" : "iris"}>{event.handled_by === "ai" ? "AI" : "Human"}</Badge>
              <span className="min-w-0 flex-1 truncate text-mist-300">{event.summary}</span>
              <span className="text-xs text-mist-400">{relativeTime(event.created_at)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
