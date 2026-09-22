/**
 * Page sweep: every route, two widths.
 *
 * Checks content, not just status. An error boundary returns HTTP 200 with a
 * friendly apology, so a status-only sweep reports a crashing page and calls
 * it healthy — which is exactly how a broken billing page shipped.
 *
 *   node scripts/sweep.mjs [baseUrl]
 *
 * Run against `next dev`, an occasional random route fails with "Hydration
 * failed" — a different one each run, always on a page rendering
 * relativeTime()'s output ("3h ago"). Confirmed against a real production
 * build (`npm run build && npm run start`, three consecutive clean runs)
 * that this never reproduces there: it's Turbopack dev-mode's extra render
 * pass computing the label a moment apart from the one already sent, not a
 * bug real visitors hit. If this starts failing against a production build
 * instead, that's a real regression — chase it then, not before.
 */
import { chromium } from "playwright";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const BASE = process.argv[2] || "http://localhost:3000";

/** Static routes, discovered from the app directory. */
function routes(dir = "app", prefix = "") {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry.startsWith("[") || entry.startsWith("_")) continue;
    if (statSync(full).isDirectory()) {
      out.push(...routes(full, `${prefix}/${entry}`));
    } else if (entry === "page.tsx") {
      out.push(prefix || "/");
    }
  }
  return out;
}

// Text the error boundary and not-found pages render. A page showing any of
// these is broken however healthy its status code looks.
const BROKEN = [/That screen failed to load/i, /Application error/i, /This page could not be found/i];

/**
 * The dynamic-ID pages — a thread, a contact, the public chat page — are
 * real product surfaces, not edge cases, but their [id]/[key] segments make
 * the static route walk above skip them entirely. Pulling one real id of
 * each from a page that already lists them means this keeps testing them
 * even after a reseed changes what those ids are.
 */
async function dynamicRoutes() {
  const found = [];
  const inboxHtml = await fetch(`${BASE}/dashboard/inbox`).then((r) => r.text()).catch(() => "");
  const thread = inboxHtml.match(/\/dashboard\/inbox\/([\w-]+)/);
  if (thread) found.push(`/dashboard/inbox/${thread[1]}`);

  const contactsHtml = await fetch(`${BASE}/dashboard/contacts`).then((r) => r.text()).catch(() => "");
  const contact = contactsHtml.match(/\/dashboard\/contacts\/([\w-]+)/);
  if (contact) found.push(`/dashboard/contacts/${contact[1]}`);

  const installHtml = await fetch(`${BASE}/dashboard/install`).then((r) => r.text()).catch(() => "");
  const chatKey = installHtml.match(/\/chat\/([\w-]+)/);
  if (chatKey) found.push(`/chat/${chatKey[1]}`);

  return found;
}

const list = [
  ...routes(),
  "/for/home-services",
  "/vs/answering-service",
  "/chat/demo-missing",
  ...(await dynamicRoutes()),
];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
let bad = 0;

for (const width of [390, 1280]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  for (const route of list) {
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e).slice(0, 90)));
    const res = await page.goto(BASE + route, { waitUntil: "networkidle" }).catch(() => null);
    const status = res ? res.status() : 0;
    const text = await page.locator("body").innerText().catch(() => "");
    const overflow = await page.evaluate((w) => document.documentElement.scrollWidth - w, width);

    const problems = [];
    // /chat/demo-missing is expected to 404; everything else must be 200.
    const expect404 = route === "/chat/demo-missing";
    if (expect404 ? status !== 404 : status !== 200) problems.push(`status=${status}`);
    if (overflow > 1) problems.push(`overflow=${overflow}px`);
    if (errs.length) problems.push(`js: ${errs[0]}`);
    if (!expect404 && BROKEN.some((re) => re.test(text))) problems.push("rendered an error boundary");
    if (/\bundefined\b|\bNaN\b|\[object Object\]/.test(text)) problems.push("undefined/NaN in visible text");

    if (problems.length) { bad++; console.log(`✗ ${width}  ${route}  —  ${problems.join(", ")}`); }
    page.removeAllListeners("pageerror");
  }
  await page.close();
}

console.log(bad === 0 ? `✓ sweep clean — ${list.length} routes × 2 widths` : `\n${bad} problems`);
await browser.close();
process.exit(bad === 0 ? 0 : 1);
