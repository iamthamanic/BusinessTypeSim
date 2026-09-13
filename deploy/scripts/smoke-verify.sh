#!/usr/bin/env bash
# Post-deploy smoke checks for Business Type on Hostinger KVM2.
# Exit 0 only if web + api health endpoints respond OK and compose services are healthy.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEPLOY="$ROOT/deploy"
cd "$DEPLOY"

if [[ -f .env ]]; then
  # shellcheck disable=SC1091
  set -a
  source .env
  set +a
fi

WEB_PORT="${WEB_PORT:-8088}"
BASE_URL="${SMOKE_BASE_URL:-http://127.0.0.1:${WEB_PORT}}"
PUBLIC_HOST="${PUBLIC_HOST:-businesstypesim.raccoova.com}"
FAIL=0

pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1" >&2; FAIL=1; }

echo "Smoke verify against $BASE_URL"

if ! docker compose --env-file .env ps --format json 2>/dev/null | head -n1 >/dev/null; then
  # Older compose: fall back to plain ps
  docker compose --env-file .env ps
fi

# Expect healthy / running services
for svc in db api web; do
  status="$(docker compose --env-file .env ps --status running -q "$svc" 2>/dev/null || true)"
  if [[ -n "$status" ]]; then
    pass "service $svc running"
  else
    # compose v2 may need service filter differently
    if docker compose --env-file .env ps "$svc" 2>/dev/null | grep -Eq 'running|Up'; then
      pass "service $svc up"
    else
      fail "service $svc not running"
    fi
  fi
done

check_http() {
  local name="$1" url="$2" expect="${3:-ok}"
  local body code
  body="$(curl -fsS --max-time 10 "$url" 2>/dev/null || true)"
  code="$?"
  if [[ "$code" -eq 0 && "$body" == *"$expect"* ]]; then
    pass "$name ($url)"
  else
    fail "$name ($url) body=${body:0:80}"
  fi
}

check_http "web /healthz" "${BASE_URL}/healthz" "ok"
check_http "api via nginx /api/healthz" "${BASE_URL}/api/healthz" "ok"

# Optional public HTTPS (skip if unreachable from this host)
if [[ "${SMOKE_CHECK_PUBLIC:-0}" == "1" ]]; then
  check_http "public HTTPS /healthz" "https://${PUBLIC_HOST}/healthz" "ok"
  check_http "public HTTPS /api/healthz" "https://${PUBLIC_HOST}/api/healthz" "ok"
fi

# Disk headroom hint (non-fatal warning)
DISK_USE="$(df -P "$DEPLOY" | awk 'NR==2 {gsub(/%/,"",$5); print $5}')"
if [[ -n "$DISK_USE" && "$DISK_USE" -ge 90 ]]; then
  fail "disk usage ${DISK_USE}% (>=90 critical)"
elif [[ -n "$DISK_USE" && "$DISK_USE" -ge 80 ]]; then
  echo "WARN  disk usage ${DISK_USE}% (>=80 alert threshold)"
else
  pass "disk usage ${DISK_USE:-unknown}%"
fi

if [[ "$FAIL" -ne 0 ]]; then
  echo "Smoke verify FAILED" >&2
  exit 1
fi
echo "Smoke verify OK"
