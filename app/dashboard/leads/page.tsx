import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader, relativeTime, usd } from "@/components/ui";
import { CopyLink } from "@/components/copy-link";
import { SubmitButton } from "@/components/submit-button";
import { setLeadStageAction, setQuoteStatusAction } from "../actions";
import { PaymentLinkButton } from "./payment-link-button";
import { activeBusiness } from "@/lib/session";
import { getContact, listLeads, listQuotes } from "@/lib/repo";
import { isConnected } from "@/lib/integrations";
import type { Lead } from "@/lib/types";

const STAGES: Lead["stage"][] = ["new", "qualified", "quoted", "won", "lost"];

export default async function LeadsPage() {
  const business = await activeBusiness();
  const leads = listLeads(business.id);
  const quotes = listQuotes(business.id);
  // Without a Stripe key there is nothing to mint a link with, so the button
  // is replaced by the thing you'd actually have to go and do.
  const stripeConnected = isConnected(business.id, "stripe");

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle="Every inbound message is scored and filed the moment it arrives — no one has to remember to write it down."
      />

      {leads.length === 0 ? (
        <EmptyState title="No leads yet" body="Buying intent in any channel becomes a scored lead automatically." />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
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
                <li key={quote.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{quote.title}</p>
                      <p className="text-xs text-mist-400">
                        {quote.line_items.map((li) => `${li.quantity} × ${li.description}`).join(", ")}
                      </p>
                    </div>
                    <span className="font-semibold tabular-nums">{usd(quote.total_cents)}</span>
                    <Badge
                      tone={
                        quote.status === "accepted"
                          ? "jade"
                          : quote.status === "declined"
                            ? "rose"
                            : quote.status === "sent"
                              ? "amber"
                              : "slate"
                      }
                    >
                      {quote.status}
                    </Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                    {quote.payment_url ? (
                      <CopyLink url={quote.payment_url} />
                    ) : stripeConnected ? (
                      <PaymentLinkButton quoteId={quote.id} />
                    ) : (
                      <p className="text-xs text-mist-400">
                        <Link href="/dashboard/integrations" className="link">
                          Connect Stripe
                        </Link>{" "}
                        to turn this into a link the customer can pay.
                      </p>
                    )}

                    {quote.status !== "accepted" && quote.status !== "declined" ? (
                      <div className="flex gap-2">
                        <form action={setQuoteStatusAction}>
                          <input type="hidden" name="quote_id" value={quote.id} />
                          <input type="hidden" name="status" value="accepted" />
                          <SubmitButton className="btn btn-ghost !px-3 !py-1.5 text-xs">Mark accepted</SubmitButton>
                        </form>
                        <form action={setQuoteStatusAction}>
                          <input type="hidden" name="quote_id" value={quote.id} />
                          <input type="hidden" name="status" value="declined" />
                          <SubmitButton className="btn btn-ghost !px-3 !py-1.5 text-xs">Declined</SubmitButton>
                        </form>
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </>
      ) : null}
    </div>
  );
}
