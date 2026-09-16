import { Badge, Card, PageHeader } from "@/components/ui";
import { toggleIntegrationAction } from "../actions";
import { activeBusiness } from "@/lib/session";
import { listIntegrations } from "@/lib/repo";

const CATALOG: Record<string, { label: string; blurb: string; group: string }> = {
  gmail: { label: "Gmail", blurb: "Read and reply to support mail", group: "Messaging" },
  outlook: { label: "Outlook", blurb: "Microsoft 365 mailboxes", group: "Messaging" },
  "twilio-sms": { label: "Twilio SMS", blurb: "Two-way texting with customers", group: "Messaging" },
  whatsapp: { label: "WhatsApp", blurb: "WhatsApp Business messaging", group: "Messaging" },
  slack: { label: "Slack", blurb: "Escalations posted where your team works", group: "Messaging" },
  "google-calendar": { label: "Google Calendar", blurb: "Real availability and real bookings", group: "Scheduling" },
  stripe: { label: "Stripe", blurb: "Payment links, deposits and invoices", group: "Money" },
  quickbooks: { label: "QuickBooks", blurb: "Estimates and invoices in your books", group: "Money" },
  hubspot: { label: "HubSpot", blurb: "Push scored leads into your CRM", group: "Pipeline" },
  shopify: { label: "Shopify", blurb: "Order and shipping status answers", group: "Pipeline" },
  zapier: { label: "Zapier", blurb: "Five thousand other apps", group: "Extend" },
  webhooks: { label: "Webhooks", blurb: "Post every event to your own stack", group: "Extend" },
};

export default async function IntegrationsPage() {
  const business = await activeBusiness();
  const integrations = listIntegrations(business.id);
  const status = new Map(integrations.map((i) => [i.provider, i.status]));
  const groups = [...new Set(Object.values(CATALOG).map((c) => c.group))];

  return (
    <div>
      <PageHeader
        title="Integrations"
        subtitle="Connect what you use. None of it is required — the assistant works on day one with just your knowledge base."
      />

      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-mist-400">{group}</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Object.entries(CATALOG)
                .filter(([, meta]) => meta.group === group)
                .map(([provider, meta]) => {
                  const connected = status.get(provider) === "connected";
                  return (
                    <Card key={provider} className="flex items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-ink-700 bg-ink-850 text-sm font-semibold text-mist-300">
                        {meta.label.slice(0, 2)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">{meta.label}</p>
                          {connected ? <Badge tone="jade">connected</Badge> : null}
                        </div>
                        <p className="truncate text-xs text-mist-400">{meta.blurb}</p>
                      </div>
                      <form action={toggleIntegrationAction}>
                        <input type="hidden" name="provider" value={provider} />
                        <input type="hidden" name="next" value={connected ? "disconnected" : "connected"} />
                        <button className={`btn ${connected ? "btn-ghost" : "btn-primary"} px-3 py-1.5 text-xs`}>
                          {connected ? "Disconnect" : "Connect"}
                        </button>
                      </form>
                    </Card>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
