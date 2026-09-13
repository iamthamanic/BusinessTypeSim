# Feature: GLM-5.3-Flash default + routing

## Intent
Production default is glm-5.3-flash:cloud; fallback glm-5.3:cloud after repair/complexity. gpt-oss is eval baseline only.

## Happy Path
- [x] LLM_MODEL / Compose / Docs default Flash; FALLBACK GLM-5.3
- [x] Routing matrix Flash for advisor/QA/decision/DQ/narration/debrief; escalate after repair
- [x] Eval harness ≥200 German fixtures
- [x] No VITE_ secrets; model IDs not in domain
- [x] zero type escape hatches

## Composition Gate
CLEAR — see `.qa/runs/composition-gate-glm-flash-routing.md`
