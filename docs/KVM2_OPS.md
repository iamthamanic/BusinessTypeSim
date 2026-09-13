# Hostinger KVM2 — production ops for Business Type beside n8n

Companion to [`DEPLOY_VPS.md`](DEPLOY_VPS.md) and ADR-0002. Goal: operate, monitor, back up, and restore the thin stack **without** starving n8n or introducing Kubernetes/Supabase.

## Resource envelope (compose)

Limits in `deploy/docker-compose.yml` (tune after live `docker stats`):

| Service | mem_limit | cpus | pids_limit | Rationale |
|---|---|---|---|---|
| `db` | 384M | 0.50 | 200 | Steady ~100–200MB; cap prevents unbounded shared_buffers growth from eating n8n RAM |
| `api` | 512M | 0.75 | 256 | Steady ~80–150MB; headroom for concurrent LLM proxy spikes |
| `web` | 64M | 0.25 | 64 | Static nginx; tiny |

Total BT budget ≈ **1 GB RAM / 1.5 CPU** reserved upper bound — leave the rest of the KVM2 for n8n + Traefik + OS.

**Do not** publish Postgres. Keep `WEB_PORT` off n8n (`5678`).

Healthchecks: `db` (`pg_isready`), `api` (`GET /healthz`), `web` (`GET /healthz`). `web` waits for healthy `api`; `api` waits for healthy `db`.

## Logging & disk hygiene

Compose uses `json-file` logging with `max-size: 10m` / `max-file: 3` per BT service (~90 MB worst-case BT logs).

On the host (shared with n8n), schedule periodically:

```bash
# Weekly — unused images/build cache (does not touch volumes)
docker image prune -af
docker builder prune -af --filter until=168h

# Inspect volume growth
docker system df -v
du -sh /var/lib/docker/volumes/*n8n* /var/lib/docker/volumes/*bt* 2>/dev/null || true
```

n8n execution data is the usual disk filler — prune n8n executions per n8n docs; BT `bt_pgdata` grows with runs/users (watch weekly).

## Backups (encrypted + offsite)

Scripts (run on the VPS from the repo checkout):

| Script | Purpose |
|---|---|
| `deploy/scripts/backup-postgres.sh` | `pg_dump` → AES-256-CBC (`openssl`, PBKDF2) → local dir |
| `deploy/scripts/restore-postgres.sh` | Decrypt + `psql` + re-apply migrations |
| `deploy/scripts/install-backup-cron.sh` | Daily cron (default 03:00) |
| `deploy/scripts/apply-migrations.sh` | Idempotent `001`/`002` SQL |

### One-time setup

1. Add to `deploy/.env` (never commit):

```bash
BACKUP_ENCRYPTION_KEY="$(openssl rand -hex 32)"
# Optional: command that receives the .enc path as $1
# OFFSITE_BACKUP_CMD='scp -i /root/.ssh/backup_key "$1" backup@offsite.example:/bt/'
BACKUP_DIR=/var/backups/businesstype
BACKUP_RETENTION_DAYS=14
```

2. Store `BACKUP_ENCRYPTION_KEY` in a **password manager / off-box vault** (loss = unrestorable dumps).

3. Install cron: `./deploy/scripts/install-backup-cron.sh`

4. Confirm a file appears under `$BACKUP_DIR` and that offsite copy succeeds.

### Retention & failure alert

- Local encrypted files older than `BACKUP_RETENTION_DAYS` (default **14**) are deleted after a successful run.
- Offsite retention: configure on the destination (≥14 days recommended; keep one monthly for 90 days if disk allows).
- **Alert if** backup log (`/var/log/businesstype-backup.log`) has no successful line in 36 h, or cron exit ≠ 0 — wire to email/Telegram/n8n webhook of your choice.

Backup filenames are timestamps only (`bt-pg-YYYYMMDDTHHMMSSZ.sql.enc`) — no passwords in names or stdout.

## Restore runbook (drill)

Quarterly restore probe on a **throwaway** volume (preferred) or staging DB:

1. Stop API traffic if restoring production: `docker compose --env-file .env stop api web`
2. Prefer new volume: rename/remove `bt_pgdata`, `docker compose up -d db`, wait healthy.
3. `./deploy/scripts/restore-postgres.sh /var/backups/businesstype/bt-pg-….sql.enc`
4. Start api/web; `./deploy/scripts/smoke-verify.sh`
5. Spot-check: login + open a known `game_runs` id.
6. Record drill date in your ops log.

### After compromised host

1. Rotate `POSTGRES_PASSWORD`, `JWT_SECRET`, `OLLAMA_API_KEY`, `BACKUP_ENCRYPTION_KEY`, SSH keys, GitHub deploy key.
2. Restore DB from **offsite** backup (assume on-box copies are suspect).
3. Revoke all refresh sessions (password reset / re-login) — new `JWT_SECRET` invalidates access JWTs; re-issue via login after verify.
4. Redeploy from a known-good git SHA; re-run smoke verify.

## Monitoring & alerts

No extra containers in the BT compose file (keeps KVM2 light). Use host tools (`docker stats`, `df`, existing Uptime Kuma / Netdata / Traefik metrics if present).

| Signal | Warn | Critical | Notes |
|---|---|---|---|
| Host disk used | ≥80 % | ≥90 % | n8n executions + Docker logs usual cause |
| Host RAM available | <15 % free | <8 % free / OOM kills | Check `docker stats` BT vs n8n |
| Host CPU sustained 10 m | >85 % | >95 % | Correlate with AI spike vs n8n |
| Container restarts (15 m) | ≥2 | ≥3 (restart loop) | `docker inspect` / `docker events` |
| Postgres connections | >70 % `max_connections` | >85 % | API pool `max: 10`; spike ⇒ leak/abuse |
| API latency `GET /api/healthz` | p99 >1 s | p99 >2 s or downtime | External uptime check every 60 s |
| Disk growth `bt_pgdata` / n8n volumes | >2 GB / week unexplained | accelerating | Investigate retention/prunes |
| Backup freshness | >24 h | >36 h | See backup log |

Suggested external checks: HTTPS `https://$PUBLIC_HOST/healthz` and `…/api/healthz`.

## Deploy, rollback, recovery

### Deploy

- Automatic: push `main` → `.github/workflows/deploy-hostinger.yml` (checks → SSH → compose up → migrations → smoke).
- Manual: `./deploy/bootstrap-vps.sh` on the VPS.

### Rollback

```bash
cd "$VPS_DEPLOY_PATH"
git fetch --depth 1 origin <known-good-sha>
git checkout --force <known-good-sha>
cd deploy && docker compose --env-file .env up -d --build
./scripts/apply-migrations.sh   # forward-only SQL; do not expect down-migrations
./scripts/smoke-verify.sh
```

Schema migrations are **forward-only**. If a bad migration shipped, restore DB from backup taken **before** that deploy, then check out the good SHA.

### Post-deploy smoke

```bash
./deploy/scripts/smoke-verify.sh
# Optional public TLS from VPS:
SMOKE_CHECK_PUBLIC=1 ./deploy/scripts/smoke-verify.sh
```

## Secrets checklist

See [`GITHUB_SECRETS.md`](GITHUB_SECRETS.md) for CI names. On-box extras:

| Key | Where | Notes |
|---|---|---|
| `BACKUP_ENCRYPTION_KEY` | `deploy/.env` + vault | Required for backup/restore scripts |
| `OFFSITE_BACKUP_CMD` | `deploy/.env` | Optional upload hook |
| SSH backup key | host `~/.ssh` | Separate from GitHub deploy key if possible |
