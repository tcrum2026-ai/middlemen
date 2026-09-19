import type { NextConfig } from "next";

/**
 * Headers that apply to every response.
 *
 * There is deliberately no full Content-Security-Policy here: Next emits inline
 * bootstrap script and style, so a `default-src 'self'` policy would need nonce
 * plumbing through every response to avoid breaking the app. The directives set
 * below are the ones that are both meaningful and safe without nonces.
 */
const BASE_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    // Calls are answered over the phone network, through Twilio — no part of
    // this product ever needs a browser's microphone, camera or location, so
    // nothing here should be able to ask for one.
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "Content-Security-Policy", value: "base-uri 'self'; object-src 'none'; form-action 'self'" },
  // Only takes effect over HTTPS. Remove it if you serve this on a bare domain
  // you also need to reach over HTTP.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  /** better-sqlite3 is a native addon and must not be bundled by the server compiler. */
  serverExternalPackages: ["better-sqlite3"],

  /**
   * URLs people type, and that other sites link to, which this app does not
   * have. The pricing table is a section of the front page rather than its own
   * route; /pricing is still the address a human guesses, and a 404 is a
   * needlessly lost visitor. Permanent, so search engines learn the real one.
   */
  async redirects() {
    const toHome = (from: string, hash: string) => ({
      source: from,
      destination: `/#${hash}`,
      permanent: true,
    });
    return [
      toHome("/pricing", "pricing"),
      toHome("/plans", "pricing"),
      toHome("/price", "pricing"),
      toHome("/faq", "faq"),
      toHome("/faqs", "faq"),
      toHome("/features", "capabilities"),
      toHome("/how-it-works", "how"),
      toHome("/voice", "calls"),
      toHome("/phone", "calls"),
      toHome("/roi", "math"),
      { source: "/login", destination: "/signin", permanent: true },
      { source: "/sign-in", destination: "/signin", permanent: true },
      { source: "/register", destination: "/signup", permanent: true },
      { source: "/sign-up", destination: "/signup", permanent: true },
      { source: "/get-started", destination: "/signup", permanent: true },
      { source: "/demo", destination: "/dashboard", permanent: true },
      // Not permanent: these are pages worth having one day, and a 301 would
      // be cached by browsers long after they exist.
      { source: "/docs", destination: "/tour", permanent: false },
      { source: "/help", destination: "/tour", permanent: false },
      { source: "/support", destination: "/tour", permanent: false },
      { source: "/vs", destination: "/compare", permanent: true },
      { source: "/comparison", destination: "/compare", permanent: true },
    ];
  },

  async headers() {
    return [
      {
        // Everything except the hosted chat page: refuse to be framed at all.
        source: "/((?!chat/).*)",
        headers: [...BASE_HEADERS, { key: "X-Frame-Options", value: "DENY" }],
      },
      {
        // The hosted chat page is meant to be embeddable on a customer's site,
        // so it keeps the other protections but allows framing.
        source: "/chat/:key",
        headers: BASE_HEADERS,
      },
    ];
  },
};

export default nextConfig;
