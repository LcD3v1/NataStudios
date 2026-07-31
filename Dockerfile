# ─────────────────────────────────────────────────────────────
#  NATA STUDIOS — production image (multi-stage)
#  Runs the Next.js standalone server. SQLite lives on a mounted
#  volume at /data so it survives rebuilds/redeploys.
# ─────────────────────────────────────────────────────────────

# ---------- 1. deps ----------
FROM node:22-alpine AS deps
WORKDIR /app
# libc6-compat helps some native deps (sharp) on Alpine
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
COPY prisma ./prisma
# Allow install scripts here so Prisma engines + sharp binaries are fetched
RUN npm ci --ignore-scripts=false

# ---------- 2. build ----------
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# DATABASE_URL is only needed for `prisma generate` to resolve the provider.
ENV DATABASE_URL="file:/data/prod.db"
ENV NEXT_TELEMETRY_DISABLED=1
# Produce the self-contained standalone server for this image.
ENV BUILD_STANDALONE=1
RUN npx prisma generate
RUN npm run build

# ---------- 3. runtime ----------
FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# SQLite file on the persistent volume
ENV DATABASE_URL="file:/data/prod.db"

# Run as an unprivileged user (least privilege).
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Standalone output: server + minimal node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma CLI + schema + seed, so we can run migrations inside the container
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/bcryptjs ./node_modules/bcryptjs

# Persistent data directory (mounted volume)
RUN mkdir -p /data && chown nextjs:nodejs /data
VOLUME /data

USER nextjs
EXPOSE 3000

# Apply the schema to the SQLite file on start, then boot the server.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js db push --skip-generate && node server.js"]
