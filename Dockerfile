# ===================================================================
# Multi-stage build — scorestv-admin (Haber Editör Paneli, Next.js 16)
# scorestv_web Dockerfile'i ile AYNI desen (standalone).
# Panel'de NEXT_PUBLIC_* build arg'i YOK; tum config runtime env ile gelir:
#   - BACKEND_URL   (Spring backend'e ulasilan adres)
# Sonuc: ~120MB imaj.
# ===================================================================

# ---- Stage 1: deps ----
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci

# ---- Stage 2: builder ----
FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- Stage 3: runner ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# root degil — security best practice
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3200

# Next standalone server.js PORT/HOSTNAME env okur.
ENV PORT=3200 \
    HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:3200/login || exit 1

CMD ["node", "server.js"]
