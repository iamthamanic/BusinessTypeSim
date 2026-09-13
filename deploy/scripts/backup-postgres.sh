#!/usr/bin/env bash
# Encrypted Postgres dump for Business Type (Hostinger KVM2).
# Requires: deploy/.env with POSTGRES_* and BACKUP_ENCRYPTION_KEY.
# Optional: OFFSITE_BACKUP_CMD — shell command receiving the encrypted file path as $1.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEPLOY="$ROOT/deploy"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/businesstype}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
# Filename must not embed secrets — only timestamp + service id
OUT_PLAIN="$BACKUP_DIR/bt-pg-${STAMP}.sql"
OUT_ENC="$OUT_PLAIN.enc"

cd "$DEPLOY"
if [[ ! -f .env ]]; then
  echo "Missing deploy/.env" >&2
  exit 1
fi
# shellcheck disable=SC1091
set -a
source .env
set +a

: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD required}"
: "${BACKUP_ENCRYPTION_KEY:?BACKUP_ENCRYPTION_KEY required in deploy/.env}"

USER_NAME="${POSTGRES_USER:-businesstype}"
DB_NAME="${POSTGRES_DB:-businesstype}"

umask 077
mkdir -p "$BACKUP_DIR"

echo "Dumping database (logical)…"
docker compose --env-file .env exec -T db \
  pg_dump -U "$USER_NAME" -d "$DB_NAME" --no-owner --format=plain >"$OUT_PLAIN"

echo "Encrypting…"
openssl enc -aes-256-cbc -pbkdf2 -salt \
  -pass env:BACKUP_ENCRYPTION_KEY \
  -in "$OUT_PLAIN" -out "$OUT_ENC"
shred -u "$OUT_PLAIN" 2>/dev/null || rm -f "$OUT_PLAIN"

BYTES="$(wc -c <"$OUT_ENC" | tr -d ' ')"
echo "Wrote $OUT_ENC ($BYTES bytes)"

if [[ -n "${OFFSITE_BACKUP_CMD:-}" ]]; then
  echo "Running offsite command…"
  # Operator supplies e.g. 'scp "$1" backup@offsite:/bt/' — path is $1
  # shellcheck disable=SC2086
  eval "$OFFSITE_BACKUP_CMD" "$OUT_ENC"
fi

# Local retention of encrypted files only
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'bt-pg-*.sql.enc' -mtime +"$RETENTION_DAYS" -delete

echo "Backup OK. Retention ${RETENTION_DAYS}d under $BACKUP_DIR"
