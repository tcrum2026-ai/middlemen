import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader, relativeTime, usd } from "@/components/ui";
import { activeBusiness } from "@/lib/session";
import { listAppointments, listCallRequests, listContacts, listConversations, listLeads } from "@/lib/repo";

export default async function ContactsPage() {
  const business = await activeBusiness();
  const contacts = listContacts(business.id);
  const conversations = listConversations(business.id);
  const leads = listLeads(business.id);
  const appointments = listAppointments(business.id);
  const calls = listCallRequests(business.id);

  return (
    <div>
      <PageHeader
        title="Contacts"
        subtitle="Everyone your assistant has spoken to, with the whole history behind each name."
      />

      {contacts.length === 0 ? (
        <EmptyState title="No contacts yet" body="Anyone who gives a name, email or number in a conversation lands here." />
      ) : (
        <Card className="!p-0">
          <ul className="divide-y divide-ink-800">
            {contacts.map((contact) => {
              const threads = conversations.filter((c) => c.contact_id === contact.id);
              const contactLeads = leads.filter((l) => l.contact_id === contact.id);
              const value = contactLeads.reduce((sum, lead) => sum + lead.value_cents, 0);
              const upcoming = appointments.filter(
                (a) => a.contact_id === contact.id && a.status !== "cancelled",
              ).length;
              const openCalls = calls.filter((c) => c.contact_id === contact.id && c.status !== "done").length;

              return (
                <li key={contact.id}>
                  <Link
                    href={`/dashboard/contacts/${contact.id}`}
                    className="flex flex-wrap items-center gap-4 px-5 py-4 transition hover:bg-ink-850/50"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-ink-700 bg-ink-850 text-xs font-semibold">
                      {contact.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{contact.name}</p>
                      <p className="truncate text-xs text-mist-400">
                        {[contact.email, contact.phone, contact.company].filter(Boolean).join(" · ") || "no details captured"}
                      </p>
                    </div>
                    {openCalls > 0 ? <Badge tone="amber">callback queued</Badge> : null}
                    {upcoming > 0 ? <Badge tone="jade">{upcoming} booked</Badge> : null}
                    <span className="w-20 text-right text-sm tabular-nums">{value ? usd(value) : "—"}</span>
                    <span className="w-24 text-right text-xs text-mist-400">
                      {threads.length} thread{threads.length === 1 ? "" : "s"}
                    </span>
                    <span className="w-16 text-right text-xs text-mist-400">{relativeTime(contact.created_at)}</span>
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
