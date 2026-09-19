import { ensureSeeded } from "@/lib/seed";
import { createPortalSession } from "@/lib/billing";
import { QUOTAS, clientIp, rateLimitAll, tooManyRequests } from "@/lib/rate-limit";
import { workspace } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sends the owner to Stripe's billing portal, where cancelling, switching plan
 * and updating a card all live. We hold no card details, so there is nothing
 * for us to show them here that Stripe would not show better.
 */
export async function POST(request: Request) {
  ensureSeeded();

  const { business, user, canWrite } = await workspace();
  if (!user || !canWrite) {
    return Response.json({ error: "Sign in to your own workspace to manage billing." }, { status: 403 });
  }

  if (!business.stripe_customer_id) {
    return Response.json(
      { error: "There's no subscription to manage yet — this workspace has never been charged." },
      { status: 400 },
    );
  }

  const limit = rateLimitAll([{ key: `portal:${clientIp(request)}`, quota: QUOTAS.signUpPerIp }]);
  if (!limit.ok) return tooManyRequests(limit, "Too many attempts. Try again shortly.");

  const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || new URL(request.url).origin;
  const result = await createPortalSession({
    customerId: business.stripe_customer_id,
    returnUrl: `${origin}/dashboard/billing`,
  });

  if (result.error) {
    // Same reasoning as checkout: Stripe's message names our account.
    console.error("Billing portal failed:", result.error);
    return Response.json(
      { error: "Could not open the billing portal. We've been told — try again in a few minutes." },
      { status: 502 },
    );
  }
  return Response.json({ url: result.url });
}
