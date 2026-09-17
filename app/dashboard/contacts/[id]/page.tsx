import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, PageHeader, formatDateTime, usd } from "@/components/ui";
import { activeBusiness } from "@/lib/session";
import { contactTimeline, getContact, listLeads } from "@/lib/repo";

const KIND_TONE = { message: "slate", appointment: "jade", lead: "iris", call: "amber" } as const;

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const business = await activeBusiness();
  const contact = getContact(id);
  if (!contact || contact.business_id !== business.id) notFound();

  const timeline = contactTimeline(business.id, contact.id);
  const leads = listLeads(business.id).filter((lead) => lead.contact_id === contact.id);
  const value = leads.reduce((sum, lead) => sum + lead.value_cents, 0);

  return (
    <div>
      <Link href="/dashboard/contacts" className="text-sm text-mist-400 hover:text-mist-100">
        ← Contacts
      </Link>
      <PageHeader
        title={contact.name}
        subtitle={[contact.email, contact.phone, contact.company].filter(Boolean).join(" · ") || "No details captured yet"}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
        <Card className="!p-0">
          <div className="border-b border-ink-700 px-5 py-3.5">
            <h2 className="font-semibold">Everything, in order</h2>
          </div>
          <ul className="divide-y divide-ink-800">
            {timeline.length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-mist-400">Nothing recorded yet.</li>
            ) : (
              timeline.map((item, index) => (
                <li key={index} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={KIND_TONE[item.kind]}>{item.kind}</Badge>
                    <p className="min-w-0 flex-1 text-sm font-medium">{item.title}</p>
                    <span className="text-xs text-mist-400">{formatDateTime(item.at)}</span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-mist-400">{item.detail}</p>
                  {item.href ? (
                    <Link href={item.href} className="mt-1.5 inline-block text-xs text-jade-400 hover:underline">
                      Open →
                    </Link>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </Card>

        <aside className="space-y-4">
          <Card>
            <h2 className="text-sm font-semibold">Pipeline</h2>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{value ? usd(value) : "—"}</p>
            <p className="text-xs text-mist-400">
              across {leads.length} lead{leads.length === 1 ? "" : "s"}
            </p>
            <ul className="mt-3 space-y-2">
              {leads.map((lead) => (
                <li key={lead.id} className="text-sm">
                  <p className="text-mist-300">{lead.intent}</p>
                  <p className="text-xs text-mist-400">
                    {lead.stage} · score {lead.score}
                  </p>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold">Details</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-xs text-mist-400">Email</dt>
                <dd className="break-all">{contact.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-mist-400">Phone</dt>
                <dd>{contact.phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-mist-400">Company</dt>
                <dd>{contact.company ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-mist-400">First seen</dt>
                <dd>{formatDateTime(contact.created_at)}</dd>
              </div>
            </dl>
          </Card>
        </aside>
      </div>
    </div>
  );
}
