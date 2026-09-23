import "server-only";
import { stripeApiBase } from "./billing";
import { twilioApiBase } from "./delivery";

/**
 * Checks a provider's credentials before they are saved.
 *
 * Saving whatever was pasted and showing "connected" is how a typo'd auth
 * token turns into a month of texts that silently never sent. Each check
 * makes the cheapest read the provider offers, so a key that doesn't work is
 * refused at the moment someone can still fix it — with the provider's own
 * reason, in a sentence.
 *
 * Twilio goes further: it finds the number on the account, stores it in the
 * exact form inbound webhooks are matched against, and points the number's
 * webhooks at this app, so nobody has to find the right screen in Twilio's
 * console. It never overwrites a webhook already pointing somewhere else —
 * that is someone's working phone line.
 */

export interface CheckResult {
  ok: boolean;
  message: string;
  /** Warnings and what was set up on the owner's behalf. */
  notes: string[];
  /** Corrected values to store in place of what was typed. */
  normalized?: Record<string, string>;
}

const TIMEOUT_MS = 10_000;

function fail(message: string, notes: string[] = []): CheckResult {
  return { ok: false, message, notes };
}

async function request(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "follow" });
}

function unreachable(provider: string, error: unknown): CheckResult {
  const reason = error instanceof Error && error.name === "TimeoutError" ? "timed out" : "could not be reached";
  return fail(`${provider} ${reason}, so the connection couldn't be checked. Try again in a minute.`);
}

/** Public origin this deployment is reachable at, or null when it's only local. */
function reachableOrigin(origin: string | null): string | null {
  if (!origin) return null;
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== "https:") return null;
    if (hostname === "localhost" || hostname.endsWith(".local") || /^(127\.|10\.|192\.168\.|0\.0\.0\.0)/.test(hostname)) {
      return null;
    }
    return origin.replace(/\/$/, "");
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ Twilio */

interface TwilioNumber {
  sid: string;
  phone_number: string;
  sms_url: string | null;
  voice_url: string | null;
  capabilities?: { sms?: boolean; voice?: boolean };
}

/** Where a freshly bought Twilio number points before anyone changes it. */
function isUnsetOrDemo(url: string | null): boolean {
  return !url || /^https?:\/\/demo\.twilio\.com\//i.test(url);
}

async function checkTwilio(values: Record<string, string>, origin: string | null): Promise<CheckResult> {
  const sid = values.account_sid?.trim() ?? "";
  const token = values.auth_token?.trim() ?? "";
  const typed = values.from_number?.trim() ?? "";

  if (/^SK/i.test(sid)) {
    return fail("That's an API key SID (starts with SK). Use your Account SID instead — it starts with AC, on the Twilio console's home page.");
  }
  if (!/^AC[0-9a-f]{32}$/i.test(sid)) {
    return fail("An Account SID is AC followed by 32 letters and numbers. Copy it from the Twilio console's home page.");
  }

  const auth = `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`;
  const base = `${twilioApiBase()}/2010-04-01/Accounts/${sid}`;

  let numbers: TwilioNumber[];
  try {
    const account = await request(`${base}.json`, { headers: { Authorization: auth } });
    if (account.status === 401 || account.status === 404) {
      return fail("Twilio rejected that Account SID and auth token. Check both on the Twilio console's home page — the auth token is hidden until you click to reveal it.");
    }
    if (!account.ok) return fail(`Twilio returned an error (${account.status}). Try again in a minute.`);
    const status = ((await account.json()) as { status?: string }).status;
    if (status && status !== "active") {
      return fail(`This Twilio account is ${status}, so it can't send texts or take calls. Reactivate it in the Twilio console.`);
    }

    const list = await request(`${base}/IncomingPhoneNumbers.json?PageSize=200`, { headers: { Authorization: auth } });
    if (!list.ok) return fail(`Twilio wouldn't list this account's numbers (${list.status}).`);
    numbers = ((await list.json()) as { incoming_phone_numbers?: TwilioNumber[] }).incoming_phone_numbers ?? [];
  } catch (error) {
    return unreachable("Twilio", error);
  }

  if (numbers.length === 0) {
    return fail("This Twilio account doesn't have a phone number yet. Buy one in the Twilio console (Phone Numbers → Buy a number), then connect again.");
  }

  // Match on digits so "(555) 014-2200" finds "+15550142200" without guessing
  // a country code — the account's own list already knows it.
  const digits = typed.replace(/\D/g, "");
  const match =
    numbers.find((n) => n.phone_number.replace(/\D/g, "") === digits) ??
    (digits.length >= 7 ? numbers.find((n) => n.phone_number.replace(/\D/g, "").endsWith(digits)) : undefined) ??
    (!digits && numbers.length === 1 ? numbers[0] : undefined);

  if (!match) {
    const owned = numbers.slice(0, 5).map((n) => n.phone_number).join(", ");
    return fail(
      digits
        ? `${typed} isn't on this Twilio account. It has: ${owned}${numbers.length > 5 ? ", …" : ""}.`
        : `This account has more than one number (${owned}${numbers.length > 5 ? ", …" : ""}). Enter the one customers should text and call.`,
    );
  }

  const notes: string[] = [];
  if (match.phone_number !== typed) notes.push(`Saved your number as ${match.phone_number}, the exact form Twilio uses.`);
  if (match.capabilities?.sms === false) notes.push("This number can't send or receive texts — Twilio lists it as voice-only.");
  if (match.capabilities?.voice === false) notes.push("This number can't take calls — Twilio lists it as SMS-only.");

  const publicOrigin = reachableOrigin(origin);
  if (!publicOrigin) {
    notes.push(
      "This copy of Lobby isn't on a public https address, so Twilio couldn't reach it — the number's webhooks weren't changed. Connect again from the deployed site.",
    );
  } else {
    const wanted = { sms: `${publicOrigin}/api/webhooks/twilio`, voice: `${publicOrigin}/api/voice/incoming` };
    const update = new URLSearchParams();

    if (match.sms_url === wanted.sms) {
      notes.push("Texts to this number already come to Lobby.");
    } else if (isUnsetOrDemo(match.sms_url)) {
      update.set("SmsUrl", wanted.sms);
      update.set("SmsMethod", "POST");
    } else {
      notes.push(
        `Texts to this number currently go to ${match.sms_url}. Lobby left that alone — to have your assistant answer texts, set the number's messaging webhook to ${wanted.sms}.`,
      );
    }

    if (match.voice_url === wanted.voice) {
      notes.push("Calls to this number already come to Lobby.");
    } else if (isUnsetOrDemo(match.voice_url)) {
      update.set("VoiceUrl", wanted.voice);
      update.set("VoiceMethod", "POST");
    } else {
      notes.push(
        `Calls to this number currently go to ${match.voice_url}, so Lobby left your phone line alone. Point the number's voice webhook at ${wanted.voice} when you want the assistant to answer calls.`,
      );
    }

    if ([...update.keys()].length > 0) {
      try {
        const response = await request(`${base}/IncomingPhoneNumbers/${match.sid}.json`, {
          method: "POST",
          headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
          body: update,
        });
        if (response.ok) {
          if (update.has("SmsUrl")) notes.push("Texts to this number now come straight to your assistant.");
          if (update.has("VoiceUrl")) {
            notes.push("Calls to this number now come to Lobby. Until you switch on AI answering in Settings, they ring the number your team answers.");
          }
        } else {
          notes.push(`Twilio wouldn't update the number's webhooks (${response.status}). Set them by hand: messaging → ${wanted.sms}, voice → ${wanted.voice}.`);
        }
      } catch {
        notes.push(`Couldn't reach Twilio to set the number's webhooks. Set them by hand: messaging → ${wanted.sms}, voice → ${wanted.voice}.`);
      }
    }
  }

  return {
    ok: true,
    message: `Connected to ${match.phone_number}.`,
    notes,
    normalized: { account_sid: sid, auth_token: token, from_number: match.phone_number },
  };
}

/* ------------------------------------------------------------------ Resend */

function bareAddress(from: string): string {
  const angled = /<([^>]+)>/.exec(from);
  return (angled ? angled[1] : from).trim().toLowerCase();
}

async function checkResend(values: Record<string, string>): Promise<CheckResult> {
  const key = values.api_key?.trim() ?? "";
  const from = values.from_email?.trim() ?? "";
  const address = bareAddress(from);

  if (!key.startsWith("re_")) return fail("A Resend API key starts with re_. Create one at resend.com → API Keys.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
    return fail("The from address needs to be a full email address, like hello@yourbusiness.com.");
  }
  const domain = address.split("@")[1];

  if (domain === "resend.dev") {
    return {
      ok: true,
      message: "Connected with Resend's shared test address.",
      notes: [
        "onboarding@resend.dev only delivers to the email you log into Resend with — fine for trying it out, but customers won't receive anything. Add your own domain in Resend → Domains before going live.",
      ],
    };
  }

  const base = process.env.RESEND_API_BASE?.trim().replace(/\/$/, "") || "https://api.resend.com";
  try {
    const response = await request(`${base}/domains`, { headers: { Authorization: `Bearer ${key}` } });
    if (response.status === 401 || response.status === 403) {
      const body = (await response.json().catch(() => ({}))) as { name?: string };
      if (body.name === "restricted_api_key") {
        return {
          ok: true,
          message: "Connected.",
          notes: [
            `This key can only send, so Lobby couldn't confirm ${domain} is verified in Resend. Send yourself a test email below to be sure.`,
          ],
        };
      }
      return fail("Resend rejected that API key. Check it at resend.com → API Keys — keys are only shown once, so you may need to create a new one.");
    }
    if (!response.ok) return fail(`Resend returned an error (${response.status}). Try again in a minute.`);

    const domains = ((await response.json()) as { data?: { name: string; status: string }[] }).data ?? [];
    const found = domains.find((d) => d.name.toLowerCase() === domain);
    if (!found) {
      return fail(
        `${domain} isn't added to this Resend account, so Resend would refuse to send from it. Add it under Resend → Domains and set up the DNS records it gives you.`,
      );
    }
    if (found.status !== "verified") {
      return fail(
        `${domain} is on your Resend account but isn't verified yet (${found.status}). Finish the DNS records in Resend → Domains — it usually takes a few minutes once they're in — then connect again.`,
      );
    }
    return { ok: true, message: `Connected. Emails will come from ${address}.`, notes: [] };
  } catch (error) {
    return unreachable("Resend", error);
  }
}

/* ------------------------------------------------------------------ Stripe */

async function checkStripe(values: Record<string, string>): Promise<CheckResult> {
  const key = values.secret_key?.trim() ?? "";
  if (key.startsWith("pk_")) {
    return fail("That's a publishable key (pk_…). Lobby needs your secret key — it starts with sk_ and is under Developers → API keys.");
  }
  if (!/^(sk|rk)_(live|test)_/.test(key)) {
    return fail("A Stripe secret key starts with sk_live_ or sk_test_. Find it in Stripe under Developers → API keys.");
  }

  const notes: string[] = [];
  if (key.includes("_test_")) {
    notes.push("This is a test-mode key: payment links will work, but they won't take real money. Swap in your live key when you're ready.");
  }

  try {
    const response = await request(`${stripeApiBase()}/v1/account`, { headers: { Authorization: `Bearer ${key}` } });
    if (response.status === 401) return fail("Stripe rejected that key. Copy it again from Developers → API keys.");
    if (response.status === 403 && key.startsWith("rk_")) {
      notes.push("This is a restricted key, so Lobby couldn't read the account. Make sure it can write Prices and Payment Links.");
      return { ok: true, message: "Connected.", notes };
    }
    if (!response.ok) return fail(`Stripe returned an error (${response.status}). Try again in a minute.`);

    const account = (await response.json()) as {
      charges_enabled?: boolean;
      settings?: { dashboard?: { display_name?: string } };
      business_profile?: { name?: string };
    };
    if (account.charges_enabled === false && !key.includes("_test_")) {
      notes.push("Stripe hasn't switched on charges for this account yet — finish activating it in the Stripe dashboard, or customers won't be able to pay.");
    }
    const name = account.settings?.dashboard?.display_name || account.business_profile?.name;
    return { ok: true, message: name ? `Connected to ${name}.` : "Connected.", notes };
  } catch (error) {
    return unreachable("Stripe", error);
  }
}

/* ------------------------------------------------------------------- Slack */

async function checkSlack(values: Record<string, string>, businessName: string): Promise<CheckResult> {
  const url = values.webhook_url?.trim() ?? "";
  if (!/^https:\/\/hooks\.slack\.com\/services\//.test(url)) {
    return fail("A Slack incoming webhook URL starts with https://hooks.slack.com/services/. Create one at api.slack.com/apps → Incoming Webhooks.");
  }
  try {
    // A Slack webhook can only be checked by posting to it, so the check is a
    // useful message rather than a test ping.
    const response = await request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `Lobby is connected. Callbacks and approvals for ${businessName} will post here.` }),
    });
    if (response.ok) return { ok: true, message: "Connected — check the channel for a confirmation message.", notes: [] };
    const reason = (await response.text()).slice(0, 80);
    if (reason === "no_service" || reason === "invalid_token" || response.status === 404) {
      return fail("Slack says that webhook no longer exists — it may have been removed from the app. Create a new one and paste it here.");
    }
    if (reason === "channel_is_archived") return fail("That webhook posts to an archived channel. Unarchive it, or create a webhook for another channel.");
    return fail(`Slack refused the test message (${response.status}${reason ? `: ${reason}` : ""}).`);
  } catch (error) {
    return unreachable("Slack", error);
  }
}

/* ---------------------------------------------------------- Calendar feed */

async function checkCalendarFeed(values: Record<string, string>): Promise<CheckResult> {
  const raw = values.ics_url?.trim() ?? "";
  const url = raw.replace(/^webcal:\/\//i, "https://");
  if (!/^https?:\/\//i.test(url)) return fail("Paste the full address, starting with https:// or webcal://.");

  try {
    const response = await request(url, { headers: { Accept: "text/calendar, text/plain;q=0.9" } });
    if (response.status === 404 || response.status === 403) {
      return fail(
        "That address didn't return a calendar. For Google, use the \"Secret address in iCal format\" — the public address only works for calendars you've made public.",
      );
    }
    if (!response.ok) return fail(`The calendar address returned an error (${response.status}).`);
    const text = (await response.text()).slice(0, 4_000_000);
    if (!/BEGIN:VCALENDAR/i.test(text)) {
      return fail("That address returned a web page, not a calendar feed. Copy the iCal (.ics) address instead.");
    }
    const events = (text.match(/BEGIN:VEVENT/gi) ?? []).length;
    return {
      ok: true,
      message: `Connected — found ${events} event${events === 1 ? "" : "s"} in the feed.`,
      notes: [],
      normalized: { ics_url: url },
    };
  } catch (error) {
    return unreachable("Your calendar", error);
  }
}

export async function checkCredentials(
  provider: string,
  values: Record<string, string>,
  context: { origin: string | null; businessName: string },
): Promise<CheckResult> {
  switch (provider) {
    case "twilio":
      return checkTwilio(values, context.origin);
    case "resend":
      return checkResend(values);
    case "stripe":
      return checkStripe(values);
    case "slack":
      return checkSlack(values, context.businessName);
    case "calendar-feed":
      return checkCalendarFeed(values);
    default:
      return fail("That integration can't be connected this way.");
  }
}
