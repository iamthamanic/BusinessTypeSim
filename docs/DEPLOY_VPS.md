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

Put Caddy/Traefik/nginx on the host in front of `:8088`. Do not publish Postgres.

## GitHub Actions deploy

CI writes `deploy/.env` from GitHub Secrets and runs `docker compose up` on the VPS.

Full secret name list: [`docs/GITHUB_SECRETS.md`](GITHUB_SECRETS.md)

Workflow: `.github/workflows/deploy-hostinger.yml` (push to `main` or manual).
