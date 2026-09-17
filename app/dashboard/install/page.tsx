import { headers } from "next/headers";
import { Card, PageHeader } from "@/components/ui";
import { CopyBlock } from "@/components/copy-block";
import { WidgetCustomizer } from "@/components/widget-customizer";
import { activeBusiness } from "@/lib/session";

export default async function InstallPage() {
  const business = await activeBusiness();
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  const apiExample = `curl -X POST ${origin}/api/chat \\
  -H "Content-Type: application/json" \\
  -d '{
    "widgetKey": "${business.widget_key}",
    "message": "Do you have anything open tomorrow?"
  }'`;

  return (
    <div>
      <PageHeader
        title="Install"
        subtitle="One line on your site and your assistant is answering. No build step, no framework, no dependencies."
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_19rem]">
        <div className="space-y-5">
          <section>
            <h2 className="mb-2 font-semibold">1. Make it yours, then paste it before &lt;/body&gt;</h2>
            <WidgetCustomizer
              origin={origin}
              widgetKey={business.widget_key}
              businessName={business.name}
              defaultGreeting={business.greeting}
            />
            <p className="mt-2 text-xs text-mist-400">
              The snippet carries your choices as data attributes — nothing to save here, and no build step on your
              side.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold">2. See it on a page first</h2>
            <a
              href={`/widget-demo.html?key=${business.widget_key}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost"
            >
              Open the widget preview
            </a>
            <p className="mt-2 text-xs text-mist-400">
              A stand-in website with your assistant loaded exactly as it will load on yours.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold">3. Or share a link</h2>
            <CopyBlock code={`${origin}/chat/${business.widget_key}`} label="Hosted chat page" />
            <p className="mt-2 text-xs text-mist-400">
              Works as a QR code on an invoice, a link in your bio, or a button in your email signature — no website
              needed.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold">4. Or call the API from anywhere</h2>
            <CopyBlock code={apiExample} label="HTTP API" />
            <p className="mt-2 text-xs text-mist-400">
              The same endpoint backs email, SMS and WhatsApp. Pass{" "}
              <code className="font-mono">&quot;channel&quot;: &quot;sms&quot;</code> and reuse{" "}
              <code className="font-mono">conversationId</code> to keep a thread going.
            </p>
          </section>
        </div>

        <aside className="space-y-4">
          <Card>
            <h2 className="text-sm font-semibold">Your widget key</h2>
            <p className="mt-2 break-all font-mono text-sm text-jade-400">{business.widget_key}</p>
            <p className="mt-2 text-xs text-mist-400">
              Public by design — it only identifies which business a message belongs to. It cannot read your inbox or
              change settings.
            </p>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold">Forward your channels</h2>
            <ul className="mt-3 space-y-2.5 text-sm text-mist-300">
              <li>
                <span className="text-mist-400">Email:</span> forward {business.email ?? "your support inbox"} to{" "}
                <span className="font-mono text-xs">{business.slug}@inbound.middlemen.app</span>
              </li>
              <li>
                <span className="text-mist-400">SMS:</span> point your Twilio number&apos;s webhook at{" "}
                <span className="font-mono text-xs">/api/chat</span>
              </li>
              <li>
                <span className="text-mist-400">Everything else:</span> Zapier or a webhook.
              </li>
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
