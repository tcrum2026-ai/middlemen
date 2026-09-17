import "server-only";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { getDb, id, now } from "./db";

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

  const user: User = { id: id("usr"), email, name: input.name.trim(), created_at: now() };
  db.prepare(
    `INSERT INTO users (id, email, name, password_hash, created_at)
     VALUES (@id, @email, @name, @password_hash, @created_at)`,
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
  return { id: row.id, email: row.email, name: row.name, created_at: row.created_at };
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

  return (db.prepare("SELECT id, email, name, created_at FROM users WHERE id = ?").get(session.user_id) as User) ?? null;
}

export function purgeExpiredSessions(): void {
  getDb().prepare("DELETE FROM sessions WHERE expires_at < ?").run(now());
}
