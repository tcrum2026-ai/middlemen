import { z } from "zod";
import { ensureSeeded } from "@/lib/seed";
import { createCheckoutSession } from "@/lib/billing";
import { QUOTAS, clientIp, rateLimitAll, tooManyRequests } from "@/lib/rate-limit";
import { workspace } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ plan: z.enum(["starter", "pro", "business"]) });

/** Starts a Stripe Checkout session for the signed-in owner's workspace. */
export async function POST(request: Request) {
  ensureSeeded();

  const { business, user, canWrite } = await workspace();
  if (!user || !canWrite) {
    return Response.json({ error: "Sign in to your own workspace to subscribe." }, { status: 403 });
  }

  const limit = rateLimitAll([{ key: `checkout:${clientIp(request)}`, quota: QUOTAS.signUpPerIp }]);
  if (!limit.ok) return tooManyRequests(limit, "Too many checkout attempts. Try again shortly.");

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Pick a plan." }, { status: 400 });

  const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || new URL(request.url).origin;
  const result = await createCheckoutSession({
    plan: parsed.data.plan,
    businessId: business.id,
    customerEmail: user.email,
    successUrl: `${origin}/dashboard/billing?subscribed=1`,
    cancelUrl: `${origin}/dashboard/billing`,
  });

  if (result.error) {
    // Stripe's message names our key, our price ids and our account. All of
    // that is an operator problem; none of it belongs in a customer's browser.
    // It goes to the log, and the customer gets a sentence they can act on.
    console.error("Checkout failed:", result.error);
    return Response.json(
      { error: "Payment could not be started. We've been told — try again in a few minutes." },
      { status: 502 },
    );
  }
  return Response.json({ url: result.url });
}
