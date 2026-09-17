"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowIcon, CheckIcon } from "@/components/icons";
import { TEMPLATES, templateToText } from "@/lib/templates";

const INDUSTRIES = [
  "Home services (plumbing & HVAC)",
  "Dental or medical practice",
  "Salon, spa or wellness",
  "Law firm",
  "Real estate",
  "Auto repair",
  "Fitness studio",
  "Professional services",
  "E-commerce",
  "Other",
];

const INTEGRATION_OPTIONS = [
  { id: "gmail", label: "Gmail" },
  { id: "outlook", label: "Outlook" },
  { id: "google-calendar", label: "Google Calendar" },
  { id: "twilio-sms", label: "Twilio SMS" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "stripe", label: "Stripe" },
  { id: "quickbooks", label: "QuickBooks" },
  { id: "hubspot", label: "HubSpot" },
  { id: "slack", label: "Slack" },
];

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

/**
 * Each line is marked so the assistant refuses to quote it until it's replaced —
 * a half-filled knowledge base should look empty, not confident.
 */
const STARTER_KNOWLEDGE = `Services and pricing:
TODO — list what you sell and what it costs.

Hours and service area:
TODO — where you work, when you work, and what happens after hours.

Booking and cancellation policy:
TODO — how appointments work, how much notice you need, and any fees.

Warranty and guarantees:
TODO — what you stand behind, for how long, and what needs owner approval.`;

type Hours = Record<string, string>;

const DEFAULT_HOURS: Hours = {
  mon: "9:00-17:00",
  tue: "9:00-17:00",
  wed: "9:00-17:00",
  thu: "9:00-17:00",
  fri: "9:00-17:00",
  sat: "closed",
  sun: "closed",
};

const STEPS = ["Business", "Hours & services", "Your assistant", "Knowledge"];

export function ConnectWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [hours, setHours] = useState<Hours>(DEFAULT_HOURS);
  const [services, setServices] = useState("");
  const [integrations, setIntegrations] = useState<string[]>(["google-calendar"]);
  const [assistantName, setAssistantName] = useState("Ava");
  const [tone, setTone] = useState("friendly-professional");
  const [autonomy, setAutonomy] = useState<"cautious" | "balanced" | "autonomous">("balanced");
  const [callNumber, setCallNumber] = useState("");
  const [knowledge, setKnowledge] = useState("");

  const canAdvance = step === 0 ? name.trim().length > 1 : true;

  function toggleIntegration(id: string) {
    setIntegrations((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          industry,
          website,
          email,
          phone,
          hours,
          services: services
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          assistant_name: assistantName,
          tone,
          autonomy,
          call_handoff_number: callNumber,
          greeting: `Hi, this is ${assistantName} at ${name}. How can I help?`,
          knowledge,
          integrations,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Something went wrong");
      }
      router.push("/dashboard?welcome=1");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[14rem_1fr]">
      <ol className="space-y-1">
        {STEPS.map((label, index) => (
          <li key={label}>
            <button
              onClick={() => index < step && setStep(index)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                index === step
                  ? "bg-ink-850 text-mist-100"
                  : index < step
                    ? "text-mist-300 hover:bg-ink-850/60"
                    : "text-mist-400"
              }`}
            >
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs ${
                  index < step
                    ? "border-jade-500 bg-jade-500 text-ink-950"
                    : index === step
                      ? "border-jade-500 text-jade-400"
                      : "border-ink-700 text-mist-400"
                }`}
              >
                {index < step ? <CheckIcon width={13} height={13} /> : index + 1}
              </span>
              {label}
            </button>
          </li>
        ))}
      </ol>

      <div className="card p-6">
        {step === 0 ? (
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="name">Business name</label>
              <input id="name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Brightline Home Services" autoFocus />
            </div>
            <div>
              <label className="label" htmlFor="industry">What do you do?</label>
              <select id="industry" className="field" value={industry} onChange={(e) => setIndustry(e.target.value)}>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="website">Website</label>
                <input id="website" className="field" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
              </div>
              <div>
                <label className="label" htmlFor="email">Support email</label>
                <input id="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hello@" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="phone">Main phone number</label>
              <input id="phone" className="field" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 000-0000" />
              <p className="mt-1.5 text-xs text-mist-400">Used on callback briefs. Your assistant never dials it — your team does.</p>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-5">
            <div>
              <p className="label">Working hours</p>
              <div className="space-y-2">
                {DAYS.map((day) => (
                  <div key={day} className="flex items-center gap-3">
                    <span className="w-10 text-sm capitalize text-mist-400">{day}</span>
                    <input
                      className="field"
                      value={hours[day]}
                      onChange={(e) => setHours({ ...hours, [day]: e.target.value })}
                      placeholder="9:00-17:00 or closed"
                    />
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-mist-400">Bookings are only offered inside these windows.</p>
            </div>
            <div>
              <label className="label" htmlFor="services">Services (comma separated)</label>
              <input id="services" className="field" value={services} onChange={(e) => setServices(e.target.value)} placeholder="Repairs, Installations, Annual service" />
            </div>
            <div>
              <p className="label">Connect your tools (optional)</p>
              <div className="flex flex-wrap gap-2">
                {INTEGRATION_OPTIONS.map((option) => {
                  const on = integrations.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleIntegration(option.id)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                        on ? "border-jade-500/50 bg-jade-500/10 text-jade-300" : "border-ink-700 text-mist-400 hover:text-mist-100"
                      }`}
                    >
                      {on ? "✓ " : ""}{option.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-mist-400">You can connect these later — nothing here blocks going live.</p>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="assistant">Assistant name</label>
                <input id="assistant" className="field" value={assistantName} onChange={(e) => setAssistantName(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="tone">Tone</label>
                <select id="tone" className="field" value={tone} onChange={(e) => setTone(e.target.value)}>
                  <option value="friendly-professional">Friendly and professional</option>
                  <option value="warm-casual">Warm and casual</option>
                  <option value="brisk-efficient">Brisk and efficient</option>
                  <option value="formal">Formal</option>
                </select>
              </div>
            </div>

            <div>
              <p className="label">How much should it decide on its own?</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {([
                  ["cautious", "Cautious", "Drafts everything, sends nothing without you."],
                  ["balanced", "Balanced", "Answers and books freely; escalates money and risk."],
                  ["autonomous", "Autonomous", "Handles quotes and changes too; only edge cases escalate."],
                ] as const).map(([value, label, hint]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAutonomy(value)}
                    className={`rounded-xl border p-3 text-left transition ${
                      autonomy === value ? "border-jade-500/50 bg-jade-500/[0.06]" : "border-ink-700 hover:border-ink-600"
                    }`}
                  >
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="mt-1 text-xs text-mist-400">{hint}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label" htmlFor="callnumber">Who takes the calls?</label>
              <input id="callnumber" className="field" value={callNumber} onChange={(e) => setCallNumber(e.target.value)} placeholder="(555) 000-0000 — the number your team answers" />
              <p className="mt-1.5 text-xs text-mist-400">
                Queued callbacks show up in your dashboard with a brief. The assistant never places the call itself.
              </p>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <div>
              <p className="label">Start from a pack for your trade</p>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map((template) => (
                  <button
                    key={template.slug}
                    type="button"
                    onClick={() => {
                      setKnowledge(templateToText(template));
                      setAssistantName(template.assistantName);
                      setTone(template.tone);
                      setAutonomy(template.autonomy);
                    }}
                    className="rounded-full border border-ink-700 px-3 py-1.5 text-xs text-mist-300 transition hover:border-jade-500/50 hover:text-mist-100"
                  >
                    {template.name}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-mist-400">
                Loads real starter articles — pricing, hours, policies, and what must always reach a person. Edit
                anything before or after you go live.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="label" htmlFor="knowledge">Prices, policies and FAQs</label>
                <button type="button" onClick={() => setKnowledge(STARTER_KNOWLEDGE)} className="text-xs text-jade-400 hover:underline">
                  Blank outline
                </button>
              </div>
              <textarea
                id="knowledge"
                className="field min-h-[16rem] font-mono text-xs leading-relaxed"
                value={knowledge}
                onChange={(e) => setKnowledge(e.target.value)}
                placeholder={"Services and pricing:\nDiagnostic visit is $89...\n\nBooking policy:\nTwo-hour arrival windows..."}
              />
              <p className="mt-2 text-xs text-mist-400">
                Separate topics with a blank line. Anything not in here, the assistant refuses to guess at — it asks a
                teammate instead.
              </p>
            </div>
          </div>
        ) : null}

        {error ? <p className="mt-4 text-sm text-rose-alert">{error}</p> : null}

        <div className="mt-6 flex items-center justify-between border-t border-ink-800 pt-5">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="btn btn-ghost disabled:opacity-30"
          >
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance}
              className="btn btn-primary disabled:opacity-40"
            >
              Continue
              <ArrowIcon width={16} height={16} />
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={saving} className="btn btn-primary disabled:opacity-40">
              {saving ? "Setting up…" : "Go live"}
              <ArrowIcon width={16} height={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
