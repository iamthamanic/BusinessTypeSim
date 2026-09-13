# Feature: Nordkern Foods 36-Monats-Campaign

## Intent
Publish an immutable Nordkern Foods 36-month CampaignVersion with ≥35 situation families across four phases, state-driven eligibility, and player-safe DE copy.

## Preconditions
- Campaign runtime (#8) on main
- Nordkern scenario + World State V2 fixtures available

## Happy Path
- [x] ≥35 situation/event families across phases 0–6 / 6–15 / 15–27 / 27–36
- [x] Published catalog binds `nordkern-foods` to `nordkern-foods-36m` v1
- [x] Player views omit hidden triggers; Home shows Nordkern opening
- [x] ≥5 path-divergence tests (cash, morale, requiresResolved, exclusion)
- [x] typed-strict clean on touched files

## Edge Cases
- [x] Exclusion groups activate at most one peer
- [x] Seed replay identical
- [x] Acquisition gated by cash + decision depth

## Security Coverage
| Item | Applicable? | How |
|------|-------------|-----|
| F-02 | Yes | Player campaign view strips triggers |
| B-02 | Yes | Eligibility from authoritative RunState only |
| B-08 | Yes | Unknown campaign → scaffold fail-closed |

## Composition Gate
- HEAD_SHA: WORKTREE
- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-nordkern-36m-campaign.md`
