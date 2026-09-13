// Best-effort hostname extraction so "https://www.example.com/path" and
// "example.com" both normalize to "example.com" for a domain comparison.
export function extractDomain(value: string): string | null {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return new URL(withProtocol).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}
