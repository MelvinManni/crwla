# --- build ----------------------------------------------------------------
FROM node:20-slim AS builder

# OpenSSL is needed by Prisma's query engine on Debian-slim images.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install with package.json only (no committed lockfile in this repo).
COPY package.json ./
RUN npm install --no-audit --no-fund

# Schema first so `prisma generate` has what it needs before bringing the
# rest of the source. Splitting the COPYs keeps Docker layer caching useful
# when only source changes.
COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# --- runtime --------------------------------------------------------------
FROM node:20-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

# Carry over the compiled app, deps, and prisma assets needed at runtime
# (the migrations directory is required by `prisma migrate deploy`).
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

# Railway sets $PORT; main.ts reads it. EXPOSE is documentation only.
EXPOSE 3000

# Run pending migrations, then boot. Migrations are idempotent — a no-op
# on subsequent deploys when nothing has changed.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
