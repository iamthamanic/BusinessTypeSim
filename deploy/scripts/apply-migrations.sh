#!/usr/bin/env bash
# Idempotent apply of server/sql/*.sql into the compose Postgres service.
# Safe to re-run (migrations use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEPLOY="$ROOT/deploy"
SQL_DIR="$ROOT/server/sql"

cd "$DEPLOY"
# shellcheck disable=SC1091
set -a
source .env
set +a

USER_NAME="${POSTGRES_USER:-businesstype}"
DB_NAME="${POSTGRES_DB:-businesstype}"

echo "Waiting for db health…"
for _ in $(seq 1 60); do
  if docker compose --env-file .env exec -T db pg_isready -U "$USER_NAME" -d "$DB_NAME" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

docker compose --env-file .env exec -T db pg_isready -U "$USER_NAME" -d "$DB_NAME" >/dev/null

shopt -s nullglob
files=("$SQL_DIR"/[0-9][0-9][0-9]_*.sql)
if [[ ${#files[@]} -eq 0 ]]; then
  echo "No SQL migrations under $SQL_DIR" >&2
  exit 1
fi

for file in "${files[@]}"; do
  base="$(basename "$file")"
  echo "Applying $base…"
  docker compose --env-file .env exec -T db \
    psql -v ON_ERROR_STOP=1 -U "$USER_NAME" -d "$DB_NAME" <"$file"
done

echo "Migrations applied."
