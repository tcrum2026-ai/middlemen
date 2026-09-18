/**
 * Who is actually operating this deployment. The legal pages read from here so
 * they describe a real entity rather than a plausible-looking invented one; when
 * a value is missing the pages say so in place of the fact, which is the honest
 * failure mode and the one an operator will notice before customers do.
 */
export const LEGAL = {
  entity: process.env.NEXT_PUBLIC_LEGAL_ENTITY?.trim() || "",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "",
  jurisdiction: process.env.NEXT_PUBLIC_LEGAL_JURISDICTION?.trim() || "",
  /** Bump when the substance of either page changes. */
  lastUpdated: "18 September 2026",
} as const;

export function legalConfigured(): boolean {
  return Boolean(LEGAL.entity && LEGAL.contactEmail && LEGAL.jurisdiction);
}

/** Placeholder text that reads as unfinished, so it can never pass for a fact. */
export function orBlank(value: string, what: string): string {
  return value || `[set ${what}]`;
}
