import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { assistantConfigured } from "@/lib/assistant";
import { currentUser } from "@/lib/auth";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-opus-5";

/**
 * Verifies credentials without spending tokens: retrieving a model exercises
 * auth, network and the base URL, but generates nothing.
 */
export async function GET(request: Request) {
  // A setup diagnostic, not a public endpoint: it makes an outbound API call on
  // every hit and reports which base URL and model this deployment is wired to.
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to check assistant status." }, { status: 401 });
  }
  const limit = rateLimit(`status:${user.id}:${clientIp(request)}`, { limit: 10, windowMs: 60_000 });
  if (!limit.ok) return tooManyRequests(limit, "Checked too often. Try again shortly.");

  if (!assistantConfigured()) {
    return NextResponse.json({
      configured: false,
      ok: false,
      hint: "No ANTHROPIC_API_KEY (or ANTHROPIC_AUTH_TOKEN) is set. The assistant is running its scripted fallback.",
    });
  }

  try {
    const client = new Anthropic();
    const model = await client.models.retrieve(MODEL);
    return NextResponse.json({
      configured: true,
      ok: true,
      model: { id: model.id, display_name: model.display_name },
      baseUrl: process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com",
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({
        configured: true,
        ok: false,
        status: error.status,
        hint: "The key was rejected. Check it was copied whole and hasn't been revoked.",
      });
    }
    if (error instanceof Anthropic.PermissionDeniedError) {
      return NextResponse.json({
        configured: true,
        ok: false,
        status: error.status,
        hint: "The key is valid but not permitted to use this model. Check the workspace it belongs to.",
      });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({
        configured: true,
        ok: false,
        status: error.status,
        hint: "Rate limited right now — the key itself is fine. Try again in a moment.",
      });
    }
    if (error instanceof Anthropic.APIConnectionError) {
      return NextResponse.json({
        configured: true,
        ok: false,
        hint: `Could not reach ${process.env.ANTHROPIC_BASE_URL ?? "api.anthropic.com"}. Check network or proxy settings.`,
      });
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json({
        configured: true,
        ok: false,
        status: error.status,
        hint: error.message.slice(0, 200),
      });
    }
    return NextResponse.json({
      configured: true,
      ok: false,
      hint: error instanceof Error ? error.message.slice(0, 200) : "Unknown error",
    });
  }
}
