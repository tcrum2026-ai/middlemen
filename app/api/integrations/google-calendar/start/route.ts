import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireWritableBusiness } from "@/lib/session";
import { authorizeUrl, googleCalendarConfigured } from "@/lib/google-calendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_COOKIE = "mm_google_oauth_state";

/** Sends the signed-in workspace owner to Google's consent screen. */
export async function GET(request: Request) {
  const business = await requireWritableBusiness();
  if (!business) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }
  if (!googleCalendarConfigured()) {
    return NextResponse.redirect(
      new URL("/dashboard/integrations?google_calendar_error=not_configured", request.url),
    );
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || new URL(request.url).origin;
  const state = randomBytes(24).toString("base64url");

  const response = NextResponse.redirect(authorizeUrl(origin, state));
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    path: "/",
    maxAge: 10 * 60,
  });
  return response;
}
