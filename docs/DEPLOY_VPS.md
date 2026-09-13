# Hostinger KVM2 deploy — thin self-host (web + api + postgres), no managed Supabase

## Architecture

```text
Browser / Capacitor
        |
        v
   nginx :8088  (web)
    |       |
    |       +--> static SPA
    +--> /api/* --> api :3000 (Hono)
                        |
                        +--> postgres :5432 (internal)
                        +--> Ollama Cloud (external HTTPS)
```

Three containers, intended to run **beside n8n** (default web port **8088**, not 5678).

## Quick start on the VPS

```bash
cd deploy
cp .env.example .env
# set POSTGRES_PASSWORD, JWT_SECRET, OLLAMA_API_KEY
docker compose --env-file .env up -d --build
```

Open `http://YOUR_VPS_IP:8088` (or your reverse-proxy domain).

1. **Registrieren** with email + password (min. 8)
2. Start a **Cloud-Run** or play **Demo lokal** without account

## Env essentials

| Variable | Where | Purpose |
|---|---|---|
| `VITE_API_URL` | web build | usually `/api` (same origin via nginx) |
| `POSTGRES_PASSWORD` | compose | DB password |
| `JWT_SECRET` | api | session signing |
| `OLLAMA_API_KEY` | api | [Ollama Cloud key](https://ollama.com/settings/keys) |
| `TAVILY_API_KEY` | api | optional debrief |

## RAM note (KVM2 + n8n)

Rough footprint: Postgres ~100–200MB, API ~80–150MB, nginx web ~10–30MB.  
Much lighter than full self-hosted Supabase. Still monitor with `docker stats` next to n8n.

## Capacitor

Rebuild web with a **public** API URL if the app is not same-origin:

```bash
VITE_API_URL=https://game.your-domain.tld/api npm run build
npx cap sync
```

## Local API development

```bash
cd server && npm install && DATABASE_URL=... JWT_SECRET=dev npm run dev
# other terminal
VITE_API_URL=/api npm run dev   # Vite proxies /api -> :3000
```

## TLS

On this Hostinger box **Traefik already terminates HTTPS** (ports 80/443, Let's Encrypt TLS-ALPN). The `web` service carries Traefik labels for:

`https://businesstypesim.raccoova.com` → container port 80 (same stack as `/api` via nginx).

Set `PUBLIC_HOST` in `deploy/.env` if the hostname changes. Direct IP access remains on `:8088`. Do not publish Postgres.

## Automatic deploy (recommended)

Every **push to `main`** runs `.github/workflows/deploy-hostinger.yml`:

1. `npm run checks` (+ server typecheck)
2. SSH to the VPS, `git checkout` the pushed SHA
3. rewrite `deploy/.env` from GitHub Secrets
4. `docker compose up -d --build` (new logos/UI are in the web image)

**Local-only edits are invisible on the live site until they are committed and pushed.**

Manual run: GitHub → Actions → **Deploy Hostinger** → Run workflow.

Full secret name list: [`docs/GITHUB_SECRETS.md`](GITHUB_SECRETS.md)
