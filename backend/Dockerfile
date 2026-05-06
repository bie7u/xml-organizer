# ── Stage 1: build TypeScript ─────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Stage 2: production image ─────────────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app

# Install only production dependencies (also recompiles native modules like
# better-sqlite3 for the correct platform/arch).
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3001

CMD ["node", "dist/index.js"]
