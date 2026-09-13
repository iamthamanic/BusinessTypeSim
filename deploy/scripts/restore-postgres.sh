#!/usr/bin/env bash
# Restore an encrypted Business Type Postgres dump onto the compose `db` service.
# WARNING: replaces objects in POSTGRES_DB. Prefer restore onto a fresh volume for drills.
#
# Usage:
#   ./deploy/scripts/restore-postgres.sh /var/backups/businesstype/bt-pg-YYYYMMDDTHHMMSSZ.sql.enc
set -euo pipefail

ENC_FILE="${1:-}"
if [[ -z "$ENC_FILE" || ! -f "$ENC_FILE" ]]; then
  echo "Usage: $0 <path-to-bt-pg-*.sql.enc>" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEPLOY="$ROOT/deploy"
TMP_SQL="$(mktemp)"
trap 'rm -f "$TMP_SQL"' EXIT

cd "$DEPLOY"
# shellcheck disable=SC1091
set -a
source .env
set +a

: "${BACKUP_ENCRYPTION_KEY:?BACKUP_ENCRYPTION_KEY required in deploy/.env}"
USER_NAME="${POSTGRES_USER:-businesstype}"
DB_NAME="${POSTGRES_DB:-businesstype}"

echo "Decrypting…"
openssl enc -aes-256-cbc -pbkdf2 -d \
  -pass env:BACKUP_ENCRYPTION_KEY \
  -in "$ENC_FILE" -out "$TMP_SQL"

echo "Waiting for db…"
for _ in $(seq 1 60); do
  if docker compose --env-file .env exec -T db pg_isready -U "$USER_NAME" -d "$DB_NAME" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "Restoring into $DB_NAME (ON_ERROR_STOP)…"
docker compose --env-file .env exec -T db \
  psql -v ON_ERROR_STOP=1 -U "$USER_NAME" -d "$DB_NAME" <"$TMP_SQL"

echo "Re-applying numbered migrations (idempotent)…"
"$ROOT/deploy/scripts/apply-migrations.sh"

echo "Restore finished. Run smoke-verify.sh and spot-check a known run id."
