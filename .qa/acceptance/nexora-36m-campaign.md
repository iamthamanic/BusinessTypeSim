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
- HEAD_SHA: WORKTREE
- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-nexora-36m-campaign.md`
