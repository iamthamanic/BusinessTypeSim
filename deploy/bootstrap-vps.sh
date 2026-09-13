#!/usr/bin/env bash
# Start Business Type on Hostinger KVM2 (web + api + postgres).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY="$ROOT/deploy"

if [[ ! -f "$DEPLOY/.env" ]]; then
  cp "$DEPLOY/.env.example" "$DEPLOY/.env"
  echo "Created deploy/.env — set POSTGRES_PASSWORD, JWT_SECRET, OLLAMA_API_KEY, then re-run."
  exit 1
fi

cd "$DEPLOY"
docker compose --env-file .env up -d --build
echo "Up. Open http://YOUR_VPS_IP:${WEB_PORT:-8088}"
