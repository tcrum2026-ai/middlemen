#!/bin/bash
# Boots the app from exactly what the Dockerfile ships, and drives it.
#
# Deliberately mirrors the image rather than the working tree: production
# dependencies only, next.config as shipped, the same file set. Both bugs
# this has caught so far — a data directory the app never read, and a
# TypeScript config that made the container run yarn at boot — were
# invisible in development and obvious here.
set -e
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
SIM=/tmp/lobby-image
PORT=3100

echo "· building"
npm run build > /tmp/image-build.log 2>&1 || { tail -25 /tmp/image-build.log; exit 1; }

echo "· installing production dependencies only (as the image does)"
rm -rf "$SIM" && mkdir -p "$SIM/data"
cp package*.json "$SIM/"
( cd "$SIM" && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --omit=dev --silent > /tmp/image-npm.log 2>&1 ) \
  || { tail -20 /tmp/image-npm.log; exit 1; }

echo "· copying what the Dockerfile copies"
# Read the actual COPY --from=build lines rather than keeping a second,
# hand-maintained list here: a hardcoded list stays "right" by coincidence
# when a path in the Dockerfile changes, which is exactly how it missed
# next.config.ts becoming next.config.mjs and shipped a build that 404's
# before it starts. node_modules and package.json are excluded: this
# script installs those itself, production dependencies only, which is
# the whole point of the steps above — copying the working tree's would
# silently hide a devDependency the image needs at runtime.
while read -r src; do
  case "$src" in
    node_modules|package.json) continue ;;
  esac
  cp -r "$ROOT/$src" "$SIM/$src"
done < <(grep -oP 'COPY --from=build /app/\K\S+' "$ROOT/Dockerfile")

for pid in $(ps -eo pid,args --no-headers | grep "[n]ext-server" | awk '{print $1}'); do kill "$pid" 2>/dev/null || true; done
sleep 2

echo "· booting on :$PORT"
( cd "$SIM" && NODE_ENV=production LOBBY_DATA_DIR="$SIM/data" LOBBY_DEMO_PASSWORD=lobby-demo-2026 \
  nohup npx next start -p $PORT > /tmp/lobby-image.log 2>&1 & )
for _ in $(seq 1 30); do curl -sf -o /dev/null "http://localhost:$PORT/api/health" && break; sleep 2; done

# Anything installed at boot means the image is missing something it needs.
if grep -qiE "Installing (TypeScript|devDependencies)|yarn add" /tmp/lobby-image.log; then
  echo "✗ the container installed packages at startup — see /tmp/lobby-image.log"
  tail -8 /tmp/lobby-image.log
  for pid in $(ps -eo pid,args --no-headers | grep "[n]ext-server" | awk '{print $1}'); do kill "$pid" 2>/dev/null || true; done
  exit 1
fi

set +e
node "$ROOT/scripts/image.mjs"
code=$?
set -e
for pid in $(ps -eo pid,args --no-headers | grep "[n]ext-server" | awk '{print $1}'); do kill "$pid" 2>/dev/null || true; done
exit $code
