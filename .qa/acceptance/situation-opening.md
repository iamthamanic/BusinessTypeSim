# Acceptance — situation-opening

## Intent

Replace case-study-style `situation_briefing` with `situation_opening`: Adalbert opens a playable conversation (progressive short chat messages), not a complete business-school brief. Quest/countdown stay UI-only.

## Preconditions

- Active campaign situation exists for the run (or opening has a welcome fallback).
- Cloud AI path available for LLM; local/offline uses deterministic multi-message fallback.
- Scenario advisors are known (ids/roles/domains) for optional natural mentions.

## Happy Path

- [ ] New run seeds Adalbert with typing/pending state (no static title/context dump).
- [ ] Cloud path calls AI mode `situation_opening` (not `situation_briefing`).
- [ ] Response is structured: 2–4 `messages`, optional `decisionPrompt`, 0–3 `relevantAdvisorIds` from real advisors only.
- [ ] Messages appear sequentially via existing chat typing/stream (not one wall of text).
- [ ] Optional decision prompt is the last conversational beat (open management question, not A/B/C).
- [ ] Opening uses only player-visible context; no hidden/system-only fields in the prompt payload.
- [ ] Adalbert never mentions Quest, countdown, UI, scenario, or tutorial language.
- [ ] Same generic mechanism works for Nexora and Nordkern (no scenarioId branches).
- [ ] LLM failure → multi-message deterministic fallback; game start and quest reveal continue.
- [ ] Normal advisor chat still works.

## Edge Cases

- [ ] No active situation → short welcome-style opening, no invented company crisis.
- [ ] Model returns invalid JSON / empty messages → fallback.
- [ ] Model invents advisor ids → filtered to existing scenario advisors (excl. inventing people).
- [ ] E2E/instant flags skip long delays and still get complete opening text in chat.
- [ ] Remount during opening does not double-append a second full sequence if already filled.

## Security Coverage

- F-02: Opening payload/schema validated (Zod); LLM output sanitized before chat render.
- F-05 / B-07: No provider secrets in client; opening still goes through authenticated `/ai`.
- B-03: `/ai` remains behind `requireAuth` + owned-run lookup.
- B-06 / P-05: Existing AI rate limit applies to `situation_opening`.
- B-08: Invalid advisor ids dropped (deny unknown persons).
- Out of scope: F-01 HTTPS prod, B-01 auth redesign, P-04 uploads.

## Implementation Notes

- Replaced `situation_briefing` with domain module `shared/domain/situation-opening.ts` (`situation_opening` task).
- Structured LLM/API output: `messages` (2–4), optional `decisionPrompt`, `relevantAdvisorIds` (filtered to real advisors).
- Client: `requestSituationOpening` + progressive reveal via `openingQueueRef` / `StreamingAdvisorText` onComplete.
- Deterministic multi-message fallback on LLM/local failure; quest reveal unchanged and never mentioned in copy.
- Acceptance evals retargeted to conversational opening quality (Nexora + Nordkern fixtures).
- Adalbert voice prompt shifted from case-brief to conversation-opening style.
