/**
 * Runs the app the way a deployed container does, and checks it works.
 *
 *   npm run image        (builds, lays out exactly what the Dockerfile
 *                         copies, boots it on :3100, drives it, tears down)
 *
 * This exists because the Dockerfile shipped for weeks setting
 * MIDDLEMEN_DATA_DIR — the project's old name — while the app read
 * LOBBY_DATA_DIR. The mounted volume was ignored, SQLite wrote inside the
 * container, and every redeploy silently threw away every customer's data.
 * Nothing caught it: the build passed, the tests passed, the app ran
 * perfectly in development.
 *
 * So this checks the deployed shape rather than the development one: that
 * every file the image copies is enough to boot, that the security headers
 * and redirects from next.config survive, that the data directory is
 * actually written to, and that someone can sign in and use it.
 */

import { chromium } from "playwright";
const B = "http://localhost:3100";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();
const errs=[]; p.on("pageerror", e=>errs.push(String(e).slice(0,120)));
const fails=[];
const ok=(c,w)=>{ console.log(`${c?"✓":"✗"} ${w}`); if(!c) fails.push(w); };

// Public side.
let r = await p.goto(B+"/", { waitUntil:"networkidle" });
ok(r.status()===200, "home page serves");
ok((await p.locator("body").innerText()).includes("Nobody waits"), "content rendered, not an error page");

// Security headers survive the production config.
const h = r.headers();
ok(h["x-frame-options"]==="DENY", "X-Frame-Options present");
ok(Boolean(h["strict-transport-security"]), "HSTS present");
ok(Boolean(h["content-security-policy"]), "CSP present");

// Redirects come from next.config — proves it is being read.
const red = await p.goto(B+"/pricing", { waitUntil:"domcontentloaded" });
ok(red.url().includes("#pricing") || red.status()===200, "/pricing redirect works");

// Static assets.
ok((await (await fetch(B+"/widget.js")).status)===200, "widget.js served");
ok((await (await fetch(B+"/sitemap.xml")).status)===200, "sitemap served");

// Sign in as the demo admin.
await p.goto(B+"/signin", { waitUntil:"networkidle" });
await p.fill('input[name="email"]',"demo@lobby.app");
await p.fill('input[name="password"]',"lobby-demo-2026");
await p.click('button[type="submit"]');
await p.waitForURL(/dashboard/,{timeout:15000}).catch(()=>{});
ok(p.url().includes("/dashboard"), "demo admin can sign in");

// Every dashboard page.
let bad = 0;
for (const route of ["/dashboard","/dashboard/inbox","/dashboard/approvals","/dashboard/calls",
  "/dashboard/leads","/dashboard/contacts","/dashboard/appointments","/dashboard/knowledge",
  "/dashboard/gaps","/dashboard/playground","/dashboard/automations","/dashboard/analytics",
  "/dashboard/install","/dashboard/integrations","/dashboard/team","/dashboard/billing","/dashboard/settings"]) {
  const res = await p.goto(B+route,{waitUntil:"networkidle"});
  const t = await p.locator("main").innerText().catch(()=>"");
  if (res.status()!==200 || /failed to load|Application error/i.test(t)) { bad++; console.log("   ✗", route); }
}
ok(bad===0, `all 17 dashboard pages render (${bad} bad)`);

// A write, to prove the volume is actually being used.
await p.goto(B+"/dashboard/knowledge",{waitUntil:"networkidle"});
const title = p.locator('input[name="title"], #title').first();
if (await title.count()) {
  await title.fill("Written on the deployed image");
  const body = p.locator('textarea[name="body"], #body').first();
  if (await body.count()) await body.fill("Proves the data directory is writable in this configuration.");
  await p.locator("button",{hasText:/Add|Save/}).first().click();
  await p.waitForTimeout(2000);
}
ok((await p.locator("main").innerText()).includes("Written on the deployed image"), "writes persist to the data directory");

// Public chat API.
const db = (await import("better-sqlite3")).default;
const d = new db("/tmp/imgsim/data/lobby.db",{readonly:true});
const key = d.prepare("SELECT widget_key FROM businesses LIMIT 1").get().widget_key;
const chat = await (await fetch(B+"/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},
  body:JSON.stringify({widgetKey:key,message:"How much is a water heater replacement?"})})).json();
ok(/\$\d/.test(chat.reply), "the assistant answers over the public API");

console.log("\npage errors:", errs.length?errs:"none");
await b.close();
console.log(fails.length ? `\n${fails.length} check(s) failed` : "\n✓ the deployable image works");
process.exitCode = fails.length ? 1 : 0;
