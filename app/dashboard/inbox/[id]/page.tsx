import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, formatDateTime } from "@/components/ui";
import { SparkIcon } from "@/components/icons";
import { aiReplyAction, handBackAction, sendHumanReplyAction, setConversationStatusAction, takeOverAction } from "../../actions";
import { SubmitButton } from "@/components/submit-button";
import { activeBusiness } from "@/lib/session";
import { getContact, getConversation, listMessages } from "@/lib/repo";

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const business = await activeBusiness();
  const conversation = getConversation(id);
  if (!conversation || conversation.business_id !== business.id) notFound();

  const messages = listMessages(conversation.id);
  const contact = conversation.contact_id ? getContact(conversation.contact_id) : null;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_18rem]">
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Link href="/dashboard/inbox" className="text-sm text-mist-400 hover:text-mist-100">
            ← Inbox
          </Link>
          <h1 className="text-lg font-semibold">{conversation.subject}</h1>
          <Badge tone={conversation.handled_by === "ai" ? "jade" : "iris"}>
            {conversation.handled_by === "ai" ? `Handled by ${business.assistant_name}` : "Handled by a teammate"}
          </Badge>

          {/* The promised one click. While a teammate has it, the assistant
              does not reply to anything new on this thread. */}
          {conversation.handled_by === "ai" ? (
            <form action={takeOverAction} className="ml-auto">
              <input type="hidden" name="conversation_id" value={conversation.id} />
              <SubmitButton className="btn btn-ghost px-3 py-1.5 text-xs" pendingLabel="Taking over…">
                Take it over
              </SubmitButton>
            </form>
          ) : (
            <form action={handBackAction} className="ml-auto">
              <input type="hidden" name="conversation_id" value={conversation.id} />
              <SubmitButton className="btn btn-ghost px-3 py-1.5 text-xs" pendingLabel="Handing back…">
                Let {business.assistant_name} take it again
              </SubmitButton>
            </form>
          )}
        </div>

        {conversation.handled_by === "human" ? (
          <p className="mb-4 rounded-lg border border-iris/30 bg-iris/10 px-3 py-2 text-xs text-mist-300">
            You have this thread. {business.assistant_name} will not reply to anything new on it — the customer&apos;s
            messages are captured and you are told about them.
          </p>
        ) : null}

        <Card className="!p-0">
          <div className="space-y-4 p-5">
            {messages.map((message) => {
              const mine = message.role !== "customer";
              return (
                <div key={message.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                  <div className="max-w-[80%] space-y-2">
                    <div
                      className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        message.role === "customer"
                          ? "border border-ink-700 bg-ink-850"
                          : message.role === "agent"
                            ? "bg-iris/90 text-ink-950"
                            : "bg-jade-500 text-ink-950"
                      }`}
                    >
                      {message.body}
                    </div>
                    {message.actions.length > 0 ? (
                      <ul className="space-y-1 text-right">
                        {message.actions.map((action, i) => (
                          <li key={i} className="text-xs text-mist-400">
                            <span className="text-mist-300">{action.label}</span>
                            {action.detail ? ` — ${action.detail}` : ""}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <p className={`text-[11px] text-mist-400 ${mine ? "text-right" : ""}`}>
                      {message.role === "customer" ? (contact?.name ?? "Customer") : message.role === "agent" ? "Teammate" : business.assistant_name}
                      {" · "}
                      {formatDateTime(message.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-ink-700 p-4">
            <form action={sendHumanReplyAction} className="space-y-3">
              <input type="hidden" name="conversation_id" value={conversation.id} />
              <textarea
                name="body"
                required
                rows={3}
                placeholder="Reply as a teammate…"
                className="field resize-y"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button type="submit" className="btn btn-primary">
                  Send reply
                </button>
              </div>
            </form>

            <form action={aiReplyAction} className="mt-2">
              <input type="hidden" name="conversation_id" value={conversation.id} />
              <button type="submit" className="btn btn-ghost">
                <SparkIcon width={16} height={16} className="text-jade-400" />
                Let {business.assistant_name} take it
              </button>
            </form>
          </div>
        </Card>
      </div>

      <aside className="space-y-4">
        <Card>
          <h2 className="text-sm font-semibold">Contact</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-xs text-mist-400">Name</dt>
              <dd>{contact?.name ?? "Not captured yet"}</dd>
            </div>
            <div>
              <dt className="text-xs text-mist-400">Email</dt>
              <dd className="break-all">{contact?.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-mist-400">Phone</dt>
              <dd>{contact?.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-mist-400">Channel</dt>
              <dd className="capitalize">{conversation.channel}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold">Thread status</h2>
          <div className="mt-3 space-y-2">
            {(["open", "waiting", "closed"] as const).map((status) => (
              <form key={status} action={setConversationStatusAction}>
                <input type="hidden" name="conversation_id" value={conversation.id} />
                <input type="hidden" name="status" value={status} />
                <button
                  type="submit"
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm capitalize transition ${
                    conversation.status === status
                      ? "border-jade-500/50 bg-jade-500/10 text-jade-300"
                      : "border-ink-700 text-mist-400 hover:text-mist-100"
                  }`}
                >
                  {status}
                </button>
              </form>
            ))}
          </div>
        </Card>
      </aside>
    </div>
  );
}
