/**
 * Drives the embedded widget on a third-party page.
 *
 *   npm run widget     (needs the app running)
 *
 * The widget is the only part of this product that runs on someone else's
 * website, inside a shadow root, loaded cross-origin. Nothing else in the
 * test suite touches it, and a page in the dashboard that merely *looks* like
 * it is not the same thing.
 *
 * Exits non-zero if the widget fails to load, answer, or offer a way out.
 */

import { chromium } from "playwright";
import Database from "better-sqlite3";

const db = new Database(new URL("../.data/lobby.db", import.meta.url).pathname);
const biz = db.prepare("SELECT widget_key, name FROM businesses LIMIT 1").get();
if (!biz) {
  console.error("No workspace in the database — start the app once so it seeds.");
  process.exit(2);
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const context = await browser.newContext({ viewport: { width: 1100, height: 800 } });
const page = await context.newPage();

const failures = [];
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 160)));
page.on("console", (m) => {
  if (m.type() === "error") pageErrors.push(`console: ${m.text().slice(0, 120)}`);
});
const check = (ok, what) => {
  console.log(`${ok ? "✓" : "✗"} ${what}`);
  if (!ok) failures.push(what);
};

/** A customer's own site: their styles, their markup, one script tag. */
await page.setContent(
  `<!doctype html><html><head><meta charset="utf-8"><title>${biz.name}</title>
   <style>body{font-family:system-ui;background:#faf9f6;color:#222;margin:0;padding:48px}
   /* Hostile-ish host CSS: the shadow root should ignore all of it. */
   button{background:red!important}input{display:none!important}div{color:magenta}</style>
   </head><body><h1>${biz.name}</h1><p>Serving the metro area since 1998.</p>
   <script src="http://localhost:3000/widget.js" data-key="${biz.widget_key}" defer></script>
   </body></html>`,
  { waitUntil: "networkidle" },
);
await page.waitForTimeout(1200);

const launcher = page.locator(".launcher");
check((await launcher.count()) > 0, "launcher renders on a third-party page");

// The host page hides every input and reddens every button. The widget lives
// in a shadow root precisely so that cannot reach it.
await launcher.click();
await page.waitForTimeout(700);
const input = page.locator(".panel input");
check(await input.isVisible().catch(() => false), "host page CSS cannot break the widget");

const read = () =>
  page.evaluate(() => document.querySelector("[data-lobby]")?.shadowRoot?.textContent ?? "");

check((await read()).includes("Answers are AI"), "AI disclosure is present");

await input.fill("How much is a water heater replacement?");
await page.keyboard.press("Enter");
await page.waitForTimeout(7000);
const answered = await read();
check(/\$\d/.test(answered), "answers a pricing question with a real figure");
check(answered.includes("Checked knowledge base"), "shows which tools it used");

// The way out has to work, not just be advertised — this is the single most
// common complaint about assistants like this one.
await input.fill("Can I speak to a real person?");
await page.keyboard.press("Enter");
await page.waitForTimeout(7000);
const after = await read();
check(
  /teammate|someone|person|call/i.test(after.slice(answered.length)),
  "asking for a person gets a person, not another answer",
);

const focusable = await page.evaluate(() => {
  const host = document.querySelector("[data-lobby]");
  return [...(host?.shadowRoot?.querySelectorAll("button, input") ?? [])].length;
});
check(focusable >= 3, "launcher, close, input and send are all reachable");

check(pageErrors.length === 0, `no page or console errors${pageErrors.length ? `: ${pageErrors.join("; ")}` : ""}`);

await browser.close();
if (failures.length) {
  console.log(`\n${failures.length} widget check(s) failed`);
  process.exitCode = 1;
} else {
  console.log("\n✓ widget works on a third-party page");
}
