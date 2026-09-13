# Composition Gate — long-term-outcomes-counterfactuals

- HEAD_SHA: WORKTREE
- Date: 2026-09-13
- Verdict: CLEAR

## Event
Player commits a decision; engine freezes pre-/post-decision snapshots; Ergebnis UI projects Actual + luck batch + optional alternate-action counterfactual without rewriting Decision Quality or mutating live run metrics.

## Hop chain
DecisionView commit → `commitDecision` persists `preDecisionSnapshot` + `outcomeBaseSnapshot` on `DecisionRecord` → `compareDecisionOutcomes` / `projectToHorizon` / luck seeds → Ledger Ergebnis (`Sofortwirkung` + `12 Monate später` + Gegenpfad) → DQ tab remains separate labels

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| 1 event, N actors | One commit → one pair of snapshots; N luck samples share post-commit base | `commitDecision` attaches snapshots once; `compareOutcomes` clones with `comparisonSeed` | pass |
| invalid / missing | Failed comparison sample skipped; missing snapshot → UI empty; counterfactual commit errors fail-closed | try/catch in sample loop + `projectCounterfactualAlternate`; legacy decisions without snapshot show empty card | pass |
| 2 consumers / crash | Live run metrics/revision/DQ unchanged while UI/self-check project forks | Vitest asserts revision/cash/DQ frozen; `liveRunMutated: false` | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| — | — | — | — | — |

## Skip reason
n/a
