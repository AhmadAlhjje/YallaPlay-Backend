# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./
COPY packages/config/ ./packages/config/
COPY packages/shared-types/package.json ./packages/shared-types/

# Install all deps (including devDependencies needed for build)
RUN npm ci

# Copy shared-types source and build it
COPY packages/shared-types/src ./packages/shared-types/src
COPY packages/shared-types/tsconfig.json ./packages/shared-types/

RUN npm --prefix packages/shared-types run build

# Copy remaining source and build the API
COPY . .

RUN npm run build

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./
COPY packages/config/ ./packages/config/
COPY packages/shared-types/package.json ./packages/shared-types/

# Install production deps only
RUN npm ci --omit=dev

# Copy built shared-types from builder
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist

# Copy built API output
COPY --from=builder /app/dist ./dist

EXPOSE 7600

CMD ["node", "dist/main"]
