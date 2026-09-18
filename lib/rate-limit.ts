import "server-only";

/**
 * Fixed-window request counting for the endpoints a stranger can reach.
 *
 * The chat endpoints spend money on every message, so leaving them open is a
 * billing hole as much as an availability one. This is deliberately in-process:
 * the app already keeps its state in a local SQLite file, so a single instance
 * is the supported shape. Behind more than one instance each replica counts its
 * own share — put a limiter at the edge (Cloudflare, nginx, your platform's own)
 * if you run several, and treat this as the floor rather than the ceiling.
 */

interface Window {
  count: number;
  resetAt: number;
}

declare global {
  var __lobbyRateWindows: Map<string, Window> | undefined;
}

const windows = (globalThis.__lobbyRateWindows ??= new Map<string, Window>());

/** Keeps the map from growing without bound on a long-running process. */
function prune(now: number): void {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export interface Quota {
  /** Requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  /** Whole seconds until the window resets — what goes in Retry-After. */
  retryAfter: number;
}

export function rateLimit(key: string, { limit, windowMs }: Quota): RateLimitResult {
  const now = Date.now();
  if (windows.size > 5_000) prune(now);

  const existing = windows.get(key);
  const window = existing && existing.resetAt > now ? existing : { count: 0, resetAt: now + windowMs };
  window.count += 1;
  windows.set(key, window);

  const retryAfter = Math.max(1, Math.ceil((window.resetAt - now) / 1000));
  return {
    ok: window.count <= limit,
    limit,
    remaining: Math.max(0, limit - window.count),
    retryAfter,
  };
}

/**
 * Checks several quotas at once and reports the first that is exhausted — a
 * per-visitor burst limit and a per-workspace hourly ceiling, say.
 */
export function rateLimitAll(checks: { key: string; quota: Quota }[]): RateLimitResult {
  let worst: RateLimitResult | null = null;
  for (const { key, quota } of checks) {
    const result = rateLimit(key, quota);
    if (!result.ok) return result;
    if (!worst || result.remaining < worst.remaining) worst = result;
  }
  return worst ?? { ok: true, limit: 0, remaining: 0, retryAfter: 0 };
}

/**
 * Best-effort client address. Proxy headers are forgeable, so this bounds
 * accidental hammering and casual abuse rather than a determined attacker —
 * which is why the workspace-level ceilings above exist alongside it.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(result.retryAfter),
  };
}

/** The 429 to return when a quota is exhausted. */
export function tooManyRequests(result: RateLimitResult, message: string, extraHeaders: HeadersInit = {}): Response {
  return Response.json(
    { error: message, retryAfter: result.retryAfter },
    {
      status: 429,
      headers: {
        ...Object.fromEntries(new Headers(extraHeaders)),
        ...rateLimitHeaders(result),
        "Retry-After": String(result.retryAfter),
      },
    },
  );
}

/** Quotas in one place so they can be reasoned about together. */
export const QUOTAS = {
  /** One visitor typing into a widget. Generous for a person, useless for a script. */
  chatPerIp: { limit: 15, windowMs: 60_000 },
  /** A whole workspace's public chat volume, so one embed can't run up the bill. */
  chatPerWorkspace: { limit: 240, windowMs: 60 * 60_000 },
  /** Signing in: slow enough that password guessing is pointless. */
  signInPerIp: { limit: 10, windowMs: 15 * 60_000 },
  /** Account and workspace creation. */
  signUpPerIp: { limit: 5, windowMs: 60 * 60_000 },
  /** Authenticated but still model-backed, so still bounded. */
  playgroundPerWorkspace: { limit: 40, windowMs: 60_000 },
  /** Whole-workspace exports are expensive to build. */
  exportPerWorkspace: { limit: 10, windowMs: 60 * 60_000 },
  /** Inbound mail and SMS, per sending address. */
  inboundPerSender: { limit: 20, windowMs: 60 * 60_000 },
} as const;
