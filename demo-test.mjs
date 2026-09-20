import { chromium } from "playwright";
const OUT="/tmp/claude-0/-home-user-middlemen/739be1e0-f202-5cd2-a3b7-aac359c8359b/scratchpad";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1280, height: 950 } });
const p = await ctx.newPage();
const errs=[]; p.on("pageerror", e=>errs.push(String(e).slice(0,140)));

await p.goto("http://localhost:3000/signin", { waitUntil:"networkidle" });
await p.fill('input[name="email"]', "demo@lobby.app");
await p.fill('input[name="password"]', "try-the-demo-2026");
await p.click('button[type="submit"]');
await p.waitForURL(/dashboard/, { timeout: 15000 }).catch(()=>{});
console.log("1. signed in →", new URL(p.url()).pathname);

const body = await p.locator("body").innerText();
console.log("2. demo banner:", body.includes("Demo workspace") ? "shown" : "MISSING");
console.log("   read-only banner gone:", !body.includes("changes are refused") ? "yes" : "NO — still read-only");
await p.screenshot({ path:`${OUT}/demo-dash.png`, fullPage:false });

// Can they actually change something?
await p.goto("http://localhost:3000/dashboard/knowledge", { waitUntil:"networkidle" });
await p.waitForTimeout(500);
const title = p.locator('input[name="title"], #title').first();
if (await title.count()) {
  await title.fill("Demo test article");
  const bodyField = p.locator('textarea[name="body"], #body').first();
  if (await bodyField.count()) await bodyField.fill("Written by the demo account to prove writes work.");
  await p.locator("button", { hasText: /Add|Save/ }).first().click();
  await p.waitForTimeout(2000);
}
const after = await p.locator("main").innerText();
console.log("3. write worked:", after.includes("Demo test article") ? "✓ article saved" : "✗ nothing saved");

// Walk every dashboard page for errors.
console.log("\n4. every page as the demo user:");
for (const r of ["/dashboard","/dashboard/inbox","/dashboard/approvals","/dashboard/calls","/dashboard/leads",
                 "/dashboard/contacts","/dashboard/appointments","/dashboard/knowledge","/dashboard/gaps",
                 "/dashboard/playground","/dashboard/automations","/dashboard/analytics","/dashboard/install",
                 "/dashboard/integrations","/dashboard/team","/dashboard/billing","/dashboard/settings"]) {
  const res = await p.goto(`http://localhost:3000${r}`, { waitUntil:"networkidle" });
  await p.waitForTimeout(150);
  const t = await p.locator("main").innerText().catch(()=>"");
  const bad = /That screen failed to load|Application error/i.test(t);
  console.log(`   ${String(res?.status()).padEnd(3)} ${bad ? "✗ error boundary" : "ok "} ${r}`);
}
console.log("\npage errors:", errs.length?errs:"none");
await b.close();
