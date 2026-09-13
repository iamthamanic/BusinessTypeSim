#!/usr/bin/env bash
# Start Business Type on Hostinger KVM2 (web + api + postgres).
# Also applies auth SQL migrations idempotently and runs smoke verify.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY="$ROOT/deploy"

chmod +x \
  "$DEPLOY/scripts/apply-migrations.sh" \
  "$DEPLOY/scripts/backup-postgres.sh" \
  "$DEPLOY/scripts/restore-postgres.sh" \
  "$DEPLOY/scripts/smoke-verify.sh" \
  "$DEPLOY/scripts/install-backup-cron.sh" \
  2>/dev/null || true

if [[ ! -f "$DEPLOY/.env" ]]; then
  cp "$DEPLOY/.env.example" "$DEPLOY/.env"
  echo "Created deploy/.env — set POSTGRES_PASSWORD, JWT_SECRET, OLLAMA_API_KEY, then re-run."
  exit 1
fi

cd "$DEPLOY"
# shellcheck disable=SC1091
set -a
source .env
set +a

docker compose --env-file .env up -d --build

echo "Waiting for healthy services…"
# Compose wait (v2.29+) — fall back to sleep + smoke if unavailable
if docker compose --env-file .env up -d --wait 2>/dev/null; then
  :
else
  sleep 15
fi

# Belt-and-suspenders: API migrates on boot; bootstrap still applies SQL if auth tables missing
"$DEPLOY/scripts/apply-migrations.sh"

"$DEPLOY/scripts/smoke-verify.sh"

echo "Up. Open http://YOUR_VPS_IP:${WEB_PORT:-8088} (or https://${PUBLIC_HOST:-businesstypesim.raccoova.com} via Traefik)."
echo "Ops: docs/KVM2_OPS.md — install daily backup with deploy/scripts/install-backup-cron.sh"
