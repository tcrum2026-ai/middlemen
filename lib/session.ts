import "server-only";
import { cookies } from "next/headers";
import { ensureSeeded } from "./seed";
import { currentUser, type User } from "./auth";
import { demoBusiness, getBusiness, listBusinesses } from "./repo";
import type { Business } from "./types";

export const BUSINESS_COOKIE = "mm_business";

export interface Workspace {
  business: Business;
  user: User | null;
  /** False when browsing the public demo without an account. */
  canWrite: boolean;
  /** Workspaces the viewer may switch between. */
  options: Business[];
}

/**
 * Resolves who is looking and which workspace they get. Signed-in users only
 * ever see workspaces they own; everyone else gets the demo, read-only, so the
 * marketing site can keep linking straight into a real dashboard.
 */
export async function workspace(): Promise<Workspace> {
  ensureSeeded();
  const user = await currentUser();
  const store = await cookies();
  const selected = store.get(BUSINESS_COOKIE)?.value;

  if (!user) {
    const demo = demoBusiness() ?? listBusinesses()[0];
    return { business: demo, user: null, canWrite: false, options: demo ? [demo] : [] };
  }

  const options = listBusinesses(user.id);
  const chosen = selected ? options.find((b) => b.id === selected) : undefined;
  const business = chosen ?? options[0] ?? demoBusiness() ?? listBusinesses()[0];

  return {
    business,
    user,
    // Owning nothing yet means they're looking at the demo, which stays read-only.
    canWrite: business?.owner_id === user.id,
    options,
  };
}

/** Convenience for the many pages that only need the workspace's business. */
export async function activeBusiness(): Promise<Business> {
  return (await workspace()).business;
}

export async function requireWritableBusiness(): Promise<Business | null> {
  const { business, canWrite } = await workspace();
  return canWrite ? business : null;
}

export function businessOwnedBy(businessId: string, userId: string): boolean {
  const business = getBusiness(businessId);
  return Boolean(business && business.owner_id === userId);
}
