import { prisma } from "@/lib/db";

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

// Deletes stale rows for this key before counting, so a hot key never
// accumulates rows past its own window instead of needing a separate
// cleanup job.
export async function isRateLimited(key: string, { limit, windowMs }: RateLimitOptions): Promise<boolean> {
  const since = new Date(Date.now() - windowMs);
  await prisma.rateLimitEvent.deleteMany({ where: { key, createdAt: { lt: since } } });
  const count = await prisma.rateLimitEvent.count({ where: { key } });
  return count >= limit;
}

export async function recordRateLimitHit(key: string): Promise<void> {
  await prisma.rateLimitEvent.create({ data: { key } });
}
