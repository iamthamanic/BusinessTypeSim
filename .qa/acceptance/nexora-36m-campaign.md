# Feature: Nexora 36-Monats-Campaign

## Intent
Publish immutable Nexora SaaS 36-month CampaignVersion with ≥35 families and state-driven paths.

## Happy Path
- [x] ≥35 families across four phases
- [x] Catalog binds `nexora-saas` → `nexora-saas-36m` v1
- [x] Hidden triggers never in player view
- [x] ≥5 divergence tests
- [x] typed-strict clean

## Composition Gate
- HEAD_SHA: da99b7e297f448547669135d61c5f41eb91d79a3
- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-nexora-36m-campaign.md`
