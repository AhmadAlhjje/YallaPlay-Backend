#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# YallaPlay — VPS Deployment Script
# Run once on first deploy, then run again on every update.
# Usage:  chmod +x deploy.sh && ./deploy.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[deploy]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC}   $1"; }
fail() { echo -e "${RED}[error]${NC}  $1"; exit 1; }

# ── 1. Verify required files ──────────────────────────────────────────────────
log "Checking required files..."
[ -f ".env.production" ] || fail ".env.production not found. Copy it to the server first."
[ -f "docker-compose.yml" ]  || fail "docker-compose.yml not found."
[ -f "nginx/default.conf" ]  || fail "nginx/default.conf not found."

# ── 2. Open firewall ports ────────────────────────────────────────────────────
log "Configuring firewall..."
if command -v ufw &>/dev/null; then
  ufw allow 22/tcp   comment "SSH"    2>/dev/null || true
  ufw allow 80/tcp   comment "HTTP"   2>/dev/null || true
  ufw allow 443/tcp  comment "HTTPS"  2>/dev/null || true
  # Block direct access to NestJS and MongoDB ports from the internet
  ufw deny  7000/tcp 2>/dev/null || true
  ufw deny  27017/tcp 2>/dev/null || true
  ufw deny  6379/tcp  2>/dev/null || true
  ufw --force enable
  log "Firewall: ports 80 and 443 open. Ports 7000/27017/6379 blocked externally."
else
  warn "ufw not found — skipping firewall configuration."
fi

# ── 3. Load env vars for docker-compose variable substitution ────────────────
log "Loading .env.production..."
set -a
# shellcheck source=.env.production
source .env.production
set +a

# ── 4. Ensure Docker is running ───────────────────────────────────────────────
log "Checking Docker..."
docker info &>/dev/null || fail "Docker is not running. Start it first: systemctl start docker"

# ── 5. Pull latest images ─────────────────────────────────────────────────────
log "Pulling base images (mongo, redis, nginx)..."
docker compose pull mongo redis nginx

# ── 5. Build NestJS image ─────────────────────────────────────────────────────
log "Building NestJS API image..."
docker compose build --no-cache api

# ── 6. Start all services ─────────────────────────────────────────────────────
log "Starting all services..."
docker compose up -d

# ── 7. Wait for health checks ─────────────────────────────────────────────────
log "Waiting for services to become healthy..."
MAX_WAIT=120
ELAPSED=0
until docker inspect --format='{{.State.Health.Status}}' yallaplay_api 2>/dev/null | grep -q "healthy"; do
  sleep 5
  ELAPSED=$((ELAPSED + 5))
  if [ $ELAPSED -ge $MAX_WAIT ]; then
    warn "API health check timed out. Showing logs:"
    docker compose logs --tail=50 api
    fail "API did not become healthy within ${MAX_WAIT}s."
  fi
  echo -n "."
done
echo ""

# ── 8. Verify nginx is up ─────────────────────────────────────────────────────
log "Verifying nginx is reachable..."
sleep 2
if curl -sf http://localhost/health | grep -q '"status":"ok"'; then
  log "Health check passed ✓"
else
  warn "Health check failed — showing nginx logs:"
  docker compose logs --tail=30 nginx
fi

# ── 9. Summary ────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  YallaPlay deployed successfully!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
echo "  API (internal):  http://localhost:7000/api/v1"
echo "  API (external):  http://$(curl -sf ifconfig.me 2>/dev/null || echo '<server-ip>')/api/v1"
echo "  Health check:    http://$(curl -sf ifconfig.me 2>/dev/null || echo '<server-ip>')/health"
echo ""
echo "  Useful commands:"
echo "    docker compose logs -f api     → live API logs"
echo "    docker compose logs -f nginx   → live nginx logs"
echo "    docker compose ps              → service status"
echo "    docker compose down            → stop everything"
echo ""
