# Build
FROM node:22-slim AS build
WORKDIR /app
# better-sqlite3 compiles from source when no prebuild matches the platform.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Run
FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production

# The database lives here. This name has to match what lib/db.ts reads: it
# used to say MIDDLEMEN_DATA_DIR, left over from the project's old name, so
# the mounted volume was ignored and SQLite quietly wrote inside the
# container — meaning every redeploy threw away every customer's data.
ENV LOBBY_DATA_DIR=/data

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
# next start reads the config at boot; server/ holds the voice bridge, which
# runs as a second process; scripts/ carries the operational tooling.
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/server ./server
COPY --from=build /app/scripts ./scripts

RUN mkdir -p /data && chown -R node:node /data /app
USER node
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npm", "run", "start"]
