# Composition Gate — semantic-decision-quality

- HEAD_SHA: 0affdd44cc56dcb2da9f53bc4ab50a8169a5b16d
- Date: 2026-09-13
- Verdict: CLEAR

## Event
Player commits a decision; engine freezes DecisionContextSnapshot + semantic evidence and computes DQ scores once; later knowledge unlocks must not rewrite that score.

## Hop chain
DecisionView commit → `commitDecision` / `scoreDecisionSemantic` → `DecisionRecord.quality` + `contextSnapshot` persist on RunState → LedgerView `DecisionQualityCard` renders evidence → Outcome/Debrief tabs remain separate labels

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| 1 event, N actors | One commit → one DQ snapshot + one quality object | `commitDecision` appends a single `DecisionRecord` with frozen snapshot | pass |
| invalid / missing | Stuffing / empty rationale → low score; schema rejects bad evidence | Zod `decisionQualityEvidenceSchema`; stuffing penalty; short-text fixture | pass |
| 2 consumers / crash | Later analysis unlock must not change stored DQ | Tests freeze snapshot; `normalizeRunState` backfills missing evidence without rescoring | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| `label-lie:` | note | UI Card | `data-testid` on Card was dropped by primitive | done — Card forwards HTML attributes |

## Skip reason
n/a
