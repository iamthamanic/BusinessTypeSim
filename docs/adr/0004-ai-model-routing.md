# ADR-0004 — Ollama Cloud as default LLM provider

Status: Accepted

## Context
Advisor answers and decision interpretation need an OpenAI-compatible chat endpoint. Secrets must stay server-side (Edge Functions). Operators should be able to paste an API key on a self-hosted VPS without binding the product to a single closed vendor SDK.

## Decision
Default provider is **Ollama Cloud** via `https://ollama.com/v1` (OpenAI-compatible `/chat/completions`).

Configuration (Edge Function env only):

- `OLLAMA_API_KEY` (preferred) or `LLM_API_KEY`
- `LLM_BASE_URL` default `https://ollama.com/v1`
- `LLM_MODEL` default `gpt-oss:120b`
- `LLM_FALLBACK_MODEL` default `llama3.1:8b`

Shared adapter: `server/src/llm.ts` (Hostinger API).

## Consequences
Any OpenAI-compatible endpoint can be swapped by changing env (including self-hosted Ollama at `http://host:11434/v1`). Production quality still requires Business-Type evals; model IDs are configuration, not domain imports.
