# Composition Gate — long-term-outcomes

- HEAD_SHA: WORKTREE
- Date: 2026-09-13
- Verdict: CLEAR

## Event
Player views 12-month outcome; engine projects from frozen post-commit snapshot + seeded comparison batch without mutating live run or DQ.

## Hop chain
`commitDecision` → `outcomeBaseSnapshot` on DecisionRecord → `compareOutcomes` / `projectToHorizon` (clones + `advanceTime`) → Ledger Ergebnis UI rows → DQ remains on Auswertung pane

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| 1 event, N samples | One actual + N seeded clones | `compareOutcomes` batchSize loop; live revision unchanged | pass |
| invalid / missing | Failed sample skipped | try/catch per sample; empty batch falls back to actual | pass |
| 2 consumers | UI + tests read same frozen snapshot | Snapshot captured once at commit | pass |

## Flags
none open

## Skip reason
n/a
