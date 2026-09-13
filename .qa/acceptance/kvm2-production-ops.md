# Feature: KVM2 production ops (Hostinger beside n8n)

<!-- refined by @implement from issue #13 on 2026-09-13 — slug kvm2-production-ops -->

## Intent
Der bewusst schlanke Hono/Postgres-Web-Stack bleibt auf demselben Hostinger KVM2 wie n8n. Business Type braucht explizite Ressourcenlimits, Offsite-Backups, Restore-Proben, Monitoring, Log-/Disk-Hygiene und einen dokumentierten Betriebs-/Recovery-Pfad, ohne den Host mit einer schwereren Plattform zu belasten.

## Preconditions
- Docker Compose Stack unter `deploy/` (web + api + postgres); Traefik terminiert TLS auf dem Host.
- n8n nutzt Port `5678`; BT-Web bleibt auf `WEB_PORT` (Default `8088`).
- Secrets laut [`docs/GITHUB_SECRETS.md`](../../docs/GITHUB_SECRETS.md) gesetzt; Ops-Runbook [`docs/KVM2_OPS.md`](../../docs/KVM2_OPS.md).
- Auth-Migrationen `001_init` + `002_auth_harden` existieren unter `server/sql/`.

## Happy Path
- [ ] `deploy/docker-compose.yml` setzt sinnvolle CPU/RAM/PID-Limits, Healthchecks, `restart: unless-stopped` und JSON-Log-Rotation für `db` / `api` / `web`, ohne n8n-Ports oder dessen Volumes zu kollidieren.
- [ ] Tägliches Postgres-Backup-Skript schreibt AES-verschlüsselte Dumps; Offsite-Ziel, Retention und Fehleralarm sind in `docs/KVM2_OPS.md` dokumentiert.
- [ ] Restore-Skript + Runbook rekonstruieren Schema + Runs auf leerer DB; Credential-Rotation nach Host-Kompromittierung ist beschrieben.
- [ ] Monitoring-/Alert-Notizen decken RAM, CPU, Disk, Container-Restarts, Postgres-Connections, API-Latency und Disk-Wachstum (BT + n8n) mit begründeten Schwellen ab.
- [ ] `deploy/bootstrap-vps.sh` startet den Stack und wendet Auth-SQL idempotent an, falls Tabellen/Spalten fehlen.
- [ ] `deploy/scripts/smoke-verify.sh` prüft post-deploy Health (web + api) und ist im Deploy-Workflow verdrahtet.
- [ ] Touched files: zero type escape hatches (typed-strict / Boy Scout).

## Edge Cases
- [ ] Disk füllt sich durch n8n Execution Data oder Docker Logs → Log-Rotation + Cleanup-Policy greifen; Alerts bei ≥80 % Disk.
- [ ] API/AI-Spike darf n8n nicht den gesamten RAM entziehen → Compose Memory-Limits an BT-Services.
- [ ] Backup ok, Restore inkonsistent/zu alt → Runbook fordert Restore-Probe und Retention-Fenster.
- [ ] Container restartet wiederholt → Restart-Loop-Alert (≥3 Restarts / 15 min); Healthcheck fail stoppt Traffic-Abhängigkeiten.
- [ ] OPS-01: Postgres-Port bleibt unpublished; nur Traefik/web/api wie dokumentiert exponiert.
- [ ] OPS-02: Backup-Dateinamen/Logs enthalten keine Klartext-Secrets.

## Regression
- [ ] `npm run checks` bleibt grün (docs/ops-heavy Slice).
- [ ] Bestehender Deploy-Pfad (push `main` → Hostinger) bleibt nutzbar; Secrets-Namen abwärtskompatibel.
- [ ] Auth-Happy-Path und Cloud-Runs unverändert, solange Migrationen idempotent bleiben.

## Security Coverage
| ID | Applicable | How satisfied |
|----|------------|---------------|
| B-07 | yes | Least privilege: DB internal-only; no public Postgres port |
| P-01 | partial | Ops doc notes dependency audit before ship; no new heavy deps |
| P-02 | yes | Smoke/backup scripts avoid dumping secrets; fatal errors stay short |
| F-05 | yes | Provider secrets stay in `deploy/.env` / GH Secrets, never `VITE_*` |
| B-03 | yes | Deploy still requires auth secrets; no anonymous stack mutation |
| F-01 | yes | Traefik HTTPS path unchanged; ops docs reinforce TLS |

## Assumptions
- Ressourcenlimits basieren auf dokumentiertem Footprint (DEPLOY_VPS RAM note) + Headroom für n8n; Feintuning nach `docker stats` auf dem Live-KVM2.
- Offsite-Ziel ist Operator-gewählt (SCP/Rsync/S3); Skript liefert verschlüsselte Datei + optionales `OFFSITE_BACKUP_CMD`.
- Kein neues Monitoring-Produkt im Compose-Stack (Host-Tools / bestehende Uptime-Checks reichen für MVP ops).

## Screenshots
| Step | Filename |
|------|----------|
| 1 | `01-compose-ps-healthy.png` |
| 2 | `02-smoke-verify.png` |
| 3 | `03-backup-encrypted.png` |

## Implementation Notes
- Compose: `mem_limit` / `cpus` / `pids_limit`, healthchecks, json-file log rotation (`10m`×3) on `db`/`api`/`web`; `web` depends on healthy `api`.
- Scripts: `deploy/scripts/{backup,restore}-postgres.sh`, `apply-migrations.sh`, `smoke-verify.sh`, `install-backup-cron.sh`; bootstrap runs migrate + smoke.
- Docs: `docs/KVM2_OPS.md` (limits, backup/restore, monitoring thresholds, rollback); `DEPLOY_VPS.md` + `GITHUB_SECRETS.md` extended (checklist, VPS-only backup keys, preserve ops env on deploy).
- Workflow: `cancel-in-progress: false`, strict host key check, require `VPS_USER`/`VPS_DEPLOY_PATH`, merge `BACKUP_*` lines across env rewrite, post-deploy migrate + smoke.
- Migrations: API still migrates on boot; bootstrap/deploy also apply `server/sql/001`+`002` via psql for auth harden if missing.
