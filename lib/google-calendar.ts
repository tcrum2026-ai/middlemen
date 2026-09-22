import "server-only";
import type { Appointment } from "./types";
import { credentials, saveCredentials, disconnect } from "./integrations";
import type { BusyInterval } from "./ical";

/**
 * Real, two-way Google Calendar sync via OAuth — the counterpart to the
 * "paste your secret iCal address" flow in lib/ical.ts.
 *
 * That flow was deliberately built to need no OAuth and no app review; this
 * one exists because a business owner asked for the version that actually
 * feels like connecting an account: one click, real read access to their
 * busy times, and every booking Lobby makes appears on their calendar
 * without them subscribing to anything separately.
 *
 * Tokens live in `integration_credentials` under the "google-calendar"
 * provider, the same table every other integration uses — see lib/integrations.ts.
 */

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const API_BASE = "https://www.googleapis.com/calendar/v3";
const SCOPE = "https://www.googleapis.com/auth/calendar openid email";

export function googleCalendarConfigured(): boolean {
  return Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() && process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim());
}

function redirectUri(origin: string): string {
  return `${origin}/api/integrations/google-calendar/callback`;
}

/** Where to send the owner to grant access. `state` is a CSRF nonce, checked back against a cookie. */
export function authorizeUrl(origin: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!.trim(),
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    // Without this, Google only hands back a refresh_token the very first time
    // an account ever approves this app — reconnecting after a disconnect
    // would silently leave the workspace without one.
    prompt: "consent",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

/** Trades the one-time authorization code for tokens right after Google redirects back. */
export async function exchangeCode(
  code: string,
  origin: string,
): Promise<{ accessToken: string; refreshToken: string; expiresAt: number; email: string } | { error: string }> {
  try {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!.trim(),
        client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!.trim(),
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri(origin),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await response.json().catch(() => ({}))) as TokenResponse & { error_description?: string };
    if (!response.ok || !body.access_token) {
      return { error: body.error_description ?? `Google returned ${response.status}` };
    }
    // A first-time consent always includes it; a re-consent does too, because
    // authorizeUrl forces prompt=consent — but the type says optional, so guard anyway.
    if (!body.refresh_token) {
      return { error: "Google did not return a refresh token. Try disconnecting and connecting again." };
    }

    const email = await fetchEmail(body.access_token);
    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      expiresAt: Date.now() + body.expires_in * 1000,
      email: email ?? "your Google account",
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not reach Google." };
  }
}

async function fetchEmail(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { email?: string };
    return data.email ?? null;
  } catch {
    return null;
  }
}

/**
 * A usable access token for this workspace, refreshing it first if it has
 * expired. Returns null when the workspace isn't connected, or when Google
 * has revoked access out from under us — in which case the stale connection
 * is cleared so the Integrations page stops claiming to be connected.
 */
export async function validAccessToken(businessId: string): Promise<string | null> {
  const creds = credentials(businessId, "google-calendar");
  if (!creds) return null;

  const expiresAt = Number(creds.expires_at);
  if (Number.isFinite(expiresAt) && Date.now() < expiresAt - 60_000) return creds.access_token;

  try {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!.trim(),
        client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!.trim(),
        refresh_token: creds.refresh_token,
        grant_type: "refresh_token",
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`refresh returned ${response.status}`);
    const body = (await response.json()) as TokenResponse;

    saveCredentials(businessId, "google-calendar", {
      access_token: body.access_token,
      // Google does not resend the refresh token on a refresh call.
      refresh_token: creds.refresh_token,
      expires_at: String(Date.now() + body.expires_in * 1000),
      account_email: creds.account_email,
    });
    return body.access_token;
  } catch (error) {
    console.error(`Google Calendar token refresh failed for ${businessId}:`, error);
    // A refresh_token stops working when the owner revokes access from their
    // Google account, not just on error — either way, this workspace is no
    // longer actually connected, so say so rather than keep retrying forever.
    // (The busy-times cache still has up to five minutes left on it, same
    // trade-off the ics-feed cache already makes — see calendar-feed.ts.)
    disconnect(businessId, "google-calendar");
    return null;
  }
}

/** Busy times from the connected calendar's primary calendar, clipped to [from, to]. */
export async function googleBusy(businessId: string, from: number, to: number): Promise<BusyInterval[]> {
  const token = await validAccessToken(businessId);
  if (!token) return [];

  try {
    const response = await fetch(`${API_BASE}/freeBusy`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        timeMin: new Date(from).toISOString(),
        timeMax: new Date(to).toISOString(),
        items: [{ id: "primary" }],
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`freeBusy returned ${response.status}`);
    const data = (await response.json()) as { calendars?: Record<string, { busy?: { start: string; end: string }[] }> };
    const busy = data.calendars?.primary?.busy ?? [];
    return busy.map((b) => ({ start: new Date(b.start).getTime(), end: new Date(b.end).getTime(), summary: "Busy" }));
  } catch (error) {
    console.error(`Google Calendar freeBusy failed for ${businessId}:`, error);
    return [];
  }
}

function eventBody(appointment: Pick<Appointment, "title" | "starts_at" | "duration_min" | "location" | "notes">) {
  const start = new Date(appointment.starts_at);
  const end = new Date(start.getTime() + appointment.duration_min * 60_000);
  return {
    summary: appointment.title,
    location: appointment.location,
    description: appointment.notes ?? undefined,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
  };
}

/** Pushes a new booking onto the connected calendar. Returns the event id to store, or null if it didn't go through. */
export async function pushAppointment(businessId: string, appointment: Appointment): Promise<string | null> {
  const token = await validAccessToken(businessId);
  if (!token) return null;

  try {
    const response = await fetch(`${API_BASE}/calendars/primary/events`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(eventBody(appointment)),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`event create returned ${response.status}`);
    const data = (await response.json()) as { id?: string };
    return data.id ?? null;
  } catch (error) {
    console.error(`Google Calendar event create failed for ${businessId}:`, error);
    return null;
  }
}

/** Moves or renames the event a booking already pushed. A no-op if it was never pushed. */
export async function updatePushedAppointment(businessId: string, appointment: Appointment): Promise<void> {
  if (!appointment.google_event_id) return;
  const token = await validAccessToken(businessId);
  if (!token) return;

  try {
    const response = await fetch(`${API_BASE}/calendars/primary/events/${appointment.google_event_id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(eventBody(appointment)),
      signal: AbortSignal.timeout(8_000),
    });
    // A 404 means the owner deleted it on Google's side directly — nothing to fix here.
    if (!response.ok && response.status !== 404) throw new Error(`event update returned ${response.status}`);
  } catch (error) {
    console.error(`Google Calendar event update failed for ${businessId}:`, error);
  }
}

/** Removes the event a cancelled booking had pushed. A no-op if it was never pushed. */
export async function deletePushedAppointment(businessId: string, appointment: Appointment): Promise<void> {
  if (!appointment.google_event_id) return;
  const token = await validAccessToken(businessId);
  if (!token) return;

  try {
    const response = await fetch(`${API_BASE}/calendars/primary/events/${appointment.google_event_id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok && response.status !== 404 && response.status !== 410) {
      throw new Error(`event delete returned ${response.status}`);
    }
  } catch (error) {
    console.error(`Google Calendar event delete failed for ${businessId}:`, error);
  }
}

/**
 * Disconnects and tells Google to forget this app's access, so "Disconnect"
 * actually revokes the grant instead of just deleting our copy of the token.
 */
export async function disconnectGoogleCalendar(businessId: string): Promise<void> {
  const creds = credentials(businessId, "google-calendar");
  if (creds?.refresh_token) {
    try {
      await fetch(REVOKE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: creds.refresh_token }),
        signal: AbortSignal.timeout(8_000),
      });
    } catch (error) {
      // Their credential is deleted either way; a revoke failure just means
      // Google's own records take longer to catch up, which is their problem
      // to have solved, not a reason to leave this workspace looking connected.
      console.error(`Google Calendar revoke failed for ${businessId}:`, error);
    }
  }
  disconnect(businessId, "google-calendar");
  // Busting the busy-times cache is the caller's job (calendar-feed.ts already
  // imports this module, so this module cannot import it back).
}
