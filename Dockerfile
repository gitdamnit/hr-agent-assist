FROM node:20-alpine AS base
WORKDIR /app

# ── Dependencies stage ──────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ── Builder stage ──────────────────────────────────────────────────────────────
FROM base AS builder
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Runner stage ───────────────────────────────────────────────────────────────
FROM base AS runner

RUN apk add --no-cache dumb-init ca-certificates curl \
  && addgroup -g 1001 -S nodejs \
  && adduser -S nodejs -u 1001

# Copy built server (dist/index.cjs)
COPY --from=builder /app/dist ./dist
# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy built client (dist/public → ./public so server/static.ts resolves to ./public)
COPY --from=builder /app/dist/public ./public

USER nodejs

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.cjs"]