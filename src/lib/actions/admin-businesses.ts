"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { businessListingSchema } from "@/lib/validation";
import type { ActionState } from "@/lib/actions/auth";

export async function addBusinessListingAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireRole("ADMIN");

  const parsed = businessListingSchema.safeParse({
    companyName: formData.get("companyName"),
    category: formData.get("category"),
    description: formData.get("description"),
    phone: formData.get("phone") ?? "",
    website: formData.get("website") ?? "",
    addressLine: formData.get("addressLine") ?? "",
    city: formData.get("city") ?? "",
    state: formData.get("state") ?? "",
    zipCode: formData.get("zipCode"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.businessProfile.create({
    data: { ...parsed.data, source: "ADMIN_ADDED", claimed: false },
  });

  revalidatePath("/dashboard/admin/businesses");
  revalidatePath("/businesses");
}

export async function deleteBusinessListingAction(formData: FormData) {
  await requireRole("ADMIN");

  const businessId = formData.get("businessId");
  if (typeof businessId !== "string" || !businessId) return;

  const listing = await prisma.businessProfile.findUnique({ where: { id: businessId } });
  if (!listing || listing.claimed) return;

  await prisma.businessProfile.delete({ where: { id: businessId } });

  revalidatePath("/dashboard/admin/businesses");
  revalidatePath("/businesses");
}

type ImportRow = {
  companyName?: unknown;
  category?: unknown;
  description?: unknown;
  phone?: unknown;
  website?: unknown;
  addressLine?: unknown;
  city?: unknown;
  state?: unknown;
  zipCode?: unknown;
};

export async function importBusinessesAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireRole("ADMIN");

  const raw = String(formData.get("json") ?? "").trim();
  if (!raw) {
    return { error: "Paste a JSON array of businesses first" };
  }

  let rows: unknown;
  try {
    rows = JSON.parse(raw);
  } catch {
    return { error: "That's not valid JSON" };
  }

  if (!Array.isArray(rows)) {
    return { error: "Expected a JSON array of business objects" };
  }

  const parsed = (rows as ImportRow[]).map((row, i) => {
    const result = businessListingSchema.safeParse({
      companyName: row.companyName,
      category: row.category,
      description: row.description,
      phone: row.phone ?? "",
      website: row.website ?? "",
      addressLine: row.addressLine ?? "",
      city: row.city ?? "",
      state: row.state ?? "",
      zipCode: row.zipCode,
    });
    return { i, result };
  });

  const failures = parsed.filter((p) => !p.result.success);
  if (failures.length > 0) {
    const first = failures[0];
    return {
      error: `Row ${first.i + 1}: ${first.result.success ? "" : first.result.error.issues[0]?.message}`,
    };
  }

  const rowsData = parsed.map((p) => {
    if (!p.result.success) throw new Error("unreachable");
    return p.result.data;
  });

  await prisma.businessProfile.createMany({
    data: rowsData.map((data) => ({
      ...data,
      source: "ADMIN_ADDED" as const,
      claimed: false,
    })),
  });

  revalidatePath("/dashboard/admin/businesses");
  revalidatePath("/businesses");
}
