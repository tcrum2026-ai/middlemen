import { headers } from "next/headers";
import { Badge, Card, PageHeader, relativeTime } from "@/components/ui";
import { CheckIcon, PlugIcon } from "@/components/icons";
import { disconnectIntegrationAction, saveIntegrationAction, toggleIntegrationAction } from "../actions";
import { activeBusiness } from "@/lib/session";
import { listIntegrations } from "@/lib/repo";
import { PROVIDERS, isConnected, maskedCredentials } from "@/lib/integrations";
import { listDeliveries } from "@/lib/delivery";

/** Things that need nothing but a URL — no keys, no OAuth. */
const ZERO_CONFIG = [
  {
    id: "calendar",
    label: "Calendar subscription",
    blurb:
      "Paste this into Google Calendar (Other calendars → From URL), Apple Calendar or Outlook. Booked work appears " +
      "there within about fifteen minutes and stays in sync.",
    path: (key: string) => `/api/calendar/${key}.ics`,
  },
  {
    id: "widget",
    label: "Website widget",
    blurb: "One script tag on your site. Customise it on the Install page.",
    path: () => "/dashboard/install",
  },
];

const CATALOG_EXTRA: { provider: string; label: string; blurb: string }[] = [
  { provider: "outlook", label: "Outlook", blurb: "Microsoft 365 mailboxes" },
  { provider: "whatsapp", label: "WhatsApp", blurb: "WhatsApp Business messaging" },
  { provider: "quickbooks", label: "QuickBooks", blurb: "Estimates and invoices in your books" },
  { provider: "hubspot", label: "HubSpot", blurb: "Push scored leads into your CRM" },
  { provider: "shopify", label: "Shopify", blurb: "Order and shipping status answers" },
  { provider: "zapier", label: "Zapier", blurb: "Five thousand other apps" },
];

export default async function IntegrationsPage() {
  const business = await activeBusiness();
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const origin = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
  const legacy = new Map(listIntegrations(business.id).map((i) => [i.provider, i.status]));
  const deliveries = listDeliveries(business.id, 8);

  return (
    <div>
      <PageHeader
        title="Integrations"
        subtitle="Paste a key, and the thing it powers starts working on the next message. Nothing here is required to go live."
      />

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-mist-400">Nothing to configure</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {ZERO_CONFIG.map((item) => (
            <Card key={item.id}>
              <div className="flex items-center gap-2">
                <CheckIcon width={16} height={16} className="text-jade-400" />
                <h3 className="font-semibold">{item.label}</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-mist-400">{item.blurb}</p>
              <p className="mt-3 overflow-x-auto rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 font-mono text-xs text-mist-300">
                {origin}
                {item.path(business.widget_key)}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-mist-400">Connect with a key</h2>
        <div className="space-y-4">
          {PROVIDERS.map((provider) => {
            const connected = isConnected(business.id, provider.id);
            const saved = maskedCredentials(business.id, provider.id);
            return (
              <Card key={provider.id} className="!p-0">
                <div className="flex flex-wrap items-center gap-3 border-b border-ink-700 px-5 py-3.5">
                  <PlugIcon width={16} height={16} className={connected ? "text-jade-400" : "text-mist-400"} />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{provider.label}</h3>
                    <p className="text-xs text-mist-400">{provider.blurb}</p>
                  </div>
                  {connected ? <Badge tone="jade">connected</Badge> : <Badge tone="slate">not connected</Badge>}
                </div>

                <div className="grid gap-5 p-5 lg:grid-cols-[1.4fr_1fr]">
                  <form action={saveIntegrationAction} className="space-y-3">
                    <input type="hidden" name="provider" value={provider.id} />
                    {provider.fields.map((field) => (
                      <div key={field.name}>
                        <label className="label" htmlFor={`${provider.id}-${field.name}`}>
                          {field.label}
                        </label>
                        <input
                          id={`${provider.id}-${field.name}`}
                          name={field.name}
                          type={field.secret ? "password" : "text"}
                          defaultValue={saved[field.name] ?? ""}
                          placeholder={field.placeholder}
                          autoComplete="off"
                          className="field font-mono text-xs"
                        />
                      </div>
                    ))}
                    <div className="flex flex-wrap items-center gap-2">
                      <button className="btn btn-primary px-3 py-1.5 text-xs">
                        {connected ? "Update" : "Connect"}
                      </button>
                      {connected ? (
                        <button
                          formAction={disconnectIntegrationAction}
                          className="btn btn-ghost px-3 py-1.5 text-xs"
                        >
                          Disconnect
                        </button>
                      ) : null}
                      {provider.docs ? (
                        <span className="text-xs text-mist-400">Key lives at {provider.docs}</span>
                      ) : null}
                    </div>
                  </form>

                  <div className="rounded-xl border border-ink-700 bg-ink-950 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-mist-400">
                      What this turns on
                    </p>
                    <ul className="mt-2.5 space-y-1.5">
                      {provider.enables.map((item) => (
                        <li key={item} className="flex gap-2 text-sm text-mist-300">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-jade-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    {provider.callbackPath ? (
                      <>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-mist-400">
                          Point the provider here
                        </p>
                        <p className="mt-1.5 overflow-x-auto font-mono text-[11px] text-jade-400">
                          {origin}
                          {provider.callbackPath}
                        </p>
                      </>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {deliveries.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-mist-400">Recent sends</h2>
          <Card className="!p-0">
            <ul className="divide-y divide-ink-800">
              {deliveries.map((delivery) => (
                <li key={delivery.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                  <Badge
                    tone={delivery.status === "sent" ? "jade" : delivery.status === "failed" ? "rose" : "slate"}
                  >
                    {delivery.status}
                  </Badge>
                  <span className="text-xs uppercase tracking-wide text-mist-400">{delivery.channel}</span>
                  <span className="min-w-0 flex-1 truncate text-mist-300">
                    {delivery.recipient} — {delivery.subject ?? delivery.body.slice(0, 60)}
                  </span>
                  {delivery.detail ? (
                    <span className="truncate text-xs text-mist-400">{delivery.detail}</span>
                  ) : null}
                  <span className="text-xs text-mist-400">{relativeTime(delivery.created_at)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-mist-400">On the roadmap</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATALOG_EXTRA.map((item) => (
            <Card key={item.provider} className="flex min-w-0 flex-wrap items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-ink-700 bg-ink-850 text-sm font-semibold text-mist-300">
                {item.label.slice(0, 2)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.label}</p>
                <p className="truncate text-xs text-mist-400">{item.blurb}</p>
              </div>
              <form action={toggleIntegrationAction}>
                <input type="hidden" name="provider" value={item.provider} />
                <input
                  type="hidden"
                  name="next"
                  value={legacy.get(item.provider) === "connected" ? "disconnected" : "connected"}
                />
                <button className="btn btn-ghost px-3 py-1.5 text-xs">
                  {legacy.get(item.provider) === "connected" ? "Marked" : "Mark wanted"}
                </button>
              </form>
            </Card>
          ))}
        </div>
        <p className="mt-3 text-xs text-mist-400">
          These aren&apos;t wired up yet — marking one records that you want it. Everything above is live.
        </p>
      </section>
    </div>
  );
}
