/**
 * Walks the path every customer takes, against a running app.
 *
 *   npm run journey     (needs the app running; reseeds nothing)
 *
 * Signing up, onboarding, a customer writing in, the assistant refusing to
 * decide something it shouldn't, a teammate editing and approving the reply,
 * and that reply reaching the customer. Each of those has been broken at some
 * point in a way that every page still rendered and every test still passed,
 * which is exactly why this exists.
 *
 * Exits non-zero on any failed check.
 */

import { chromium } from "playwright";
import Database from "better-sqlite3";
import { createHash, randomBytes } from "node:crypto";

const DB = new URL("../.data/lobby.db", import.meta.url).pathname;
const failures = [];
const check = (ok, what, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${what}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(what);
};

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const context = await browser.newContext({ viewport: { width: 1280, height: 950 } });
const page = await context.newPage();
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 140)));

// ── Sign up ────────────────────────────────────────────────────────────────
const email = `journey${Date.now()}@example.com`;
await page.goto("http://localhost:3000/signup", { waitUntil: "networkidle" });
await page.fill('input[name="name"]', "Dana Reed");
await page.fill('input[name="email"]', email);
await page.fill('input[name="password"]', "correct-horse-battery-staple");
await page.click('button[type="submit"]');
await page.waitForURL(/connect|dashboard/, { timeout: 25000 }).catch(() => {});
check(/\/(connect|dashboard)/.test(page.url()), "sign-up lands somewhere useful", new URL(page.url()).pathname);

// ── Onboarding ─────────────────────────────────────────────────────────────
if (page.url().includes("/connect")) {
  await page.waitForTimeout(600);
  await page.fill("#name", "Reed Plumbing & Heating");
  const trade = page.locator("select").first();
  if (await trade.count()) await trade.selectOption({ index: 1 }).catch(() => {});
  for (let i = 0; i < 6; i++) {
    const next = page.locator("button", { hasText: /^Continue$/ }).first();
    if (!(await next.count()) || !(await next.isVisible()) || !(await next.isEnabled())) break;
    const callback = page.locator("#callnumber");
    if ((await callback.count()) && (await callback.isVisible())) await callback.fill("(555) 010-2030");
    await next.click();
    await page.waitForTimeout(450);
  }
  await page.locator("button.btn-primary").last().click().catch(() => {});
  await page.waitForURL(/dashboard/, { timeout: 30000 }).catch(() => {});
}
check(page.url().includes("/dashboard"), "onboarding finishes in the dashboard");

const db = new Database(DB);
const biz = db.prepare("SELECT * FROM businesses WHERE owner_id IS NOT NULL ORDER BY rowid DESC LIMIT 1").get();
check(Boolean(biz), "a workspace exists and is owned");
check(biz.subscription_status === "trialing", "new workspace starts on a trial", `${biz.plan}/${biz.subscription_status}`);
const articles = db.prepare("SELECT COUNT(*) c FROM kb_articles WHERE business_id=?").get(biz.id).c;
check(articles > 0, "a starter knowledge pack was loaded", `${articles} articles`);

// ── The install snippet must carry their own key ───────────────────────────
await page.goto("http://localhost:3000/dashboard/install", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
const snippet = await page.locator("pre").first().innerText();
check(snippet.includes(biz.widget_key), "the install snippet carries their own widget key");

/**
 * Click the link, the way a real person would.
 *
 * Where platform mail is configured, an unconfirmed trial deliberately does
 * not answer customers, so every check below would otherwise be testing the
 * gate rather than the assistant. The stored token is a SHA-256, so minting
 * one the same way the app does exercises exactly the path a mailed link
 * takes.
 */
const pending = db
  .prepare("SELECT token_hash FROM email_verifications WHERE user_id = ?")
  .get(biz.owner_id);
if (pending) {
  const token = randomBytes(32).toString("base64url");
  db.prepare("UPDATE email_verifications SET token_hash = ? WHERE user_id = ?")
    .run(createHash("sha256").update(token).digest("hex"), biz.owner_id);
  await page.goto(`http://localhost:3000/verify?token=${encodeURIComponent(token)}`, {
    waitUntil: "networkidle",
  });
  const confirmed = db
    .prepare("SELECT email_verified_at FROM users WHERE id = ?")
    .get(biz.owner_id).email_verified_at;
  check(Boolean(confirmed), "the emailed link confirms the address");
} else {
  console.log("· platform mail is not configured, so nothing asks for confirmation");
}

const chat = async (message, conversationId = null) => {
  const r = await fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ widgetKey: biz.widget_key, conversationId, message }),
  });
  return r.json();
};

// ── A question the knowledge base cannot answer becomes a gap ──────────────
const unknown = await chat("Do you do emergency callouts on a Sunday?");
check(!/\$\d/.test(unknown.reply), "does not invent an answer it does not have");
const gaps = db.prepare("SELECT question FROM kb_gaps WHERE business_id=?").all(biz.id);
check(gaps.length > 0, "the unanswered question is recorded as a gap", gaps[0]?.question);

// ── Something it must not decide goes to the queue, not the customer ───────
const refund = await chat("I want a refund for last week's visit, it didn't fix anything.");
check(refund.escalated === true, "a refund request is escalated, not answered");
check(!/refund(ed)? (you|it|in full)/i.test(refund.reply), "the assistant does not promise the refund itself");

const approval = db
  .prepare("SELECT * FROM approvals WHERE business_id=? AND status='pending' ORDER BY rowid DESC LIMIT 1")
  .get(biz.id);
check(Boolean(approval), "an approval is waiting for a person", approval?.title);

const beforeApproval = db
  .prepare("SELECT COUNT(*) c FROM messages WHERE conversation_id=? AND role='agent'")
  .get(refund.conversationId).c;
check(beforeApproval === 0, "nothing has gone out on the teammate's behalf yet");

// ── A teammate edits the draft and approves it ─────────────────────────────
await page.goto("http://localhost:3000/dashboard/approvals", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
const draftBox = page.locator("textarea").first();
check((await draftBox.count()) > 0, "the draft can be edited before it is sent");

const EDIT = "Sorry about that — I've approved a full refund, back with you in 3 working days.";
await draftBox.fill(EDIT);
await page.locator("button", { hasText: /^Approve/ }).first().click();
await page.waitForTimeout(3500);

const resolved = db.prepare("SELECT status FROM approvals WHERE id=?").get(approval.id);
check(resolved.status === "approved", "the approval is marked approved");

const sentRows = db
  .prepare("SELECT body FROM messages WHERE conversation_id=? AND role='agent'")
  .all(refund.conversationId);
check(sentRows.length === 1, "exactly one reply was sent, not two", `${sentRows.length} agent message(s)`);
check(sentRows[0]?.body === EDIT, "the edited wording is what went out, not the original draft");

const conversation = db.prepare("SELECT handled_by FROM conversations WHERE id=?").get(refund.conversationId);
check(conversation.handled_by === "human", "the thread is marked as handled by a person");

// ── Taking a thread over must actually silence the assistant ──────────────
const taken = await chat("What are your hours?");
await page.goto(`http://localhost:3000/dashboard/inbox/${taken.conversationId}`, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
const takeOver = page.locator("button", { hasText: "Take it over" });
check((await takeOver.count()) > 0, "a thread can be taken over in one click");
await takeOver.click();
await page.waitForTimeout(2000);

const afterTakeover = await chat("Actually, do you do Sundays?", taken.conversationId);
check(afterTakeover.reply === "", "the assistant stays out of a thread a teammate has");
check(afterTakeover.waiting === true, "the customer is told a person is on it");

await page.goto(`http://localhost:3000/dashboard/inbox/${taken.conversationId}`, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.locator("button", { hasText: /take it again/ }).click();
await page.waitForTimeout(2000);
const handedBack = await chat("And pricing?", taken.conversationId);
check(handedBack.reply.length > 0, "handing it back starts the assistant again");

check(pageErrors.length === 0, `no page errors${pageErrors.length ? `: ${pageErrors.join("; ")}` : ""}`);

await browser.close();
if (failures.length) {
  console.log(`\n${failures.length} journey check(s) failed`);
  process.exitCode = 1;
} else {
  console.log("\n✓ the whole journey holds up");
}
