import "server-only";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { getDb, id, now } from "./db";
import { platformMailConfigured } from "./platform-mail";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

export const SESSION_COOKIE = "mm_session";
const SESSION_DAYS = 30;
const KEY_LENGTH = 64;

export interface User {
  id: string;
  email: string;
  name: string;
  /** Null until they click the link we mailed them. */
  email_verified_at: string | null;
  created_at: string;
}

interface UserRow extends User {
  password_hash: string;
}

/** scrypt with a per-user salt; the salt travels with the hash. */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split(":");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const derived = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  // Constant-time: a length mismatch alone must not short-circuit.
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

/** Sessions are stored as a hash, so a database copy cannot be replayed as a cookie. */
function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function createUser(input: {
  email: string;
  name: string;
  password: string;
}): Promise<{ user: User } | { error: string }> {
  const email = normalizeEmail(input.email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "That doesn't look like an email address." };
  if (input.password.length < 10) return { error: "Use at least 10 characters — length beats complexity." };
  if (!input.name.trim()) return { error: "Tell us what to call you." };

  const db = getDb();
  if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) {
    return { error: "An account with that email already exists." };
  }

  const user: User = {
    id: id("usr"),
    email,
    name: input.name.trim(),
    email_verified_at: null,
    created_at: now(),
  };
  db.prepare(
    `INSERT INTO users (id, email, name, password_hash, email_verified_at, created_at)
     VALUES (@id, @email, @name, @password_hash, @email_verified_at, @created_at)`,
  ).run({ ...user, password_hash: await hashPassword(input.password) });

  return { user };
}

export async function authenticate(email: string, password: string): Promise<User | null> {
  const row = getDb()
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(normalizeEmail(email)) as UserRow | undefined;
  if (!row) {
    // Spend comparable time so a missing account isn't distinguishable by timing.
    await hashPassword(password);
    return null;
  }
  if (!(await verifyPassword(password, row.password_hash))) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    email_verified_at: row.email_verified_at,
    created_at: row.created_at,
  };
}

export async function startSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);

  getDb()
    .prepare(
      "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
    )
    .run(tokenHash(token), userId, now(), expires.toISOString());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash(token));
  store.delete(SESSION_COOKIE);
}

/** The signed-in user, or null when browsing the public demo. */
export async function currentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = getDb();
  const session = db
    .prepare("SELECT user_id, expires_at FROM sessions WHERE token_hash = ?")
    .get(tokenHash(token)) as { user_id: string; expires_at: string } | undefined;
  if (!session) return null;

  if (new Date(session.expires_at).getTime() < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash(token));
    return null;
  }

  return (db.prepare("SELECT id, email, name, email_verified_at, created_at FROM users WHERE id = ?").get(session.user_id) as User) ?? null;
}

export function purgeExpiredSessions(): void {
  getDb().prepare("DELETE FROM sessions WHERE expires_at < ?").run(now());
}

/* --------------------------------------------------------- password resets */

const RESET_MINUTES = 60;

/**
 * Mints a single-use reset token, or returns null when no account matches.
 *
 * The caller must not tell the visitor which happened: "if that address has an
 * account, a link is on its way" is the only safe reply, or the form becomes a
 * way to test whether someone banks here.
 */
export function createPasswordReset(rawEmail: string): { token: string; user: User } | null {
  const email = normalizeEmail(rawEmail);
  const db = getDb();
  const user = db
    .prepare("SELECT id, email, name, email_verified_at, created_at FROM users WHERE email = ?")
    .get(email) as User | undefined;
  if (!user) return null;

  // One live token per account: requesting again invalidates the last link.
  db.prepare("DELETE FROM password_resets WHERE user_id = ?").run(user.id);

  const token = randomBytes(32).toString("base64url");
  db.prepare(
    "INSERT INTO password_resets (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
  ).run(tokenHash(token), user.id, now(), new Date(Date.now() + RESET_MINUTES * 60_000).toISOString());

  return { token, user };
}

export type ResetOutcome = { ok: true; userId: string } | { ok: false; error: string };

/**
 * Spends a reset token and sets the new password. Every existing session for
 * that account is dropped: if the reset was prompted by someone else having
 * got in, leaving their cookie working would defeat the point.
 */
export async function completePasswordReset(token: string, password: string): Promise<ResetOutcome> {
  if (password.length < 10) return { ok: false, error: "Ten characters or more, please." };

  const db = getDb();
  const row = db
    .prepare("SELECT user_id, expires_at, used_at FROM password_resets WHERE token_hash = ?")
    .get(tokenHash(token)) as { user_id: string; expires_at: string; used_at: string | null } | undefined;

  if (!row || row.used_at) return { ok: false, error: "That link has already been used. Request a new one." };
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare("DELETE FROM password_resets WHERE token_hash = ?").run(tokenHash(token));
    return { ok: false, error: "That link has expired. Request a new one." };
  }

  const hash = await hashPassword(password);
  const stamp = now();
  db.transaction(() => {
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, row.user_id);
    db.prepare("UPDATE password_resets SET used_at = ? WHERE token_hash = ?").run(stamp, tokenHash(token));
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(row.user_id);
  })();

  return { ok: true, userId: row.user_id };
}

export function purgeExpiredResets(): void {
  getDb().prepare("DELETE FROM password_resets WHERE expires_at < ?").run(now());
}


/* ------------------------------------------------------------ verification */

const VERIFY_HOURS = 48;

/**
 * Proves the address on an account can actually receive mail.
 *
 * Only meaningful where the platform can send: without RESEND_API_KEY and
 * AUTH_FROM_EMAIL there is no way to deliver a link, so nothing anywhere
 * should demand one. Same rule as password reset — the product says what it
 * cannot do rather than pretending.
 */
export function verificationAvailable(): boolean {
  return platformMailConfigured();
}

/** True when this account still needs to prove its address, and could. */
export function needsVerification(user: User | null): boolean {
  return Boolean(user && !user.email_verified_at && verificationAvailable());
}

/**
 * Mints a fresh link, invalidating any previous one.
 *
 * Returns the raw token, which exists only in the email — the database keeps
 * a SHA-256 of it, so a copy of the table is not a set of working links.
 */
export function createEmailVerification(userId: string): string {
  const db = getDb();
  db.prepare("DELETE FROM email_verifications WHERE user_id = ?").run(userId);

  const token = randomBytes(32).toString("base64url");
  db.prepare(
    "INSERT INTO email_verifications (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
  ).run(tokenHash(token), userId, now(), new Date(Date.now() + VERIFY_HOURS * 3_600_000).toISOString());
  return token;
}

export type VerifyOutcome = { ok: true; user: User } | { ok: false; error: string };

/** Spends a verification token and marks the address confirmed. */
export function completeEmailVerification(token: string): VerifyOutcome {
  const db = getDb();
  const row = db
    .prepare("SELECT user_id, expires_at, used_at FROM email_verifications WHERE token_hash = ?")
    .get(tokenHash(token)) as { user_id: string; expires_at: string; used_at: string | null } | undefined;

  if (!row) return { ok: false, error: "That link isn't valid. Ask for a new one from your dashboard." };
  if (row.used_at) {
    // Already spent is not a failure worth alarming anyone about: mail clients
    // pre-fetch links, so the common cause is the person clicking twice.
    const user = getUserById(row.user_id);
    return user?.email_verified_at
      ? { ok: true, user }
      : { ok: false, error: "That link has already been used. Ask for a new one." };
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare("DELETE FROM email_verifications WHERE token_hash = ?").run(tokenHash(token));
    return { ok: false, error: "That link has expired. Ask for a new one from your dashboard." };
  }

  const stamp = now();
  db.transaction(() => {
    db.prepare("UPDATE users SET email_verified_at = ? WHERE id = ?").run(stamp, row.user_id);
    db.prepare("UPDATE email_verifications SET used_at = ? WHERE token_hash = ?").run(stamp, tokenHash(token));
  })();

  const user = getUserById(row.user_id);
  return user ? { ok: true, user } : { ok: false, error: "That account no longer exists." };
}

export function getUserById(userId: string): User | null {
  return (
    (getDb()
      .prepare("SELECT id, email, name, email_verified_at, created_at FROM users WHERE id = ?")
      .get(userId) as User) ?? null
  );
}

export function purgeExpiredVerifications(): void {
  getDb().prepare("DELETE FROM email_verifications WHERE expires_at < ?").run(now());
}
