# Exact GitHub Actions secret names for Hostinger deploy.
# Repo → Settings → Secrets and variables → Actions → New repository secret

## Required (pipeline fails without these)

| Secret name | Example / notes |
|---|---|
| `VPS_HOST` | IP or hostname, e.g. `192.0.2.10` or `vps.example.com` |
| `VPS_USER` | SSH user, usually `root` |
| `VPS_SSH_KEY` | **Private** SSH key (full PEM, including `BEGIN`/`END` lines). Public key must be in `~/.ssh/authorized_keys` on the VPS |
| `VPS_DEPLOY_PATH` | Absolute path on VPS, e.g. `/opt/businesstype-sim` |
| `POSTGRES_PASSWORD` | Strong DB password |
| `JWT_SECRET` | Long random string (e.g. `openssl rand -hex 32`) |
| `OLLAMA_API_KEY` | From https://ollama.com/settings/keys |

## Optional (defaults apply if unset)

| Secret name | Default if missing | Notes |
|---|---|---|
| `VPS_SSH_PORT` | `22` | Custom SSH port |
| `POSTGRES_USER` | `businesstype` | DB user |
| `POSTGRES_DB` | `businesstype` | DB name |
| `VITE_API_URL` | `/api` | Use full URL only if Capacitor/web is not same-origin, e.g. `https://game.example.com/api` |
| `WEB_PORT` | `8088` | Host port for nginx (keep off n8n `5678`) |
| `PUBLIC_HOST` | `businesstypesim.raccoova.com` | Traefik `Host()` rule for HTTPS |
| `CORS_ORIGIN` | `https://businesstypesim.raccoova.com` | Tighten to the public HTTPS origin |
| `TAVILY_API_KEY` | empty | Real-world debrief; omit if unused |
| `LLM_BASE_URL` | `https://ollama.com/v1` | |
| `LLM_MODEL` | `gpt-oss:120b` | |
| `LLM_FALLBACK_MODEL` | `llama3.1:8b` | |
| `LLM_TIMEOUT_MS` | `25000` | |
| `AI_HOURLY_LIMIT` | `30` | |

## One-time VPS prep

```bash
# On the VPS
sudo mkdir -p /opt/businesstype-sim
# Install Docker + Compose plugin if not already present
# Add the GitHub deploy public key to authorized_keys for VPS_USER
# Ensure git is installed; first deploy clones the repo into VPS_DEPLOY_PATH
```

Repo must be **reachable** from the VPS (`git clone` over HTTPS). For a private GitHub repo, either:

- use a deploy key / machine user with read access, or  
- make the repo public for clone, or  
- switch the workflow later to `rsync` instead of `git clone`.

## Trigger

- Push to `main`, or  
- Actions → **Deploy Hostinger** → Run workflow  

Workflow file: `.github/workflows/deploy-hostinger.yml`
