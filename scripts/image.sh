#!/bin/bash
set -e
cd /home/user/middlemen
echo "· building"
npm run build > /tmp/image-build.log 2>&1 || { tail -20 /tmp/image-build.log; exit 1; }
echo "· laying out what the Dockerfile copies"
rm -rf /tmp/imgsim && mkdir -p /tmp/imgsim/data
for i in node_modules .next public package.json next.config.ts server scripts; do cp -r "$i" /tmp/imgsim/; done
for pid in $(ps -eo pid,args --no-headers | grep "[n]ext-server" | awk '{print $1}'); do kill "$pid" 2>/dev/null || true; done
sleep 2
echo "· booting on :3100"
cd /tmp/imgsim
NODE_ENV=production LOBBY_DATA_DIR=/tmp/imgsim/data LOBBY_DEMO_PASSWORD=lobby-demo-2026 \
  nohup npx next start -p 3100 > /tmp/imgsim.log 2>&1 &
for i in $(seq 1 30); do curl -sf -o /dev/null http://localhost:3100/api/health && break; sleep 2; done
cd /home/user/middlemen
node scripts/image.mjs
code=$?
for pid in $(ps -eo pid,args --no-headers | grep "[n]ext-server" | awk '{print $1}'); do kill "$pid" 2>/dev/null || true; done
exit $code
