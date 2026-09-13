# Composition Gate — nexora-36m-campaign

- HEAD_SHA: da99b7e297f448547669135d61c5f41eb91d79a3
- Date: 2026-09-13
- Verdict: CLEAR

## Event
Nexora campaign tick activates at most one situation from catalog eligibility.

## Hop chain
nexoraCampaignV1 → createRun → applyCampaignDay → getPlayerCampaignView → UI

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N eligible | 1 active | exclusion + hasActive | pass |
| requiresResolved missing | no follow-up | gated | pass |
| cash gate | funding/partner differ | metrics thresholds | pass |

## Flags
(none)

## Skip reason
n/a
