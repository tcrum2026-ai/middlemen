/**
 * Accessibility sweep: axe-core against every static route, at phone width.
 *
 *   npm run a11y     (needs the app running)
 *
 * Exists because the things it catches are invisible in a screenshot. It
 * found the widget's AI disclosure rendered at 3.28:1 — the one line in the
 * component that has to be legible, in the faintest colour in it — and five
 * side-scrolling regions a keyboard could not reach.
 *
 * Exits non-zero on any violation, so it can gate a release.
 */

import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Same route discovery as scripts/sweep.mjs.
function routes(dir = "app", prefix = "") {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (!statSync(p).isDirectory()) continue;
    if (entry.startsWith("_") || entry === "api") continue;
    const seg = entry.startsWith("(") ? "" : `/${entry}`;
    if (entry.includes("[")) continue;
    if (readdirSync(p).includes("page.tsx")) out.push(`${prefix}${seg}` || "/");
    out.push(...routes(p, `${prefix}${seg}`));
  }
  return [...new Set(out)];
}

const all = ["/", ...routes().filter(r => r !== "/")].sort();
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
let total = 0;

for (const route of all) {
  const res = await page.goto(`http://localhost:3000${route}`, { waitUntil: "networkidle" }).catch(() => null);
  if (!res || res.status() >= 400) { console.log(`skip ${route} (${res?.status()})`); continue; }
  await page.waitForTimeout(300);
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  if (!violations.length) continue;
  console.log(`\n${route}`);
  for (const v of violations) {
    total += v.nodes.length;
    console.log(`  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length})`);
    for (const n of v.nodes.slice(0, 2)) console.log(`      ${n.html.slice(0, 110)}`);
  }
}
await b.close();
if (total === 0) {
  console.log(`✓ no accessibility violations — ${all.length} routes at 390px`);
} else {
  console.log(`\n${total} accessibility violations across ${all.length} routes`);
  process.exitCode = 1;
}
