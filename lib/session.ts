import "server-only";
import { cookies } from "next/headers";
import { ensureSeeded } from "./seed";
import { getBusiness, listBusinesses } from "./repo";
import type { Business } from "./types";

export const BUSINESS_COOKIE = "mm_business";

/** The workspace the dashboard is currently showing. */
export async function activeBusiness(): Promise<Business> {
  ensureSeeded();
  const store = await cookies();
  const selected = store.get(BUSINESS_COOKIE)?.value;
  const business = selected ? getBusiness(selected) : null;
  return business ?? listBusinesses()[0];
}
