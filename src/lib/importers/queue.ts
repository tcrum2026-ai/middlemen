import { prisma } from "../db";
import { importBusinessesForArea, isGooglePlacesConfigured } from "./googlePlaces";

// Netlify scheduled functions cap out at 30s of wall-clock time, and each
// area+category search can involve several Places API calls (search pages +
// per-result details lookups), so we only take a few queue items per run.
// Running every 15 minutes, this crawls a modest but steady stream of new
// areas without risking a timeout or blowing through API quota.
const BATCH_SIZE = 3;

export type BatchSummary = {
  processed: number;
  imported: number;
  updated: number;
  failed: number;
};

export async function enqueueImportTargets(
  targets: { zipCode: string; category: string }[]
): Promise<{ queued: number; skipped: number }> {
  const result = await prisma.importQueueItem.createMany({
    data: targets.map((t) => ({ zipCode: t.zipCode.trim(), category: t.category })),
    skipDuplicates: true,
  });
  return { queued: result.count, skipped: targets.length - result.count };
}

export async function processNextBatch(): Promise<BatchSummary> {
  const summary: BatchSummary = { processed: 0, imported: 0, updated: 0, failed: 0 };

  if (!isGooglePlacesConfigured()) {
    return summary;
  }

  const items = await prisma.importQueueItem.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: BATCH_SIZE,
  });

  for (const item of items) {
    summary.processed++;
    try {
      const outcome = await importBusinessesForArea(item.zipCode, item.category);
      summary.imported += outcome.imported;
      summary.updated += outcome.updated;
      await prisma.importQueueItem.update({
        where: { id: item.id },
        data: { status: "DONE", resultCount: outcome.imported + outcome.updated, processedAt: new Date() },
      });
    } catch (err) {
      summary.failed++;
      await prisma.importQueueItem.update({
        where: { id: item.id },
        data: {
          status: "FAILED",
          errorMessage: err instanceof Error ? err.message.slice(0, 500) : "Unknown error",
          processedAt: new Date(),
        },
      });
    }
  }

  return summary;
}
