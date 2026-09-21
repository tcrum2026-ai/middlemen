/**
 * Captures real screenshots of the running app for use as marketing imagery.
 *
 * Not mockups: these are the actual dashboard, seeded with the actual demo
 * data, rendered by the actual app. Run against a dev server with
 * LOBBY_DEMO_PASSWORD set.
 *
 *   node scripts/screenshots.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] || "http://localhost:3000";
const OUT = "public/marketing/shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });

await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.getByLabel(/email/i).fill("demo@lobby.app");
await page.getByLabel(/password/i).fill("lobby-demo-2026");
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL(/\/dashboard/, { timeout: 15_000 });

const shots = [
  { path: "/dashboard/inbox", name: "inbox", wait: 800 },
  { path: "/dashboard/approvals", name: "approvals", wait: 800 },
  { path: "/dashboard/calls", name: "calls", wait: 800 },
  { path: "/dashboard/contacts", name: "contacts", wait: 800 },
  { path: "/dashboard/gaps", name: "gaps", wait: 800 },
  { path: "/dashboard/analytics", name: "analytics", wait: 1000 },
];

for (const shot of shots) {
  await page.goto(`${BASE}${shot.path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(shot.wait);
  // The top bar is `position: sticky`, so it stays pinned to the viewport
  // wherever the page scrolls to — including over <main>'s own top edge
  // when only <main> is captured, since a locator screenshot captures the
  // actual rendered pixels at that region, not just that element's own
  // paint. Hiding it (a sibling of <main>, so this doesn't affect layout)
  // is simpler than fighting scroll position for a result that would look
  // identical anyway.
  await page.evaluate(() => {
    const header = document.querySelector("header");
    if (header) header.style.display = "none";
  });
  // Just the content area, not the sidebar — it eats width a marketing-page
  // card doesn't have to spare, and shrinking a full 1280px-wide capture
  // down to a ~500px column made every label in it too small to read.
  await page.locator("main").screenshot({ path: `${OUT}/${shot.name}.png` });
  console.log(`✓ ${shot.name}.png`);
}

await browser.close();
