import { SubmitButton } from "@/components/submit-button";
import { Badge, Card, PageHeader } from "@/components/ui";
import { addTeammateAction, removeTeammateAction } from "../actions";
import { activeBusiness } from "@/lib/session";
import { listCallRequests, listTeammates } from "@/lib/repo";
import { ConfirmButton } from "@/components/confirm-button";

export default async function TeamPage() {
  const business = await activeBusiness();
  const teammates = listTeammates(business.id);
  const calls = listCallRequests(business.id);
  const queued = calls.filter((call) => call.status !== "done");

  return (
    <div>
      <PageHeader
        title="Team"
        subtitle="Who the assistant hands work to. Anyone on call duty can be assigned a queued callback."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_22rem]">
        <Card className="!p-0">
          <div className="flex items-center justify-between border-b border-ink-700 px-5 py-3.5">
            <h2 className="font-semibold">Teammates</h2>
            <span className="text-xs text-mist-400">
              {queued.length} call{queued.length === 1 ? "" : "s"} waiting
            </span>
          </div>
          <ul className="divide-y divide-ink-800">
            {teammates.length === 0 ? (
              <li className="px-5 py-10 text-center text-sm text-mist-400">
                Just you so far. Add whoever answers the phone.
              </li>
            ) : (
              teammates.map((teammate) => (
                <li key={teammate.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-ink-700 bg-ink-850 text-xs font-semibold">
                    {teammate.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{teammate.name}</p>
                    <p className="truncate text-xs text-mist-400">{teammate.email}</p>
                  </div>
                  <Badge tone={teammate.role === "owner" ? "iris" : "slate"}>{teammate.role}</Badge>
                  {teammate.takes_calls ? <Badge tone="jade">takes calls</Badge> : null}
                  <form action={removeTeammateAction}>
                    <input type="hidden" name="teammate_id" value={teammate.id} />
                    <ConfirmButton className="text-xs text-mist-400 transition hover:text-rose-alert">Remove</ConfirmButton>
                  </form>
                </li>
              ))
            )}
          </ul>
        </Card>

        <Card className="h-fit">
          <h2 className="font-semibold">Add a teammate</h2>
          <p className="mt-1 text-xs text-mist-400">
            They see the same inbox, call queue and approvals as you.
          </p>
          <form action={addTeammateAction} className="mt-4 space-y-3">
            <div>
              <label className="label" htmlFor="name">Name</label>
              <input id="name" name="name" required className="field" placeholder="Jordan Ellis" />
            </div>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" name="email" required type="email" className="field" placeholder="jordan@" />
            </div>
            <div>
              <label className="label" htmlFor="role">Role</label>
              <select id="role" name="role" className="field" defaultValue="agent">
                <option value="agent">Agent — inbox and calls</option>
                <option value="owner">Owner — settings and billing too</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-mist-300">
              <input type="checkbox" name="takes_calls" defaultChecked className="h-4 w-4 accent-jade-500" />
              On call duty
            </label>
            <SubmitButton className="btn btn-primary w-full justify-center" pendingLabel="Adding…">Add teammate</SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
