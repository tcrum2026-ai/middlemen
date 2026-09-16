import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";

const DATA_DIR = process.env.MIDDLEMEN_DATA_DIR
  ? path.resolve(process.env.MIDDLEMEN_DATA_DIR)
  : path.join(process.cwd(), ".data");

const DB_PATH = path.join(DATA_DIR, "middlemen.db");

const SCHEMA = `
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
  call_handoff_number TEXT,
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

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  summary TEXT NOT NULL,
  handled_by TEXT NOT NULL DEFAULT 'ai',
  minutes_saved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_business ON conversations(business_id);
CREATE INDEX IF NOT EXISTS idx_events_business ON events(business_id);
`;

declare global {
  var __middlemenDb: Database.Database | undefined;
}

function open(): Database.Database {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

/**
 * A single connection is reused across hot reloads in dev, where module state
 * would otherwise be rebuilt on every request.
 */
export function getDb(): Database.Database {
  if (!globalThis.__middlemenDb) {
    globalThis.__middlemenDb = open();
  }
  return globalThis.__middlemenDb;
}

export function id(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function now(): string {
  return new Date().toISOString();
}
