import { Badge, Card, EmptyState, PageHeader, relativeTime } from "@/components/ui";
import { PhoneIcon } from "@/components/icons";
import { updateCallAction } from "../actions";
import { activeBusiness } from "@/lib/session";
import { getContact, listCallRequests } from "@/lib/repo";

const URGENCY_TONE = { urgent: "rose", normal: "slate", low: "slate" } as const;

export default async function CallsPage() {
  const business = await activeBusiness();
  const calls = listCallRequests(business.id);
  const queued = calls.filter((c) => c.status !== "done");
  const done = calls.filter((c) => c.status === "done");

  return (
    <div>
      <PageHeader
        title="Call queue"
        subtitle={`Calls ${business.assistant_name} handed over, and callbacks it promised. Each one arrives with what was already said, so nobody repeats themselves.`}
      />

      {queued.length === 0 ? (
        <EmptyState
          title="Nobody is waiting on a call"
          body="When a customer asks for a person — or something needs a voice — it lands here with a written brief."
        />
      ) : (
        <div className="space-y-4">
          {queued.map((call) => {
            const contact = call.contact_id ? getContact(call.contact_id) : null;
            return (
              <Card key={call.id} className="!p-0">
                <div className="flex flex-wrap items-center gap-3 border-b border-ink-700 px-5 py-3.5">
                  <PhoneIcon width={16} height={16} className="text-amber-glow" />
                  <div className="min-w-0">
                    <p className="font-semibold">{contact?.name ?? "Unknown contact"}</p>
                    <p className="text-xs text-mist-400">
                      {contact?.phone ?? "no number on file — check the thread"} ·{" "}
                      {relativeTime(call.created_at)}
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <Badge tone={URGENCY_TONE[call.urgency]}>{call.urgency}</Badge>
                    <Badge tone={call.status === "in_progress" ? "iris" : "slate"}>
                      {call.status === "in_progress" ? "on the call" : "queued"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <div>
                    <p className="text-sm font-medium">{call.reason}</p>
                    <p className="mt-0.5 text-xs text-mist-400">Preferred window: {call.preferred_window}</p>
                  </div>

                  <div className="rounded-lg border border-ink-700 bg-ink-950 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-mist-400">
                      Brief for whoever calls
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-mist-300">{call.brief}</p>
                  </div>

                  <form action={updateCallAction} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="call_id" value={call.id} />
                    <div className="min-w-[14rem] flex-1">
                      <label className="label" htmlFor={`outcome-${call.id}`}>
                        Outcome (logged to the thread)
                      </label>
                      <input
                        id={`outcome-${call.id}`}
                        name="outcome"
                        className="field"
                        placeholder="What was agreed on the call"
                      />
                    </div>
                    <button name="status" value="in_progress" className="btn btn-ghost">
                      Taking it
                    </button>
                    <button name="status" value="done" className="btn btn-primary">
                      Mark done
                    </button>
                  </form>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {done.length > 0 ? (
        <>
          <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wider text-mist-400">Completed</h2>
          <Card className="!p-0">
            <ul className="divide-y divide-ink-800">
              {done.map((call) => (
                <li key={call.id} className="px-5 py-3.5">
                  <p className="text-sm">{call.reason}</p>
                  {call.outcome ? <p className="mt-0.5 text-xs text-mist-400">{call.outcome}</p> : null}
                </li>
              ))}
            </ul>
          </Card>
        </>
      ) : null}
    </div>
  );
}
