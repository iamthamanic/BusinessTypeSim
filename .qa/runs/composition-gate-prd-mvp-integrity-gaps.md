# Composition Gate — prd-mvp-integrity-gaps

- HEAD_SHA: 5fab593c8de937d089e4aae79601e2698e5a6b80
- Feature_SHA: 3307b8ae0503ce3fac34bfdd3fe431ad58c5aa4d (ancestor; product code)
- Date: 2026-09-13
- Verdict: CLEAR

## Event
Player requests analysis → one pending schedule → advance unlocks reveal once into completedAnalyses/ledger → advisors/AI consume only unlocked facts; commit uses idempotencyKey once with OCC reconcile.

## Hop chain
UI `performAnalysis` → domain `requestAnalysis` → persist RunState (localStorage / `game_runs.state`) → UI/Ledger `getNextPendingEventDay` → `advanceTime`/`resolveDueAnalyses` → `completedAnalyses` + ledger → Decision/Team/AI `visibleContext` + `collectAdvisorToolContext` → commit `idempotencyKey` → `processedIdempotencyKeys` (+ cloud reconcile on stale revision).

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| 1 event, N actors | 1 request → 1 pending; 1 unlock; 1 commit/key | Re-request no-op; unlock once; duplicate key same revision | pass |
| invalid / missing | Unknown analysisId / foreign run / offline cloud commit | UnknownAnalysisError→400; interpretOwnedRunLookup→404; UI disables cloud commit offline | pass |
| 2 consumers / crash | Concurrent/retry commit same key | OCC update fails loser; retry reconciles via processed keys | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| — | — | — | — | — |

## Skip reason
n/a

## Tip note
PR tip `5fab593` = Feature_SHA + docs-only composition pin. `git diff Feature_SHA..HEAD` is QA proof only; hop-chain code unchanged. Gate re-affirmed CLEAR on tip.
