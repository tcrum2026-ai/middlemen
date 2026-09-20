/**
 * Deciding whether a caller is the person who made a booking.
 *
 * Pure and separate because getting it wrong moves or cancels somebody
 * else's appointment. Erring towards "no match" is safe — the assistant
 * asks for the email it was booked under. Erring the other way rearranges
 * a stranger's week.
 */

export interface MatchableContact {
  name: string;
  email: string | null;
  phone: string | null;
}

export interface Claimed {
  email?: string | null;
  phone?: string | null;
  name?: string | null;
}

/** Last ten digits: enough to match +1 555 123 4567 against (555) 123-4567. */
export function phoneKey(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : "";
}

export function matchesContact(contact: MatchableContact, claimed: Claimed): boolean {
  const email = claimed.email?.trim().toLowerCase();
  if (email && contact.email && contact.email.trim().toLowerCase() === email) return true;

  const phone = claimed.phone ? phoneKey(claimed.phone) : "";
  if (phone && contact.phone && phoneKey(contact.phone) === phone) return true;

  // A name on its own is a weak signal — two Dave Smiths is an ordinary
  // thing — so it matches, but callers are expected to read the result back
  // and let the customer confirm before changing anything.
  const name = claimed.name?.trim().toLowerCase();
  if (name && contact.name.trim().toLowerCase() === name) return true;

  return false;
}
