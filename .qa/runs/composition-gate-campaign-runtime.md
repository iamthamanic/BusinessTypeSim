# Composition Gate — campaign-runtime

- HEAD_SHA: a8dd50808bf51b182055b7a338cd082c84d9eefb
- Date: 2026-09-13
- Verdict: CLEAR

## Event
Campaign day advances: eligibility → pending → at most one active activation → player view / ledger.

## Hop chain
createRun/bootstrap → RunState.campaign → advanceTime/applyCampaignDay → SituationInstance + ledger `campaign` → getPlayerCampaignView → CampaignSituationPanel / Ledger

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| 1 day, N eligible | 1 activation | applyCampaignDay activates one winner; peers in exclusion group suppressed | pass |
| invalid / missing campaign | fail-closed scaffold | normalizeRunState fills published scaffold | pass |
| 2 consumers / crash | no duplicate active | active gate blocks second activation until resolve | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | — | — | — | — |

## Skip reason
n/a
