"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { enqueueImportTargets, processNextBatch } from "@/lib/importers/queue";
import { isGooglePlacesConfigured } from "@/lib/importers/googlePlaces";
import { CATEGORIES } from "@/lib/validation";
import type { ActionState } from "@/lib/actions/auth";

const zipListSchema = /^\d{5}(-\d{4})?$/;

export async function enqueueImportAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireRole("ADMIN");

  const category = String(formData.get("category") ?? "");
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    return { error: "Pick a valid category" };
  }

  const raw = String(formData.get("zipCodes") ?? "");
  const zipCodes = raw
    .split(/[\s,]+/)
    .map((z) => z.trim())
    .filter(Boolean);

  if (zipCodes.length === 0) {
    return { error: "Paste at least one ZIP code" };
  }

  const invalid = zipCodes.find((z) => !zipListSchema.test(z));
  if (invalid) {
    return { error: `"${invalid}" isn't a valid ZIP code` };
  }

  await enqueueImportTargets(zipCodes.map((zipCode) => ({ zipCode, category })));

  revalidatePath("/dashboard/admin/import");
}

export async function runImportBatchNowAction() {
  await requireRole("ADMIN");

  if (isGooglePlacesConfigured()) {
    await processNextBatch();
  }

  revalidatePath("/dashboard/admin/import");
}
