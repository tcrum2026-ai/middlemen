import { SubmitButton } from "@/components/submit-button";
import { Badge, Card, EmptyState, PageHeader, relativeTime } from "@/components/ui";
import { answerGapAction, setGapStatusAction } from "../actions";
import { activeBusiness } from "@/lib/session";
import { listKbGaps } from "@/lib/repo";

export default async function GapsPage() {
  const business = await activeBusiness();
  const gaps = listKbGaps(business.id);
  const open = gaps.filter((gap) => gap.status === "open");
  const closed = gaps.filter((gap) => gap.status !== "open");

  return (
    <div>
      <PageHeader
        title="Knowledge gaps"
        subtitle={`Every question ${business.assistant_name} had no answer for. Writing one article closes the gap for every customer who asks it next.`}
      />

      {open.length === 0 ? (
        <EmptyState
          title="No gaps recorded"
          body="When a customer asks something your knowledge base doesn't cover, it lands here instead of being guessed at."
        />
      ) : (
        <div className="space-y-4">
          {open.map((gap) => (
            <Card key={gap.id} className="!p-0">
              <div className="flex flex-wrap items-center gap-3 border-b border-ink-700 px-5 py-3.5">
                <p className="min-w-0 flex-1 font-medium">“{gap.question}”</p>
                <Badge tone={gap.hits > 2 ? "rose" : "amber"}>
                  asked {gap.hits} time{gap.hits === 1 ? "" : "s"}
                </Badge>
                <span className="text-xs text-mist-400">last {relativeTime(gap.last_seen)}</span>
              </div>

              <form id={`answer-${gap.id}`} action={answerGapAction} className="space-y-3 p-5 pb-0">
                <input type="hidden" name="gap_id" value={gap.id} />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_2fr]">
                  <div>
                    <label className="label" htmlFor={`title-${gap.id}`}>Article title</label>
                    <input
                      id={`title-${gap.id}`}
                      name="title"
                      required
                      className="field"
                      defaultValue={gap.question.replace(/[?.!]+$/, "").slice(0, 60)}
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor={`body-${gap.id}`}>The answer, in your words</label>
                    <textarea
                      id={`body-${gap.id}`}
                      name="body"
                      required
                      rows={3}
                      className="field resize-y"
                      placeholder="Write it once. It applies from the next message onward."
                    />
                  </div>
                </div>
              </form>

              <div className="flex flex-wrap gap-2 p-5">
                <SubmitButton form={`answer-${gap.id}`} pendingLabel="Saving…">
                  Add to knowledge base
                </SubmitButton>
                <form action={setGapStatusAction}>
                  <input type="hidden" name="gap_id" value={gap.id} />
                  <input type="hidden" name="status" value="dismissed" />
                  <button className="btn btn-ghost">Not worth answering</button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}

      {closed.length > 0 ? (
        <>
          <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wider text-mist-400">Closed</h2>
          <Card className="!p-0">
            <ul className="divide-y divide-ink-800">
              {closed.map((gap) => (
                <li key={gap.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <Badge tone={gap.status === "answered" ? "jade" : "slate"}>{gap.status}</Badge>
                  <span className="min-w-0 flex-1 truncate text-mist-300">{gap.question}</span>
                  <span className="text-xs text-mist-400">{relativeTime(gap.last_seen)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      ) : null}
    </div>
  );
}
