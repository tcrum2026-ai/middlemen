import { NextResponse } from "next/server";
import { requireWritableBusiness } from "@/lib/session";
import { exchangeCode } from "@/lib/google-calendar";
import { saveCredentials } from "@/lib/integrations";
import { forgetFeed } from "@/lib/calendar-feed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_COOKIE = "mm_google_oauth_state";

function fail(request: Request, reason: string) {
  const url = new URL("/dashboard/integrations", request.url);
  url.searchParams.set("google_calendar_error", reason);
  const response = NextResponse.redirect(url);
  response.cookies.delete(STATE_COOKIE);
  return response;
}

/** Where Google sends the owner back after they approve (or deny) access. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const deniedReason = url.searchParams.get("error");

  if (deniedReason) return fail(request, "denied");

  const cookieState = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${STATE_COOKIE}=`))
    ?.slice(STATE_COOKIE.length + 1);

  // A missing or mismatched state means this request did not originate from
  // the /start redirect we just sent — refuse it rather than trust a code
  // that could have been handed to us by anyone.
  if (!state || !cookieState || state !== cookieState) return fail(request, "state_mismatch");
  if (!code) return fail(request, "no_code");

  const business = await requireWritableBusiness();
  if (!business) return NextResponse.redirect(new URL("/signin", request.url));

  const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || url.origin;
  const result = await exchangeCode(code, origin);
  if ("error" in result) {
    console.error(`Google Calendar OAuth exchange failed for ${business.id}:`, result.error);
    return fail(request, "exchange_failed");
  }

  saveCredentials(business.id, "google-calendar", {
    access_token: result.accessToken,
    refresh_token: result.refreshToken,
    expires_at: String(result.expiresAt),
    account_email: result.email,
  });
  forgetFeed(business.id);

  const success = NextResponse.redirect(new URL("/dashboard/integrations?connected=google-calendar", request.url));
  success.cookies.delete(STATE_COOKIE);
  return success;
}
