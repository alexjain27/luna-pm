FROM node:22-alpine AS base
WORKDIR /app

# ── Stage 1: install all dependencies ────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: build the Next.js app ───────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ── Stage 3: production runtime ──────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Standalone Next.js server (output: 'standalone' in next.config.ts)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma schema + migration files — needed at container startup
COPY --from=builder /app/prisma ./prisma

# Copy full node_modules from builder so `prisma migrate deploy` has all its
# transitive deps available. The standalone server uses its own embedded
# node_modules inside .next/standalone, so this only adds size — not conflict.
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

# Run pending migrations then start the app.
# `prisma migrate deploy` is non-interactive and safe to run on every deploy.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
