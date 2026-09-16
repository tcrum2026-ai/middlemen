import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader, relativeTime } from "@/components/ui";
import { activeBusiness } from "@/lib/session";
import { getContact, listConversations, listMessages } from "@/lib/repo";

export default async function InboxPage() {
  const business = await activeBusiness();
  const conversations = listConversations(business.id);

  return (
    <div>
      <PageHeader
        title="Inbox"
        subtitle="Every channel in one place. Your assistant has already replied to anything it was confident about."
      />

      {conversations.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          body="Install the widget or forward your support inbox, and threads will land here already answered."
        />
      ) : (
        <Card className="!p-0">
          <ul className="divide-y divide-ink-800">
            {conversations.map((conversation) => {
              const messages = listMessages(conversation.id);
              const last = messages[messages.length - 1];
              const contact = conversation.contact_id ? getContact(conversation.contact_id) : null;
              return (
                <li key={conversation.id}>
                  <Link
                    href={`/dashboard/inbox/${conversation.id}`}
                    className="flex items-start gap-4 px-5 py-4 transition hover:bg-ink-850/50"
                  >
                    <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-ink-700 bg-ink-850 text-xs font-semibold">
                      {(contact?.name ?? "?").slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{contact?.name ?? "Unknown contact"}</p>
                        <span className="text-xs uppercase tracking-wide text-mist-400">{conversation.channel}</span>
                        {conversation.status === "waiting" ? <Badge tone="amber">waiting on us</Badge> : null}
                      </div>
                      <p className="truncate text-sm text-mist-300">{conversation.subject}</p>
                      {last ? (
                        <p className="mt-0.5 truncate text-xs text-mist-400">
                          {last.role === "customer" ? "" : `${last.role === "agent" ? "Teammate" : business.assistant_name}: `}
                          {last.body}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="text-xs text-mist-400">{relativeTime(conversation.last_message_at)}</span>
                      <Badge tone={conversation.handled_by === "ai" ? "jade" : "iris"}>
                        {conversation.handled_by === "ai" ? "AI" : "Human"}
                      </Badge>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
