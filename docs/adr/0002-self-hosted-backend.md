# ADR-0002 — Self-hosted Postgres + API (Hostinger)

Status: Accepted

## Context
Cloud runs need Auth, ownership-scoped persistence, authoritative game mutations, and server-side LLM/search. Full self-hosted Supabase is too heavy next to n8n on a Hostinger KVM2. Managed Supabase is out of scope for this deploy path.

## Decision
Ship a thin stack:

1. `postgres:16` for users + `game_runs` + AI rate windows
2. Node/Hono API (`server/`) for JWT auth, game, AI, debrief
3. nginx SPA (`deploy/`) proxying `/api` to the API

Pure simulation domain lives under `shared/domain/` and is imported by the web app and the API. No Supabase runtime.

## Consequences
Fewer containers and lower RAM than Supabase docker. Operator owns secrets (`JWT_SECRET`, `OLLAMA_API_KEY`). Email+password auth with verification/reset via provider-neutral mail adapter (console/capture in MVP; no SMTP required). Short-lived access JWT + rotating refresh sessions; Web uses HttpOnly Secure SameSite cookies, native Capacitor Preferences (upgrade to Secure Storage/Keychain). Capacitor apps talk to the public `/api` URL.
