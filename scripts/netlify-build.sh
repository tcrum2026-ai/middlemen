#!/usr/bin/env bash
# Netlify build entrypoint. Netlify DB injects the Postgres connection string
# as NETLIFY_DB_URL once @netlify/database is detected as a dependency; our
# Prisma schema (and Prisma CLI commands below) read DATABASE_URL, so map it.
set -euo pipefail

export DATABASE_URL="${DATABASE_URL:-${NETLIFY_DB_URL:-}}"

if [ -z "$DATABASE_URL" ]; then
  echo "No DATABASE_URL or NETLIFY_DB_URL set — skipping database setup (local build without a DB)."
else
  npx prisma generate
  # IMPORTANT: never use --force-reset here. The directory now holds real,
  # manually-researched business listings (not just seed data) — a reset
  # would destroy all of it on every deploy. Schema changes must add new
  # columns as optional or with a @default so a plain `db push` never needs
  # to guess a value for existing rows.
  npx prisma db push --accept-data-loss --skip-generate
  npx tsx prisma/seed.ts
fi

next build
