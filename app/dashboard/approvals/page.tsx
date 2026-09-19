import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader, relativeTime } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { resolveApprovalAction } from "../actions";
import { activeBusiness } from "@/lib/session";
import { listApprovals } from "@/lib/repo";

const RISK_TONE = { high: "rose", medium: "amber", low: "slate" } as const;

export default async function ApprovalsPage() {
  const business = await activeBusiness();
  const approvals = listApprovals(business.id);
  const pending = approvals.filter((a) => a.status === "pending");
  const resolved = approvals.filter((a) => a.status !== "pending").slice(0, 10);

  return (
    <div>
      <PageHeader
        title="Approvals"
        subtitle="Refunds, warranty disputes, big quotes and anything the assistant wasn't sure about. Nothing here went out to a customer."
      />

      {pending.length === 0 ? (
        <EmptyState title="Queue is clear" body="Everything the assistant handled this week was inside its limits." />
      ) : (
        <div className="space-y-4">
          {pending.map((approval) => (
            <Card key={approval.id} className="!p-0">
              <div className="flex flex-wrap items-center gap-3 border-b border-ink-700 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="font-semibold">{approval.title}</p>
                  <p className="text-xs text-mist-400">
                    {approval.kind} · {relativeTime(approval.created_at)}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Badge tone={RISK_TONE[approval.risk]}>{approval.risk} risk</Badge>
                  <Badge tone={approval.confidence < 0.5 ? "amber" : "slate"}>
                    {Math.round(approval.confidence * 100)}% confident
                  </Badge>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <p className="text-sm leading-relaxed text-mist-300">{approval.summary}</p>

                {/* Editable, because "approve" and "approve exactly this wording"
                    are different things, and retyping a good draft into the
                    inbox to change one sentence is how a queue gets abandoned. */}
                <form action={resolveApprovalAction} className="space-y-3">
                  <input type="hidden" name="approval_id" value={approval.id} />

                  {approval.draft ? (
                    <div>
                      <label
                        htmlFor={`draft-${approval.id}`}
                        className="mb-2 block text-xs font-semibold uppercase tracking-wider text-mist-400"
                      >
                        Draft reply — edit it if you like; it sends when you approve
                      </label>
                      <textarea
                        id={`draft-${approval.id}`}
                        name="draft"
                        defaultValue={approval.draft}
                        rows={Math.min(10, Math.max(3, approval.draft.split("\n").length + 1))}
                        className="field resize-y font-normal"
                      />
                    </div>
                  ) : (
                    <div>
                      <label
                        htmlFor={`draft-${approval.id}`}
                        className="mb-2 block text-xs font-semibold uppercase tracking-wider text-mist-400"
                      >
                        No draft — the assistant wants a person to write this one
                      </label>
                      <textarea
                        id={`draft-${approval.id}`}
                        name="draft"
                        rows={3}
                        placeholder="Write the reply to send…"
                        className="field resize-y font-normal"
                      />
                    </div>
                  )}

                <div className="flex flex-wrap items-center gap-2">
                  <SubmitButton
                    className="btn btn-primary"
                    pendingLabel="Sending…"
                    name="status"
                    value="approved"
                  >
                    {approval.conversation_id ? "Approve & send" : "Approve"}
                  </SubmitButton>
                  <SubmitButton className="btn btn-ghost" pendingLabel="Rejecting…" name="status" value="rejected">
                    Reject
                  </SubmitButton>
                  {approval.conversation_id ? (
                    <Link
                      href={`/dashboard/inbox/${approval.conversation_id}`}
                      className="tap text-sm text-mist-400 hover:text-mist-100"
                    >
                      Open thread →
                    </Link>
                  ) : null}
                  </div>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}

      {resolved.length > 0 ? (
        <>
          <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wider text-mist-400">Recently resolved</h2>
          <Card className="!p-0">
            <ul className="divide-y divide-ink-800">
              {resolved.map((approval) => (
                <li key={approval.id} className="flex items-center gap-3 px-5 py-3.5 text-sm">
                  <Badge tone={approval.status === "approved" ? "jade" : "slate"}>{approval.status}</Badge>
                  <span className="min-w-0 flex-1 truncate">{approval.title}</span>
                  <span className="text-xs text-mist-400">{relativeTime(approval.created_at)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      ) : null}
    </div>
  );
}
