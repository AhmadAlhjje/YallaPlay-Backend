# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-types/dist ./packages/shared-types/dist

# Install all deps for build
RUN npm ci

# Copy source
COPY . .

# Build shared-types, then API
RUN npm --prefix packages/shared-types run build
RUN npm run build

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-types/dist ./packages/shared-types/dist

# Install production deps only
RUN npm ci --omit=dev

# Copy built output
COPY --from=builder /app/dist ./dist

EXPOSE 7600

CMD ["node", "dist/main"]
