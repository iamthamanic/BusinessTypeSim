# ADR-0004 — Ollama Cloud as default LLM provider

Status: Accepted (updated 2026-09-13)

## Context
Advisor answers and decision interpretation need an OpenAI-compatible chat endpoint. Secrets must stay server-side. Operators should be able to paste an API key on a self-hosted VPS without binding the product to a single closed vendor SDK.

## Decision
Default provider is **Ollama Cloud** via `https://ollama.com/v1` (OpenAI-compatible `/chat/completions`).

Configuration (API env only — never `VITE_*`):

- `OLLAMA_API_KEY` (preferred) or `LLM_API_KEY`
- `LLM_BASE_URL` default `https://ollama.com/v1`
- `LLM_MODEL` default `glm-5.3-flash:cloud`
- `LLM_FALLBACK_MODEL` default `glm-5.3:cloud`
- Eval baseline only: `gpt-oss:120b` (not a production default)

### Routing matrix
| Task | Default | After schema repair fail / complexity | Admin authoring |
|------|---------|----------------------------------------|-----------------|
| Advisor / Company QA / Decision interpret / DQ extraction / Narration / Debrief | Flash | GLM-5.3 | — |
| Admin / campaign authoring | — | — | GLM-5.3 |

Repair: attempt 1 Flash → attempt 2 Flash (schema repair) → attempt 3+ GLM-5.3.

Domain never imports model IDs. LLM never writes World State or final DQ scores.

## Consequences
Any OpenAI-compatible endpoint can be swapped by changing env. Production quality still requires Business-Type evals (`server/src/llm-eval-fixtures.ts`).
