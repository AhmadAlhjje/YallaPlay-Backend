# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install all deps for build
RUN npm ci

# Copy source
COPY . .

# Build NestJS app
RUN npm run build

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install production deps only
RUN npm ci --omit=dev

# Copy built output
COPY --from=builder /app/dist ./dist

EXPOSE 7600

CMD ["node", "dist/main"]
