/**
 * Nexora 36-month campaign content pack tests.
 */
import { describe, expect, it } from 'vitest'
import {
  advanceTime,
  applyCampaignDay,
  commitDecision,
  createRun,
  emptyDecisionQualityEvidence,
  getPlayerCampaignView,
  getPublishedCampaignForScenario,
  interpretDecisionLocally,
  nexoraCampaignV1,
  nexoraSituationFamilyCount,
  NEXORA_CAMPAIGN_ID,
  type CompanyMetrics,
  type DecisionRecord,
  type RunState,
} from '../shared/domain/index.ts'

function stubDecisions(count: number, metrics: CompanyMetrics): DecisionRecord[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `d${i}`,
    day: i + 1,
    playerText: `p${i}`,
    rationale: 'r',
    proposal: {
      actions: [],
      assumptions: [],
      ambiguities: [],
      extractedObjectives: [],
      extractedRisks: [],
      extractedAlternatives: [],
      evidenceRefs: [],
    },
    quality: {
      framing: 50,
      information: 50,
      alternatives: 50,
      objectives: 50,
      reasoning: 50,
      execution: 50,
      total: 50,
      evidence: emptyDecisionQualityEvidence(),
    },
    before: metrics,
    afterImmediate: metrics,
  }))
}

function withClock(run: RunState, day: number, situations: RunState['campaign']['situations']): RunState {
  return {
    ...run,
    day,
    campaign: {
      ...run.campaign,
      clockDay: day,
      clockMonth: Math.floor(day / 30),
      situations,
    },
  }
}

describe('nexora 36m campaign', () => {
  it('publishes ≥35 situation families on nexora-saas', () => {
    const campaign = getPublishedCampaignForScenario('nexora-saas')
    expect(campaign.id).toBe(NEXORA_CAMPAIGN_ID)
    expect(nexoraSituationFamilyCount()).toBeGreaterThanOrEqual(35)
    expect(campaign.situations.length).toBeGreaterThanOrEqual(35)
    expect(nexoraCampaignV1().version).toBe(1)
  })

  it('bootstraps Nexora opening without hidden churn signal', () => {
    const run = createRun('nexora-saas', 'nx-open')
    const view = getPlayerCampaignView(run, getPublishedCampaignForScenario('nexora-saas'))
    expect(view.active?.title).toBeTruthy()
    expect(JSON.stringify(view)).not.toMatch(/Internes Churn|probabilityBps|trigger/)
  })

  it('diverges: delivery-delay requires translog resolved', () => {
    const campaign = getPublishedCampaignForScenario('nexora-saas')
    const base = createRun('nexora-saas', 'nx-tl')
    const decisions = stubDecisions(2, base.metrics)
    const withTl = applyCampaignDay(
      {
        ...withClock(base, 90, [
          {
            instanceId: 'o',
            templateId: 'opening',
            templateVersion: 1,
            status: 'resolved',
            eligibleAtDay: 0,
            resolvedAtDay: 1,
          },
          {
            instanceId: 't',
            templateId: 'nx-translog-renewal',
            templateVersion: 1,
            status: 'resolved',
            eligibleAtDay: 10,
            resolvedAtDay: 20,
          },
        ]),
        decisions,
      },
      campaign,
      90,
    )
    const withoutTl = applyCampaignDay(
      {
        ...withClock(base, 90, [
          {
            instanceId: 'o',
            templateId: 'opening',
            templateVersion: 1,
            status: 'resolved',
            eligibleAtDay: 0,
            resolvedAtDay: 1,
          },
        ]),
        decisions,
      },
      campaign,
      90,
    )
    expect(withTl.campaign.situations.some((s) => s.templateId === 'nx-delivery-delay')).toBe(true)
    expect(withoutTl.campaign.situations.some((s) => s.templateId === 'nx-delivery-delay')).toBe(false)
  })

  it('diverges: funding-timing gated by low cash', () => {
    const campaign = getPublishedCampaignForScenario('nexora-saas')
    const base = createRun('nexora-saas', 'nx-fund')
    const decisions = stubDecisions(4, base.metrics)
    const low = applyCampaignDay(
      {
        ...withClock(base, 210, [
          {
            instanceId: 'o',
            templateId: 'opening',
            templateVersion: 1,
            status: 'resolved',
            eligibleAtDay: 0,
            resolvedAtDay: 1,
          },
        ]),
        decisions,
        metrics: { ...base.metrics, cashCents: 200_000_000 },
      },
      campaign,
      210,
    )
    const high = applyCampaignDay(
      {
        ...withClock(base, 210, [
          {
            instanceId: 'o',
            templateId: 'opening',
            templateVersion: 1,
            status: 'resolved',
            eligibleAtDay: 0,
            resolvedAtDay: 1,
          },
        ]),
        decisions,
        metrics: { ...base.metrics, cashCents: 900_000_000 },
      },
      campaign,
      210,
    )
    expect(low.campaign.situations.some((s) => s.templateId === 'nx-funding-timing')).toBe(true)
    expect(high.campaign.situations.some((s) => s.templateId === 'nx-funding-timing')).toBe(false)
  })

  it('diverges: design-partner requires AI platform resolved', () => {
    const campaign = getPublishedCampaignForScenario('nexora-saas')
    const base = createRun('nexora-saas', 'nx-dp')
    const decisions = stubDecisions(2, base.metrics)
    const withAi = applyCampaignDay(
      {
        ...withClock(base, 90, [
          {
            instanceId: 'o',
            templateId: 'opening',
            templateVersion: 1,
            status: 'resolved',
            eligibleAtDay: 0,
            resolvedAtDay: 1,
          },
          {
            instanceId: 'a',
            templateId: 'nx-ai-dispatch-platform',
            templateVersion: 1,
            status: 'resolved',
            eligibleAtDay: 5,
            resolvedAtDay: 15,
          },
        ]),
        decisions,
      },
      campaign,
      90,
    )
    const withoutAi = applyCampaignDay(
      {
        ...withClock(base, 90, [
          {
            instanceId: 'o',
            templateId: 'opening',
            templateVersion: 1,
            status: 'resolved',
            eligibleAtDay: 0,
            resolvedAtDay: 1,
          },
        ]),
        decisions,
      },
      campaign,
      90,
    )
    expect(withAi.campaign.situations.some((s) => s.templateId === 'nx-design-partner')).toBe(true)
    expect(withoutAi.campaign.situations.some((s) => s.templateId === 'nx-design-partner')).toBe(false)
  })

  it('diverges: strategic partner requires cash floor', () => {
    const campaign = getPublishedCampaignForScenario('nexora-saas')
    const base = createRun('nexora-saas', 'nx-sp')
    const decisions = stubDecisions(10, base.metrics)
    const rich = applyCampaignDay(
      {
        ...withClock(base, 540, [
          {
            instanceId: 'o',
            templateId: 'opening',
            templateVersion: 1,
            status: 'resolved',
            eligibleAtDay: 0,
            resolvedAtDay: 1,
          },
        ]),
        decisions,
        metrics: { ...base.metrics, cashCents: 300_000_000 },
      },
      campaign,
      540,
    )
    const poor = applyCampaignDay(
      {
        ...withClock(base, 540, [
          {
            instanceId: 'o',
            templateId: 'opening',
            templateVersion: 1,
            status: 'resolved',
            eligibleAtDay: 0,
            resolvedAtDay: 1,
          },
        ]),
        decisions,
        metrics: { ...base.metrics, cashCents: 1_000 },
      },
      campaign,
      540,
    )
    expect(rich.campaign.situations.some((s) => s.templateId === 'nx-strategic-partner')).toBe(true)
    expect(poor.campaign.situations.some((s) => s.templateId === 'nx-strategic-partner')).toBe(false)
  })

  it('same seed replays Nexora campaign identically', () => {
    const seed = 'nx-replay'
    const once = () => {
      let run = createRun('nexora-saas', seed)
      // Avoid start_project keywords (plattform/ai/dispatch) — world already binds that project.
      const text =
        'Runway schützen, Mid-Market stärken und Konzentration reduzieren; Alternativen klar abwägen.'
      const rationale =
        'Ziel: Wachstum und Resilienz. Risiko: Cash und Abhängigkeit. Alternative: nur Kosten senken.'
      run = commitDecision(run, text, rationale, interpretDecisionLocally(run, text, rationale), `${seed}-k`)
      return advanceTime(run, 90)
    }
    expect(once().campaign).toEqual(once().campaign)
  })

  it('monetization exclusion activates at most one pricing path', () => {
    const campaign = getPublishedCampaignForScenario('nexora-saas')
    const base = createRun('nexora-saas', 'nx-price')
    const tick = applyCampaignDay(
      {
        ...withClock(base, 210, [
          {
            instanceId: 'o',
            templateId: 'opening',
            templateVersion: 1,
            status: 'resolved',
            eligibleAtDay: 0,
            resolvedAtDay: 1,
          },
        ]),
        decisions: stubDecisions(3, base.metrics),
      },
      campaign,
      210,
    )
    const active = tick.campaign.situations.filter(
      (s) =>
        (s.templateId === 'nx-pricing-packaging' || s.templateId === 'nx-usage-pricing') &&
        s.status === 'active',
    )
    expect(active.length).toBeLessThanOrEqual(1)
  })
})
