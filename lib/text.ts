/**
 * Small pure string helpers, kept apart from the modules that use them so the
 * test suite can reach them. No imports, no state, no I/O.
 */

/**
 * Trims a reply that was cut off mid-thought back to its last complete
 * sentence. Returns null when nothing whole survives.
 */
export function lastWholeSentence(text: string): string | null {
  const cut = Math.max(text.lastIndexOf("."), text.lastIndexOf("!"), text.lastIndexOf("?"));
  if (cut < 0) return null;
  const trimmed = text.slice(0, cut + 1).trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** XML-escapes a value for interpolation into a TwiML attribute or node. */
export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Renders E.164 as people actually read it. Falls back to the raw string for
 * anything that isn't a plain NANP number, because a wrong guess at grouping
 * is worse than no grouping.
 */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return raw.trim();
}
