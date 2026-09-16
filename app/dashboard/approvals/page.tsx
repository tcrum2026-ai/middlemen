import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader, relativeTime } from "@/components/ui";
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

                {approval.draft ? (
                  <div className="rounded-lg border border-ink-700 bg-ink-950 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-mist-400">
                      Draft reply — sends only if you approve
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-mist-300">{approval.draft}</p>
                  </div>
                ) : (
                  <p className="text-sm text-mist-400">No draft — the assistant wants a person to write this one.</p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <form action={resolveApprovalAction}>
                    <input type="hidden" name="approval_id" value={approval.id} />
                    <input type="hidden" name="status" value="approved" />
                    <button className="btn btn-primary">Approve &amp; send</button>
                  </form>
                  <form action={resolveApprovalAction}>
                    <input type="hidden" name="approval_id" value={approval.id} />
                    <input type="hidden" name="status" value="rejected" />
                    <button className="btn btn-ghost">Reject</button>
                  </form>
                  {approval.conversation_id ? (
                    <Link
                      href={`/dashboard/inbox/${approval.conversation_id}`}
                      className="text-sm text-mist-400 hover:text-mist-100"
                    >
                      Open thread →
                    </Link>
                  ) : null}
                </div>
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
