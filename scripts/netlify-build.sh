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
  npx prisma db push --accept-data-loss --skip-generate
  npx tsx prisma/seed.ts
fi

next build
