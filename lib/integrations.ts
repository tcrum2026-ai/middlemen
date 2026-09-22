import "server-only";
import { getDb, now } from "./db";

export interface ProviderField {
  name: string;
  label: string;
  /** Secrets are never sent back to the browser once saved. */
  secret?: boolean;
  placeholder?: string;
}

export interface Provider {
  id: string;
  label: string;
  group: string;
  blurb: string;
  /** What actually starts working once it's connected. */
  enables: string[];
  fields: ProviderField[];
  /** Shown after saving, when there's something to paste elsewhere. */
  callbackPath?: string;
  docs?: string;
  /**
   * Connected by redirecting to the provider and back, not by pasting a key.
   * The Integrations page renders its own button for these instead of the
   * generic field form — `fields` still describes what's stored, so
   * `isConnected`/`disconnect`/`credentials` work unchanged.
   */
  oauth?: boolean;
}

export const PROVIDERS: Provider[] = [
  {
    id: "resend",
    label: "Email (Resend)",
    group: "Messaging",
    blurb: "Sends confirmations, follow-ups and quotes from your own domain.",
    enables: ["Appointment confirmations", "Follow-up emails", "Quote delivery"],
    fields: [
      { name: "api_key", label: "API key", secret: true, placeholder: "re_..." },
      { name: "from_email", label: "From address", placeholder: "hello@yourbusiness.com" },
    ],
    docs: "resend.com/api-keys",
  },
  {
    id: "twilio",
    label: "SMS (Twilio)",
    group: "Messaging",
    blurb: "Two-way texting: your assistant answers inbound SMS and sends reminders.",
    enables: ["Inbound SMS answered automatically", "Appointment reminders", "Follow-up texts"],
    fields: [
      { name: "account_sid", label: "Account SID", placeholder: "AC..." },
      { name: "auth_token", label: "Auth token", secret: true },
      { name: "from_number", label: "Your Twilio number", placeholder: "+15550142200" },
    ],
    callbackPath: "/api/webhooks/twilio",
    docs: "console.twilio.com",
  },
  {
    id: "slack",
    label: "Slack",
    group: "Messaging",
    blurb: "Posts queued callbacks and approvals into a channel so nothing waits unseen.",
    enables: ["Callback alerts", "Approval alerts"],
    fields: [
      { name: "webhook_url", label: "Incoming webhook URL", secret: true, placeholder: "https://hooks.slack.com/services/..." },
    ],
    docs: "api.slack.com/messaging/webhooks",
  },
  {
    id: "google-calendar",
    label: "Google Calendar",
    group: "Scheduling",
    blurb:
      "Reads your real availability and writes every booking straight onto your calendar — no secret URL to paste, " +
      "and no separate feed to subscribe to.",
    enables: [
      "No double-booking over your own commitments",
      "Every booking appears on your calendar automatically",
      "Moved or cancelled bookings update there too",
    ],
    fields: [
      { name: "access_token", label: "Access token", secret: true },
      { name: "refresh_token", label: "Refresh token", secret: true },
      { name: "expires_at", label: "Expires at" },
      { name: "account_email", label: "Connected account" },
    ],
    oauth: true,
  },
  {
    id: "calendar-feed",
    label: "Your calendar (read, by URL)",
    group: "Scheduling",
    blurb:
      "For a calendar that isn't Google, or if you'd rather not use OAuth: reads the calendar you already keep, so " +
      "the assistant never offers a time you are not free. One-way — bookings still need the feed above or the " +
      "Calendar subscription to show up there.",
    enables: ["No double-booking over your own commitments"],
    fields: [
      {
        name: "ics_url",
        label: "Secret iCal address",
        secret: true,
        placeholder: "https://calendar.google.com/calendar/ical/.../basic.ics",
      },
    ],
    docs: "Google Calendar → Settings → your calendar → Secret address in iCal format",
  },
  {
    id: "stripe",
    label: "Stripe",
    group: "Money",
    blurb: "Turns an accepted quote into a payment link you can send.",
    enables: ["Payment links on quotes"],
    fields: [{ name: "secret_key", label: "Secret key", secret: true, placeholder: "sk_live_..." }],
    docs: "dashboard.stripe.com/apikeys",
  },
];

export function getProvider(id: string): Provider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

/** Raw values — server use only, never returned to a client component. */
export function credentials(businessId: string, provider: string): Record<string, string> | null {
  const rows = getDb()
    .prepare("SELECT field, value FROM integration_credentials WHERE business_id = ? AND provider = ?")
    .all(businessId, provider) as { field: string; value: string }[];
  if (rows.length === 0) return null;

  const values = Object.fromEntries(rows.map((r) => [r.field, r.value]));
  const definition = getProvider(provider);
  if (!definition) return values;

  // Partly-filled credentials would fail at call time; treat them as absent.
  const complete = definition.fields.every((field) => values[field.name]?.trim());
  return complete ? values : null;
}

export function isConnected(businessId: string, provider: string): boolean {
  return credentials(businessId, provider) !== null;
}

/** Safe for rendering: secrets become a fixed marker, never the value. */
export function maskedCredentials(businessId: string, provider: string): Record<string, string> {
  const rows = getDb()
    .prepare("SELECT field, value FROM integration_credentials WHERE business_id = ? AND provider = ?")
    .all(businessId, provider) as { field: string; value: string }[];
  const definition = getProvider(provider);
  const out: Record<string, string> = {};
  for (const row of rows) {
    const field = definition?.fields.find((f) => f.name === row.field);
    out[row.field] = field?.secret ? (row.value ? "••••••••" : "") : row.value;
  }
  return out;
}

export function saveCredentials(
  businessId: string,
  provider: string,
  values: Record<string, string>,
): void {
  const definition = getProvider(provider);
  if (!definition) return;

  const db = getDb();
  const upsert = db.prepare(
    `INSERT INTO integration_credentials (business_id, provider, field, value, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (business_id, provider, field) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  );

  db.transaction(() => {
    for (const field of definition.fields) {
      const value = values[field.name];
      if (value === undefined) continue;
      // An untouched secret field posts the mask back; leave the stored value alone.
      if (field.secret && value.startsWith("••")) continue;
      upsert.run(businessId, provider, field.name, value.trim(), now());
    }
  })();
}

export function disconnect(businessId: string, provider: string): void {
  getDb()
    .prepare("DELETE FROM integration_credentials WHERE business_id = ? AND provider = ?")
    .run(businessId, provider);
}
