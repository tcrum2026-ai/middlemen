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
    // This product never asks for a camera, a microphone or a location, and the
    // "no voice path" promise is worth enforcing at the browser too.
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
