import path from "node:path";
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import Database from "better-sqlite3";

const DATA_DIR = process.env.LOBBY_DATA_DIR
  ? path.resolve(process.env.LOBBY_DATA_DIR)
  : path.join(process.cwd(), ".data");

const DB_PATH = path.join(DATA_DIR, "lobby.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);

CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  industry TEXT NOT NULL DEFAULT 'general',
  website TEXT,
  email TEXT,
  phone TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  hours TEXT NOT NULL DEFAULT '{}',
  assistant_name TEXT NOT NULL DEFAULT 'Ava',
  tone TEXT NOT NULL DEFAULT 'friendly-professional',
  greeting TEXT NOT NULL DEFAULT 'Hi! How can I help today?',
  services TEXT NOT NULL DEFAULT '[]',
  autonomy TEXT NOT NULL DEFAULT 'balanced',
  auto_send_threshold REAL NOT NULL DEFAULT 0.75,
  effort TEXT NOT NULL DEFAULT 'medium',
  call_handoff_number TEXT,
  voice_enabled INTEGER NOT NULL DEFAULT 0,
  voice_disclosure TEXT NOT NULL DEFAULT 'Just so you know, you are speaking with an AI assistant.',
  voice_name TEXT NOT NULL DEFAULT 'en-US-Journey-O',
  voice_greeting TEXT NOT NULL DEFAULT '',
  widget_key TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS kb_articles (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'web',
  subject TEXT NOT NULL DEFAULT 'New conversation',
  status TEXT NOT NULL DEFAULT 'open',
  handled_by TEXT NOT NULL DEFAULT 'ai',
  last_message_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  body TEXT NOT NULL,
  actions TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  duration_min INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'scheduled',
  location TEXT NOT NULL DEFAULT 'Video call',
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'ai',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'web',
  intent TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'new',
  score INTEGER NOT NULL DEFAULT 50,
  value_cents INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  line_items TEXT NOT NULL DEFAULT '[]',
  total_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  draft TEXT NOT NULL DEFAULT '',
  risk TEXT NOT NULL DEFAULT 'low',
  confidence REAL NOT NULL DEFAULT 0.5,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS call_requests (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'normal',
  preferred_window TEXT NOT NULL DEFAULT 'Any time',
  brief TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'queued',
  assigned_to TEXT,
  outcome TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected',
  connected_at TEXT,
  UNIQUE (business_id, provider)
);

CREATE TABLE IF NOT EXISTS integration_credentials (
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  field TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (business_id, provider, field)
);

CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  summary TEXT NOT NULL,
  handled_by TEXT NOT NULL DEFAULT 'ai',
  minutes_saved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS kb_gaps (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  normalized TEXT NOT NULL,
  hits INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'open',
  last_seen TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (business_id, normalized)
);

CREATE TABLE IF NOT EXISTS follow_ups (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
  rule TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'sms',
  body TEXT NOT NULL,
  due_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS automation_rules (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  delay_hours INTEGER NOT NULL DEFAULT 24,
  channel TEXT NOT NULL DEFAULT 'sms',
  template TEXT NOT NULL,
  UNIQUE (business_id, kind)
);

CREATE TABLE IF NOT EXISTS teammates (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent',
  takes_calls INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_business ON conversations(business_id);
CREATE INDEX IF NOT EXISTS idx_events_business ON events(business_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_business ON deliveries(business_id);
`;

/**
 * Columns added after the first release. SQLite has no "ADD COLUMN IF NOT
 * EXISTS", so each one is checked against the live table before it is applied.
 */
const ADDED_COLUMNS: { table: string; column: string; ddl: string }[] = [
  { table: "businesses", column: "voice_enabled", ddl: "ALTER TABLE businesses ADD COLUMN voice_enabled INTEGER NOT NULL DEFAULT 0" },
  {
    table: "businesses",
    column: "voice_disclosure",
    ddl:
      "ALTER TABLE businesses ADD COLUMN voice_disclosure TEXT NOT NULL DEFAULT " +
      "'Just so you know, you are speaking with an AI assistant.'",
  },
  { table: "businesses", column: "voice_name", ddl: "ALTER TABLE businesses ADD COLUMN voice_name TEXT NOT NULL DEFAULT 'en-US-Journey-O'" },
  { table: "businesses", column: "voice_greeting", ddl: "ALTER TABLE businesses ADD COLUMN voice_greeting TEXT NOT NULL DEFAULT ''" },
  { table: "businesses", column: "owner_id", ddl: "ALTER TABLE businesses ADD COLUMN owner_id TEXT" },
  {
    table: "businesses",
    column: "effort",
    ddl: "ALTER TABLE businesses ADD COLUMN effort TEXT NOT NULL DEFAULT 'medium'",
  },
];

function migrate(db: Database.Database): void {
  for (const { table, column, ddl } of ADDED_COLUMNS) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!columns.some((c) => c.name === column)) db.exec(ddl);
  }
  rotateLegacyWidgetKeys(db);
}

/**
 * Widget keys used to be minted from Math.random(). A key is the only credential
 * /api/chat accepts, so any key in the old shape (ten lowercase base36 chars) is
 * replaced with a cryptographically random one the first time the app opens the
 * database. Re-paste the snippet from the install page after this runs.
 */
function rotateLegacyWidgetKeys(db: Database.Database): void {
  const legacy = db
    .prepare("SELECT id, widget_key FROM businesses WHERE length(widget_key) < 20")
    .all() as { id: string; widget_key: string }[];

  const update = db.prepare("UPDATE businesses SET widget_key = ? WHERE id = ?");
  for (const row of legacy) {
    if (!/^mm_[a-z0-9]{10}$/.test(row.widget_key)) continue;
    update.run(`mm_${randomBytes(18).toString("base64url")}`, row.id);
  }
}

declare global {
  var __lobbyDb: Database.Database | undefined;
}

function open(): Database.Database {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  migrate(db);
  return db;
}

/**
 * A single connection is reused across hot reloads in dev, where module state
 * would otherwise be rebuilt on every request.
 */
export function getDb(): Database.Database {
  if (!globalThis.__lobbyDb) {
    globalThis.__lobbyDb = open();
  }
  return globalThis.__lobbyDb;
}

/** Cryptographically random: ids double as lookup handles in URLs and forms. */
export function id(prefix: string): string {
  return `${prefix}_${randomBytes(9).toString("base64url")}`;
}

export function now(): string {
  return new Date().toISOString();
}
