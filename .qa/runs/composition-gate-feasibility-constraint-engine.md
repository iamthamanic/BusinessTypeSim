# Composition Gate — feasibility-constraint-engine

- HEAD_SHA: WORKTREE
- Date: 2026-09-13
- Verdict: CLEAR

## Event
Player confirms ActionProposal; domain evaluates package constraints; blockers prevent commitDecision; server re-runs same evaluator.

## Hop chain
ProposalReviewCard (editable params) → evaluateConstraints(run, proposal) → UI blockers/warnings → commitDecision / game API → evaluateConstraints again → Engine mutate | reject

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N actions package | Atomic; no partial apply on blocker | commitDecision fails closed | pass |
| Invalid amount over cash | Blocker | budget constraint | pass |
| Warning only | Commit allowed | warnings non-blocking | pass |

## Flags
none
