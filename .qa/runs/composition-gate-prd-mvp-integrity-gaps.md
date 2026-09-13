# Composition Gate — prd-mvp-integrity-gaps

- HEAD_SHA: WORKTREE (base 842e92fdabf138db833eaefeb5f3cef1eff5191f; +16 tracked files / Playwright bootstrap)
- Diff stat: +849 / −85 (tracked) + untracked advisor-tools, player-view, authz, cloud-draft, tests, e2e, playwright
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
| invalid / missing | Unknown analysisId / foreign run / offline cloud commit | Engine throws; SQL `owner_id` + `assertSameOwner` → 404; UI disables cloud commit offline | pass |
| 2 consumers / crash | Concurrent/retry commit same key | OCC update fails loser; retry reconciles via processed keys | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| `dead-path:` | note (fixed) | Ledger UI | Advance CTA only on Ergebnis tab; pending analyses invisible after request | Surface `next-event-card` whenever `nextDay !== null` — done |

## Skip reason
n/a
