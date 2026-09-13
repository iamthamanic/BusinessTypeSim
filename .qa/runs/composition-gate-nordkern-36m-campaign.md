# Composition Gate — nordkern-36m-campaign

- HEAD_SHA: WORKTREE
- Date: 2026-09-13
- Verdict: CLEAR

## Event
Nordkern campaign day: eligibility from clock + decisions + metrics → pending/active situation → player panel.

## Hop chain
nordkernCampaignV1 catalog → createRun bootstrap → applyCampaignDay → SituationInstance → getPlayerCampaignView → CampaignSituationPanel

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N eligible / day | ≤1 active | exclusion + hasActive gate | pass |
| missing requiresResolved | no follow-up | retailer/startup gated | pass |
| crash mid-day | no duplicate | pure tick return | pass |

## Flags
(none)

## Skip reason
n/a
