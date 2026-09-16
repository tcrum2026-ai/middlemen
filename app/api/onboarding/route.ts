import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureSeeded } from "@/lib/seed";
import { addKbArticle, createBusiness, setIntegrationStatus } from "@/lib/repo";
import { BUSINESS_COOKIE } from "@/lib/session";

export const runtime = "nodejs";

const Body = z.object({
  name: z.string().min(2).max(120),
  industry: z.string().min(2).max(120),
  website: z.string().max(200).optional(),
  email: z.string().max(200).optional(),
  phone: z.string().max(60).optional(),
  timezone: z.string().max(60).optional(),
  hours: z.record(z.string(), z.string()).optional(),
  services: z.array(z.string()).max(24).optional(),
  assistant_name: z.string().min(1).max(40).optional(),
  tone: z.string().max(60).optional(),
  greeting: z.string().max(400).optional(),
  autonomy: z.enum(["cautious", "balanced", "autonomous"]).optional(),
  call_handoff_number: z.string().max(60).optional(),
  knowledge: z.string().max(20_000).optional(),
  integrations: z.array(z.string()).max(20).optional(),
});

/**
 * Splits pasted notes into knowledge base articles. A line ending in ":" or a
 * markdown heading starts a new article; everything else joins the current one.
 */
function toArticles(raw: string): { title: string; body: string }[] {
  const blocks = raw
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return blocks.map((block) => {
    const [first, ...rest] = block.split("\n");
    const isHeading = /^#{1,3}\s+/.test(first) || (first.endsWith(":") && first.length < 80);
    if (isHeading && rest.length > 0) {
      return { title: first.replace(/^#{1,3}\s+/, "").replace(/:$/, ""), body: rest.join("\n").trim() };
    }
    return { title: first.slice(0, 60), body: block };
  });
}

export async function POST(request: Request) {
  ensureSeeded();

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const input = parsed.data;

  const business = createBusiness({
    name: input.name,
    industry: input.industry,
    website: input.website || undefined,
    email: input.email || undefined,
    phone: input.phone || undefined,
    timezone: input.timezone || undefined,
    hours: input.hours,
    services: input.services?.filter(Boolean),
    assistant_name: input.assistant_name || undefined,
    tone: input.tone || undefined,
    greeting: input.greeting || undefined,
    autonomy: input.autonomy,
    call_handoff_number: input.call_handoff_number || undefined,
  });

  if (input.knowledge?.trim()) {
    for (const article of toArticles(input.knowledge)) {
      addKbArticle(business.id, article.title, article.body, "onboarding-paste");
    }
  }

  const chosen = new Set(input.integrations ?? []);
  for (const provider of [
    "gmail",
    "outlook",
    "google-calendar",
    "twilio-sms",
    "whatsapp",
    "stripe",
    "quickbooks",
    "hubspot",
    "slack",
    "shopify",
    "zapier",
    "webhooks",
  ]) {
    setIntegrationStatus(business.id, provider, chosen.has(provider) ? "connected" : "disconnected");
  }

  const response = NextResponse.json({
    businessId: business.id,
    widgetKey: business.widget_key,
    slug: business.slug,
  });
  response.cookies.set(BUSINESS_COOKIE, business.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
