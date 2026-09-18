import { SubmitButton } from "@/components/submit-button";
import { Badge, Card, PageHeader } from "@/components/ui";
import { updateSettingsAction } from "../actions";
import { ConnectionTest } from "@/components/connection-test";
import { assistantConfigured } from "@/lib/assistant";
import { activeBusiness } from "@/lib/session";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export default async function SettingsPage() {
  const business = await activeBusiness();

  return (
    <div>
      <PageHeader title="Settings" subtitle="How your assistant sounds, what it may decide alone, and when it works." />

      <form action={updateSettingsAction} className="space-y-5">
        <Card>
          <h2 className="font-semibold">Business</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="name">Name</label>
              <input id="name" name="name" defaultValue={business.name} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="industry">Industry</label>
              <input id="industry" name="industry" defaultValue={business.industry} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="website">Website</label>
              <input id="website" name="website" defaultValue={business.website ?? ""} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="email">Support email</label>
              <input id="email" name="email" defaultValue={business.email ?? ""} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="phone">Phone</label>
              <input id="phone" name="phone" defaultValue={business.phone ?? ""} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="timezone">Timezone</label>
              <input id="timezone" name="timezone" defaultValue={business.timezone} className="field" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="services">Services (comma separated)</label>
              <input id="services" name="services" defaultValue={business.services.join(", ")} className="field" />
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold">Assistant</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="assistant_name">Name</label>
              <input id="assistant_name" name="assistant_name" defaultValue={business.assistant_name} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="tone">Tone</label>
              <select id="tone" name="tone" defaultValue={business.tone} className="field">
                <option value="friendly-professional">Friendly and professional</option>
                <option value="warm-casual">Warm and casual</option>
                <option value="brisk-efficient">Brisk and efficient</option>
                <option value="formal">Formal</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="greeting">Opening line</label>
              <textarea id="greeting" name="greeting" rows={2} defaultValue={business.greeting} className="field resize-y" />
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold">Guardrails</h2>
          <p className="mt-1 text-sm text-mist-400">
            Whatever you set here, refunds and disputes always come to you.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="autonomy">Autonomy</label>
              <select id="autonomy" name="autonomy" defaultValue={business.autonomy} className="field">
                <option value="cautious">Cautious — draft everything, send nothing</option>
                <option value="balanced">Balanced — answer and book, escalate money</option>
                <option value="autonomous">Autonomous — handle quotes and changes too</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="auto_send_threshold">Auto-send confidence threshold</label>
              <input
                id="auto_send_threshold"
                name="auto_send_threshold"
                type="number"
                step="0.05"
                min="0"
                max="1"
                defaultValue={business.auto_send_threshold}
                className="field"
              />
              <p className="mt-1.5 text-xs text-mist-400">Below this, the reply waits in Approvals.</p>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="effort">How hard it thinks</label>
              <select id="effort" name="effort" defaultValue={business.effort} className="field">
                <option value="low">Low — fastest and cheapest, fine for FAQ-style questions</option>
                <option value="medium">Medium — the default balance</option>
                <option value="high">High — slower and dearer, better on messy or high-stakes threads</option>
              </select>
              <p className="mt-1.5 text-xs text-mist-400">
                Applies to every reply. Raise it if you see shallow answers on complicated threads; lower it if
                replies feel slow and your questions are simple.
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="label" htmlFor="call_handoff_number">Number your team answers</label>
              <input
                id="call_handoff_number"
                name="call_handoff_number"
                defaultValue={business.call_handoff_number ?? ""}
                className="field"
              />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-semibold">Phone calls</h2>
            <Badge tone={business.voice_enabled ? "jade" : "slate"}>
              {business.voice_enabled ? "answering calls" : "off"}
            </Badge>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-mist-400">
            When this is on, your Twilio number is answered by the assistant instead of ringing. It can book, quote
            and answer from your knowledge base exactly as it does in chat, and put the caller through to the number
            below when it should not decide something itself.
          </p>

          <label className="mt-4 flex items-start gap-3 rounded-lg border border-ink-700 p-3">
            <input
              type="checkbox"
              name="voice_enabled"
              defaultChecked={Boolean(business.voice_enabled)}
              className="mt-0.5 h-4 w-4 accent-jade-500"
            />
            <span className="text-sm">
              <span className="font-medium">Answer incoming calls with AI</span>
              <span className="mt-0.5 block text-xs text-mist-400">
                Off by default. With it off, calls to your Twilio number ring the handoff number instead.
              </span>
            </span>
          </label>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="voice_disclosure">What callers are told first</label>
              <input
                id="voice_disclosure"
                name="voice_disclosure"
                defaultValue={business.voice_disclosure}
                className="field"
              />
              <p className="mt-1.5 text-xs leading-relaxed text-mist-400">
                Spoken before anything else, on every call. You can word it your way, but it cannot be turned off —
                several places require telling people they have reached an AI, and it is the right thing to do
                anyway.
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="label" htmlFor="voice_greeting">Then it says</label>
              <input
                id="voice_greeting"
                name="voice_greeting"
                defaultValue={business.voice_greeting}
                placeholder={`Thanks for calling ${business.name}. How can I help?`}
                className="field"
              />
            </div>

            <div>
              <label className="label" htmlFor="voice_name">Voice</label>
              <input id="voice_name" name="voice_name" defaultValue={business.voice_name} className="field" />
              <p className="mt-1.5 text-xs text-mist-400">
                A Twilio ConversationRelay voice id.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold">Working hours</h2>
          <p className="mt-1 text-sm text-mist-400">Bookings are only offered inside these windows. Use “closed” for days off.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {DAYS.map((day) => (
              <div key={day}>
                <label className="label capitalize" htmlFor={`hours_${day}`}>{day}</label>
                <input id={`hours_${day}`} name={`hours_${day}`} defaultValue={business.hours[day] ?? "closed"} className="field" />
              </div>
            ))}
          </div>
        </Card>

        <div className="flex items-center gap-3">
          <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
          <p className="text-xs text-mist-400">Applies to the next message your assistant handles.</p>
        </div>
      </form>

      <Card className="mt-5">
        <ConnectionTest initiallyConfigured={assistantConfigured()} />
      </Card>

      <Card className="mt-5">
        <h2 className="font-semibold">Your data</h2>
        <p className="mt-1 text-sm text-mist-400">
          Everything in this workspace, in formats you can open. No request form, no waiting period.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ["all", "Everything (JSON)"],
            ["contacts", "Contacts (CSV)"],
            ["leads", "Leads (CSV)"],
            ["conversations", "Conversations (CSV)"],
            ["appointments", "Appointments (CSV)"],
            ["calls", "Call briefs (CSV)"],
            ["knowledge", "Knowledge base (CSV)"],
          ].map(([type, label]) => (
            <a key={type} href={`/api/export?type=${type}`} className="btn btn-ghost px-3 py-1.5 text-xs">
              {label}
            </a>
          ))}
        </div>
      </Card>
    </div>
  );
}
