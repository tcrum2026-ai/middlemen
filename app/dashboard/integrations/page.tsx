import { headers } from "next/headers";
import { Badge, Card, PageHeader, relativeTime } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { CopyBlock } from "@/components/copy-block";
import { CheckIcon, PlugIcon, SparkIcon } from "@/components/icons";
import { assistantConfigured } from "@/lib/assistant";
import { disconnectIntegrationAction, saveIntegrationAction } from "../actions";
import { activeBusiness } from "@/lib/session";
import { feedStatus } from "@/lib/calendar-feed";
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


export default async function IntegrationsPage() {
  const business = await activeBusiness();
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const calendar = await feedStatus(business.id);
  const origin = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
  const deliveries = listDeliveries(business.id, 8);
  const brainLive = assistantConfigured();

  return (
    <div>
      <PageHeader
        title="Integrations"
        subtitle="Paste a key, and the thing it powers starts working on the next message. Nothing here is required to go live."
      />

      <section className="mb-8" id="assistant">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-mist-400">The assistant itself</h2>
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <SparkIcon width={16} height={16} className={brainLive ? "text-jade-400" : "text-amber-glow"} />
            <h3 className="font-semibold">Anthropic API key</h3>
            <Badge tone={brainLive ? "jade" : "amber"}>{brainLive ? "live" : "scripted mode"}</Badge>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-mist-400">
            {brainLive
              ? "Replies are written by Claude against your knowledge base. This is the only key the assistant itself needs."
              : "Without it every screen still works, but replies come from a small keyword script instead of Claude — " +
                "it answers what it can match and hands everything else to a person."}
          </p>

          <ol className="mt-4 space-y-3 text-sm text-mist-300">
            <li className="flex gap-3">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-ink-700 text-xs text-mist-400">1</span>
              <span>
                Create a key at{" "}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-jade-400 underline underline-offset-2"
                >
                  console.anthropic.com/settings/keys
                </a>
                . You will need billing on the account — usage is pay-as-you-go.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-ink-700 text-xs text-mist-400">2</span>
              <span>
                Put it in <code className="font-mono text-xs text-mist-200">.env.local</code> next to{" "}
                <code className="font-mono text-xs text-mist-200">package.json</code>, or in your host&apos;s
                environment variables (Vercel → Settings → Environment Variables).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-ink-700 text-xs text-mist-400">3</span>
              <span>Restart the server. The badge above turns green and the next message is answered by Claude.</span>
            </li>
          </ol>

          <div className="mt-4">
            <CopyBlock label=".env.local" code={"ANTHROPIC_API_KEY=sk-ant-..."} />
          </div>

          <p className="mt-3 text-xs leading-relaxed text-mist-400">
            There is deliberately no field for this key on this page. It belongs to the server, not to one workspace, so
            it never travels through a browser form or gets written to the database — unlike the per-workspace keys
            below.
          </p>
        </Card>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-mist-400">Nothing to configure</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {ZERO_CONFIG.map((item) => (
            <Card key={item.id} className="min-w-0">
              <div className="flex items-center gap-2">
                <CheckIcon width={16} height={16} className="text-jade-400" />
                <h3 className="font-semibold">{item.label}</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-mist-400">{item.blurb}</p>
              <p
                tabIndex={0}
                role="group"
                aria-label="Webhook URL"
                className="mt-3 overflow-x-auto rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 font-mono text-xs text-mist-300"
              >
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
            const health = provider.id === "calendar-feed" ? calendar : null;
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

                {/* A calendar feed that has quietly stopped resolving means
                    the assistant is double-booking again, and nothing else
                    on this page would say so. */}
                {health?.connected ? (
                  <p
                    className={`border-b border-ink-700 px-5 py-2.5 text-xs ${
                      health.error ? "bg-amber-glow/[0.06] text-mist-200" : "text-mist-400"
                    }`}
                  >
                    {health.error ? (
                      <>
                        <span className="font-medium text-amber-glow">Could not read your calendar</span> —{" "}
                        {health.error}. Until it works, the assistant only knows about bookings it made itself, so
                        it can offer a time you are not free.
                      </>
                    ) : (
                      <>
                        Read {health.events} commitment{health.events === 1 ? "" : "s"} from your calendar in the
                        next 30 days. Those times are not offered to customers.
                      </>
                    )}
                  </p>
                ) : null}

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
                        <ConfirmButton
                          formAction={disconnectIntegrationAction}
                          confirmLabel="Delete the key?"
                          pendingLabel="Disconnecting…"
                          className="btn btn-ghost px-3 py-1.5 text-xs"
                        >
                          Disconnect
                        </ConfirmButton>
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
                        <p tabIndex={0} role="group" aria-label="Callback URL" className="mt-1.5 overflow-x-auto font-mono text-[11px] text-jade-400">
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
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-mist-400">Not built yet</h2>
        <Card>
          <p className="text-sm leading-relaxed text-mist-300">
            Outlook, WhatsApp, QuickBooks, HubSpot, Shopify and Zapier aren&apos;t implemented. They&apos;re listed
            here so you know where the edge is, not as a promise with a date on it. Everything above this line is
            wired to a real provider — if you can paste a key into it, it works.
          </p>
          <p className="mt-3 text-sm text-mist-400">
            Need one of them sooner? The delivery layer in <code className="font-mono text-xs">lib/delivery.ts</code>{" "}
            is where a new provider slots in.
          </p>
        </Card>
      </section>
    </div>
  );
}
