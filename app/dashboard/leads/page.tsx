import { Badge, Card, EmptyState, PageHeader, relativeTime, usd } from "@/components/ui";
import { setLeadStageAction } from "../actions";
import { activeBusiness } from "@/lib/session";
import { getContact, listLeads, listQuotes } from "@/lib/repo";
import type { Lead } from "@/lib/types";

const STAGES: Lead["stage"][] = ["new", "qualified", "quoted", "won", "lost"];

export default async function LeadsPage() {
  const business = await activeBusiness();
  const leads = listLeads(business.id);
  const quotes = listQuotes(business.id);

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle="Every inbound message is scored and filed the moment it arrives — no one has to remember to write it down."
      />

      {leads.length === 0 ? (
        <EmptyState title="No leads yet" body="Buying intent in any channel becomes a scored lead automatically." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-5">
          {STAGES.map((stage) => {
            const inStage = leads.filter((l) => l.stage === stage);
            return (
              <div key={stage} className="min-w-0">
                <div className="mb-2 flex items-center justify-between px-1">
                  <h2 className="text-sm font-semibold capitalize">{stage}</h2>
                  <span className="text-xs text-mist-400">{inStage.length}</span>
                </div>
                <div className="space-y-2">
                  {inStage.map((lead) => {
                    const contact = lead.contact_id ? getContact(lead.contact_id) : null;
                    return (
                      <div key={lead.id} className="card p-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium">{contact?.name ?? "Unknown"}</p>
                          <Badge tone={lead.score >= 80 ? "jade" : lead.score >= 60 ? "amber" : "slate"}>
                            {lead.score}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-mist-400">{lead.intent}</p>
                        <p className="mt-2 text-sm font-semibold">{usd(lead.value_cents)}</p>
                        <p className="text-[11px] text-mist-400">
                          {lead.source} · {relativeTime(lead.created_at)}
                        </p>
                        <form action={setLeadStageAction} className="mt-2.5">
                          <input type="hidden" name="lead_id" value={lead.id} />
                          <select
                            name="stage"
                            defaultValue={lead.stage}
                            className="w-full rounded-md border border-ink-700 bg-ink-950 px-2 py-1 text-xs text-mist-300"
                            aria-label="Move stage"
                          >
                            {STAGES.map((s) => (
                              <option key={s} value={s}>
                                Move to {s}
                              </option>
                            ))}
                          </select>
                          <button className="mt-1.5 w-full rounded-md border border-ink-700 py-1 text-xs text-mist-400 hover:text-mist-100">
                            Save
                          </button>
                        </form>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {quotes.length > 0 ? (
        <>
          <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wider text-mist-400">Quotes drafted</h2>
          <Card className="!p-0">
            <ul className="divide-y divide-ink-800">
              {quotes.map((quote) => (
                <li key={quote.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{quote.title}</p>
                    <p className="text-xs text-mist-400">
                      {quote.line_items
                        .map((li) => `${li.quantity} × ${li.description}`)
                        .join(", ")}
                    </p>
                  </div>
                  <span className="font-semibold">{usd(quote.total_cents)}</span>
                  <Badge tone={quote.status === "accepted" ? "jade" : "slate"}>{quote.status}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        </>
      ) : null}
    </div>
  );
}
