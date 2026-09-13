/**
 * Nordkern 36-month campaign content pack tests.
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
  nordkernCampaignV1,
  nordkernSituationFamilyCount,
  NORDKERN_CAMPAIGN_ID,
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

describe('nordkern 36m campaign', () => {
  it('publishes ≥35 situation families on nordkern-foods', () => {
    const campaign = getPublishedCampaignForScenario('nordkern-foods')
    expect(campaign.id).toBe(NORDKERN_CAMPAIGN_ID)
    expect(nordkernSituationFamilyCount()).toBeGreaterThanOrEqual(35)
    expect(campaign.situations.length).toBeGreaterThanOrEqual(35)
    expect(nordkernCampaignV1().version).toBe(1)
  })

  it('bootstraps Nordkern-specific opening in player view without hidden signals', () => {
    const run = createRun('nordkern-foods', 'nk-open')
    const view = getPlayerCampaignView(run, getPublishedCampaignForScenario('nordkern-foods'))
    expect(view.active?.title).toMatch(/Nordkern|Lidl|Thüringen|Automatisierung|Marge|Kapazität/i)
    expect(JSON.stringify(view)).not.toMatch(/Frühwarn|Internes Margensignal|probabilityBps|trigger/)
  })

  it('diverges: retailer-reaction requires lidl-margin resolved', () => {
    const campaign = getPublishedCampaignForScenario('nordkern-foods')
    const base = createRun('nordkern-foods', 'nk-lidl-req')
    const decisions = stubDecisions(2, base.metrics)
    const withLidl = applyCampaignDay(
      {
        ...withClock(base, 120, [
          {
            instanceId: 'open_done',
            templateId: 'opening',
            templateVersion: 1,
            status: 'resolved',
            eligibleAtDay: 0,
            resolvedAtDay: 1,
          },
          {
            instanceId: 'lidl_done',
            templateId: 'nk-lidl-margin',
            templateVersion: 1,
            status: 'resolved',
            eligibleAtDay: 10,
            resolvedAtDay: 20,
          },
        ]),
        decisions,
      },
      campaign,
      120,
    )
    const withoutLidl = applyCampaignDay(
      {
        ...withClock(base, 120, [
          {
            instanceId: 'open_done',
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
      120,
    )
    expect(withLidl.campaign.situations.some((s) => s.templateId === 'nk-retailer-reaction')).toBe(true)
    expect(withoutLidl.campaign.situations.some((s) => s.templateId === 'nk-retailer-reaction')).toBe(
      false,
    )
  })

  it('diverges on cash: second-plant gated by cash floor', () => {
    const campaign = getPublishedCampaignForScenario('nordkern-foods')
    const base = createRun('nordkern-foods', 'nk-cash-gate')
    const decisions = stubDecisions(4, base.metrics)
    const resolvedOpening = withClock(base, 210, [
      {
        instanceId: 'open_done',
        templateId: 'opening',
        templateVersion: 1,
        status: 'resolved',
        eligibleAtDay: 0,
        resolvedAtDay: 1,
      },
    ])
    const rich = applyCampaignDay(
      { ...resolvedOpening, decisions, metrics: { ...base.metrics, cashCents: 5_000_000_000 } },
      campaign,
      210,
    )
    const poor = applyCampaignDay(
      { ...resolvedOpening, decisions, metrics: { ...base.metrics, cashCents: 0 } },
      campaign,
      210,
    )
    expect(rich.campaign.situations.some((s) => s.templateId === 'nk-second-plant')).toBe(true)
    expect(poor.campaign.situations.some((s) => s.templateId === 'nk-second-plant')).toBe(false)
  })

  it('diverges on morale trigger for shift conflicts', () => {
    let low = createRun('nordkern-foods', 'nk-morale-low')
    let high = createRun('nordkern-foods', 'nk-morale-high')
    low = { ...low, metrics: { ...low.metrics, moraleBps: 4_000 } }
    high = { ...high, metrics: { ...high.metrics, moraleBps: 7_500 } }
    const text = 'Wir halten Produktion und verhandeln vorsichtig mit dem Handel.'
    const rationale = 'Ziel: Stabilität. Risiko: Morale. Alternative: Kapazität drosseln.'
    low = commitDecision(low, text, rationale, interpretDecisionLocally(low, text, rationale), 'm1')
    high = commitDecision(high, text, rationale, interpretDecisionLocally(high, text, rationale), 'm2')
    low = advanceTime(low, 100)
    high = advanceTime(high, 100)
    expect(low.campaign.situations.some((s) => s.templateId === 'nk-shift-conflict')).not.toEqual(
      high.campaign.situations.some((s) => s.templateId === 'nk-shift-conflict'),
    )
  })

  it('diverges: startup-issues requires thueringen resolved', () => {
    const campaign = getPublishedCampaignForScenario('nordkern-foods')
    const base = createRun('nordkern-foods', 'nk-startup')
    const decisions = stubDecisions(1, base.metrics)
    const withAuto = applyCampaignDay(
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
            templateId: 'nk-thueringen-automation',
            templateVersion: 1,
            status: 'resolved',
            eligibleAtDay: 10,
            resolvedAtDay: 30,
          },
        ]),
        decisions,
      },
      campaign,
      90,
    )
    const noThueringen = applyCampaignDay(
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
    expect(withAuto.campaign.situations.some((s) => s.templateId === 'nk-startup-issues')).toBe(true)
    expect(noThueringen.campaign.situations.some((s) => s.templateId === 'nk-startup-issues')).toBe(
      false,
    )
  })

  it('diverges: acquisition requires cash and decision depth', () => {
    const campaign = getPublishedCampaignForScenario('nordkern-foods')
    const base = createRun('nordkern-foods', 'nk-acq')
    const decisions = stubDecisions(8, base.metrics)
    const rich = applyCampaignDay(
      {
        ...withClock(base, 480, [
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
        metrics: { ...base.metrics, cashCents: 3_000_000_000 },
      },
      campaign,
      480,
    )
    const poor = applyCampaignDay(
      {
        ...withClock(base, 480, [
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
        metrics: { ...base.metrics, cashCents: 100_000 },
      },
      campaign,
      480,
    )
    expect(rich.campaign.situations.some((s) => s.templateId === 'nk-acquisition-jv')).toBe(true)
    expect(poor.campaign.situations.some((s) => s.templateId === 'nk-acquisition-jv')).toBe(false)
  })

  it('same seed replays Nordkern campaign identically', () => {
    const seed = 'nk-replay'
    const once = () => {
      let run = createRun('nordkern-foods', seed)
      const text = 'Pilot Thüringen plus Lidl-Mindestmarge, klare Alternativen und Cash-Puffer.'
      const rationale = 'Ziel: Resilienz. Risiko: CAPEX. Alternative: nur Debottlenecking.'
      run = commitDecision(run, text, rationale, interpretDecisionLocally(run, text, rationale), `${seed}-k`)
      return advanceTime(run, 90)
    }
    expect(once().campaign).toEqual(once().campaign)
  })

  it('phase-2 scale exclusion activates at most one of second-plant/debottleneck', () => {
    let run = createRun('nordkern-foods', 'nk-scale')
    for (let i = 0; i < 4; i += 1) {
      const text = `Entscheidung ${i}: Kapazität und Cash sichern, Alternativen geprüft.`
      const rationale = 'Ziel: Scale. Risiko: Debt. Alternative: organisch warten.'
      run = commitDecision(
        run,
        text,
        rationale,
        interpretDecisionLocally(run, text, rationale),
        `scale-${i}`,
      )
      run = advanceTime(run, 45)
    }
    const activeScale = run.campaign.situations.filter(
      (s) =>
        (s.templateId === 'nk-second-plant' || s.templateId === 'nk-debottleneck') &&
        s.status === 'active',
    )
    expect(activeScale.length).toBeLessThanOrEqual(1)
  })
})
