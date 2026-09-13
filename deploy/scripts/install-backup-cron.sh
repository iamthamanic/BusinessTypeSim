#!/usr/bin/env bash
# Install a daily cron entry for encrypted Postgres backups (Hostinger KVM2).
# Idempotent: replaces prior Business Type backup lines.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BACKUP_SCRIPT="$ROOT/deploy/scripts/backup-postgres.sh"
CRON_MARKER="# businesstype-sim-postgres-backup"
CRON_HOUR="${BACKUP_CRON_HOUR:-3}"
LOG_FILE="${BACKUP_LOG_FILE:-/var/log/businesstype-backup.log}"

chmod +x "$BACKUP_SCRIPT" \
  "$ROOT/deploy/scripts/restore-postgres.sh" \
  "$ROOT/deploy/scripts/apply-migrations.sh" \
  "$ROOT/deploy/scripts/smoke-verify.sh"

touch "$LOG_FILE"
chmod 640 "$LOG_FILE" || true

LINE="${CRON_HOUR} 0 * * * ${BACKUP_SCRIPT} >>${LOG_FILE} 2>&1 ${CRON_MARKER}"
EXISTING="$(crontab -l 2>/dev/null || true)"
FILTERED="$(printf '%s\n' "$EXISTING" | grep -v "$CRON_MARKER" || true)"
printf '%s\n%s\n' "$FILTERED" "$LINE" | crontab -

echo "Installed daily backup at ${CRON_HOUR}:00 UTC (marker: $CRON_MARKER)"
echo "Ensure deploy/.env has BACKUP_ENCRYPTION_KEY and optional OFFSITE_BACKUP_CMD."
echo "Alerting: monitor $LOG_FILE for non-zero exit / missing daily lines (see docs/KVM2_OPS.md)."
