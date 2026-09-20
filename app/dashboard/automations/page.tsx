import { Badge, Card, PageHeader, formatDateTime } from "@/components/ui";
import {
  setFollowUpStatusAction,
  syncFollowUpsAction,
  updateAutomationAction,
} from "../actions";
import { activeBusiness } from "@/lib/session";
import { listAutomationRules, listFollowUps, syncFollowUps } from "@/lib/repo";

const RULE_COPY: Record<string, { title: string; body: string }> = {
  appointment_reminder: {
    title: "Remind before the appointment",
    body: "Cuts no-shows without anyone building a reminder list.",
  },
  quote_chase: {
    title: "Chase a quiet quote",
    body: "Most quotes die of silence, not rejection. This follows up once, politely.",
  },
  review_request: {
    title: "Ask for a review after the job",
    body: "Sent only after work is marked complete, never to an unhappy thread.",
  },
  no_reply_nudge: {
    title: "Nudge a conversation that went quiet",
    body: "One message, then it stops. Nobody gets pestered.",
  },
};

export default async function AutomationsPage() {
  const business = await activeBusiness();
  syncFollowUps(business.id);
  const rules = listAutomationRules(business.id);
  const followUps = listFollowUps(business.id);
  const scheduled = followUps.filter((f) => f.status === "scheduled");
  const done = followUps.filter((f) => f.status !== "scheduled").slice(0, 10);

  return (
    <div>
      <PageHeader
        title="Follow-ups"
        subtitle="The messages that get forgotten when everyone is busy. Turn a rule on and the assistant writes and schedules them."
        action={
          <form action={syncFollowUpsAction}>
            <button className="btn btn-ghost">Rebuild queue</button>
          </form>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          {rules.map((rule) => {
            const copy = RULE_COPY[rule.kind];
            return (
              <Card key={rule.id} className="!p-0">
                <form action={updateAutomationAction}>
                  <input type="hidden" name="kind" value={rule.kind} />
                  <div className="flex flex-wrap items-center gap-3 border-b border-ink-700 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{copy.title}</p>
                      <p className="text-xs text-mist-400">{copy.body}</p>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-mist-300">
                      <input
                        type="checkbox"
                        name="enabled"
                        defaultChecked={rule.enabled}
                        className="h-4 w-4 accent-jade-500"
                      />
                      {rule.enabled ? "On" : "Off"}
                    </label>
                  </div>

                  <div className="grid gap-3 p-5 sm:grid-cols-[8rem_8rem_1fr]">
                    <div>
                      <label className="label" htmlFor={`delay-${rule.id}`}>
                        {rule.kind === "appointment_reminder" ? "Hours before" : "Hours after"}
                      </label>
                      <input
                        id={`delay-${rule.id}`}
                        name="delay_hours"
                        type="number"
                        min={1}
                        max={336}
                        defaultValue={rule.delay_hours}
                        className="field"
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor={`channel-${rule.id}`}>Channel</label>
                      <select id={`channel-${rule.id}`} name="channel" defaultValue={rule.channel} className="field">
                        <option value="sms">SMS</option>
                        <option value="email">Email</option>
                      </select>
                    </div>
                    <div>
                      <label className="label" htmlFor={`template-${rule.id}`}>Message</label>
                      <textarea
                        id={`template-${rule.id}`}
                        name="template"
                        rows={2}
                        defaultValue={rule.template}
                        className="field resize-y font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 border-t border-ink-800 px-5 py-3">
                    <button className="btn btn-primary px-3 py-1.5 text-xs">Save</button>
                    <p className="text-xs text-mist-400">
                      <code className="font-mono">{"{{name}}"}</code>,{" "}
                      <code className="font-mono">{"{{business}}"}</code>,{" "}
                      <code className="font-mono">{"{{appointment}}"}</code> and{" "}
                      <code className="font-mono">{"{{topic}}"}</code> are filled in per contact.
                    </p>
                  </div>
                </form>
              </Card>
            );
          })}
        </div>

        <div className="space-y-4">
          <Card className="!p-0">
            <div className="flex items-center justify-between border-b border-ink-700 px-5 py-3.5">
              <h2 className="text-sm font-semibold">Scheduled</h2>
              <span className="text-xs text-mist-400">{scheduled.length}</span>
            </div>
            <ul className="divide-y divide-ink-800">
              {scheduled.length === 0 ? (
                <li className="px-5 py-8 text-center text-sm text-mist-400">
                  Nothing queued. Turn a rule on, or book something.
                </li>
              ) : (
                scheduled.slice(0, 12).map((followUp) => (
                  <li key={followUp.id} className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Badge tone="slate">{followUp.channel}</Badge>
                      <span className="text-xs text-mist-400">{formatDateTime(followUp.due_at)}</span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-mist-300">{followUp.body}</p>
                    <div className="mt-2 flex gap-2">
                      <form action={setFollowUpStatusAction}>
                        <input type="hidden" name="follow_up_id" value={followUp.id} />
                        <input type="hidden" name="status" value="sent" />
                        <button className="text-xs text-jade-400 hover:underline">Send now</button>
                      </form>
                      <form action={setFollowUpStatusAction}>
                        <input type="hidden" name="follow_up_id" value={followUp.id} />
                        <input type="hidden" name="status" value="cancelled" />
                        <button className="text-xs text-mist-400 hover:text-rose-alert">Cancel</button>
                      </form>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </Card>

          {done.length > 0 ? (
            <Card className="!p-0">
              <div className="border-b border-ink-700 px-5 py-3">
                <h2 className="text-sm font-semibold">Recent</h2>
              </div>
              <ul className="divide-y divide-ink-800">
                {done.map((followUp) => (
                  <li key={followUp.id} className="flex items-center gap-2 px-5 py-2.5 text-xs">
                    <Badge tone={followUp.status === "sent" ? "jade" : "slate"}>{followUp.status}</Badge>
                    <span className="min-w-0 flex-1 truncate text-mist-400">{followUp.body}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
