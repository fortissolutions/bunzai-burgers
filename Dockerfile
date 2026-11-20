# Bunzai Burgers: website + Spin & Win API + admin dashboard (Node 20, SQLite)

# ---------- 1. Install production dependencies ----------
FROM node:20-bookworm-slim AS deps
WORKDIR /app
# Build tools only in case better-sqlite3 has no prebuilt binary for this platform.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---------- 2. Runtime image ----------
FROM node:20-bookworm-slim
ENV NODE_ENV=production \
    PORT=8080 \
    DATA_DIR=/app/data
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=node:node . .

# The SQLite database lives in /app/data: mount a volume there so it survives
# container restarts and image updates.
RUN mkdir -p /app/data && chown node:node /app/data
VOLUME ["/app/data"]

USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.js"]
