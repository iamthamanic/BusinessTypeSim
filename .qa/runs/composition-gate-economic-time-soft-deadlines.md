# Composition Gate — economic-time-soft-deadlines

- HEAD_SHA: WORKTREE
- Date: 2026-09-13
- Verdict: CLEAR

## Event
advanceTime applies economic ticks day-by-day; soft deadline injects consequence if crossed without decision; delayed events resolve with seed.

## Hop chain
UI advance / game API → advanceTime → applyEconomicDay (per day) → softDeadlineConsequence → resolve scheduled → ledger + metrics

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N days advance | One econ_tick per day, no double book on retry of same day ids | ledger id econ_tick_{day} | pass |
| Miss deadline | Soft consequence, run continues | deadline_missed | pass |
| Same seed | Identical metrics/ledger ids | tests | pass |

## Flags
none
