/**
 * Campaign runtime — eligibility, priority, exclusion, player-safe views.
 */
import { describe, expect, it } from 'vitest'
import {
  advanceTime,
  applyCampaignDay,
  buildTestCampaign,
  commitDecision,
  createRun,
  getPlayerCampaignView,
  getPublishedCampaignForScenario,
  interpretDecisionLocally,
  normalizeRunState,
} from '../shared/domain/index.ts'

describe('campaign runtime', () => {
  it('bootstraps opening situation and is seed-replayable', () => {
    const a = createRun('nordkern-foods', 'campaign-seed-a')
    const b = createRun('nordkern-foods', 'campaign-seed-a')
    expect(a.campaign.situations).toEqual(b.campaign.situations)
    expect(a.campaign.situations.some((item) => item.status === 'active')).toBe(true)
    const view = getPlayerCampaignView(a, getPublishedCampaignForScenario('nordkern-foods'))
    expect(view.active?.title).toBeTruthy()
    expect(JSON.stringify(view)).not.toMatch(/trigger|minDay|probabilityBps|Frühwarn/)
  })

  it('never exposes hidden situations in player view', () => {
    const run = createRun('nordkern-foods', 'hidden-check')
    const advanced = advanceTime(run, 10)
    const view = getPlayerCampaignView(advanced, getPublishedCampaignForScenario('nordkern-foods'))
    const ids = [view.active, ...view.upcoming, ...view.recentResolved]
      .filter(Boolean)
      .map((item) => item!.templateId)
    expect(ids).not.toContain('hidden_pressure_signal')
  })

  it('activates at most one situation and suppresses exclusion peers', () => {
    // Scaffold campaigns still own klarwerk; Nexora is a full pack without followup_* peers.
    let run = createRun('klarwerk-services', 'exclusion-seed')
    const text =
      'Wir ziehen eine echte Führungsebene ein und testen höhere Tagessätze, ohne den Großkunden zu verlieren.'
    const rationale =
      'Ziel: Entlastung und Marge. Risiko: Kundenbindung. Alternative: nur Pricing.'
    const proposal = interpretDecisionLocally(run, text, rationale)
    run = commitDecision(run, text, rationale, proposal, 'exclusion-key-1')
    expect(run.campaign.situations.some((item) => item.status === 'resolved')).toBe(true)

    run = advanceTime(run, 10)
    const actives = run.campaign.situations.filter((item) => item.status === 'active')
    expect(actives).toHaveLength(1)
    const statuses = run.campaign.situations.map((item) => `${item.templateId}:${item.status}`)
    const followups = statuses.filter(
      (item) => item.startsWith('followup_pressure:') || item.startsWith('followup_opportunity:'),
    )
    expect(followups.some((item) => item.endsWith(':active'))).toBe(true)
    expect(followups.some((item) => item.endsWith(':suppressed') || item.endsWith(':pending'))).toBe(
      true,
    )
    // Mutual exclusion: never both active.
    expect(followups.filter((item) => item.endsWith(':active'))).toHaveLength(1)
  })

  it('expires pending when eligibility is lost before activation', () => {
    const campaign = buildTestCampaign({
      situations: [
        {
          id: 'opening',
          version: 1,
          familyId: 'opening',
          title: 'Start',
          context: 'Startlage',
          priority: 100,
          cooldownDays: 0,
          deadlineDays: 14,
          visibility: 'player_visible',
          trigger: { minDay: 0, maxDecisions: 0 },
        },
        {
          id: 'fragile',
          version: 1,
          familyId: 'fragile',
          title: 'Fragile Lage',
          context: 'Nur bei hohem Cash',
          priority: 50,
          cooldownDays: 0,
          deadlineDays: 7,
          visibility: 'player_visible',
          trigger: { minDay: 1, maxDay: 3, metrics: { cashCents: { min: 1_000_000_000_000 } } },
        },
      ],
    })
    let run = createRun('nordkern-foods', 'expire-pending')
    // Inject pending that will lose eligibility when cash drops below threshold.
    run = {
      ...run,
      campaign: {
        ...run.campaign,
        situations: [
          ...run.campaign.situations,
          {
            instanceId: 'sit_fragile_test',
            templateId: 'fragile',
            templateVersion: 1,
            status: 'pending',
            eligibleAtDay: 1,
          },
        ],
      },
      metrics: { ...run.metrics, cashCents: 0 },
    }
    const tick = applyCampaignDay(run, campaign, 2)
    const fragile = tick.campaign.situations.find((item) => item.templateId === 'fragile')
    expect(fragile?.status).toBe('expired')
  })

  it('campaign ledger events are causal and ordered after economic ticks', () => {
    const run = advanceTime(createRun('nexora-saas', 'order-seed'), 1)
    const day1 = run.ledger.filter((entry) => entry.day === 1)
    const econIdx = day1.findIndex((entry) => entry.type === 'economic')
    const campIdx = day1.findIndex((entry) => entry.type === 'campaign')
    if (campIdx >= 0 && econIdx >= 0) {
      expect(campIdx).toBeGreaterThan(econIdx)
    }
  })

  it('ends campaign on failure cash and normalize restores missing campaign', () => {
    let run = createRun('nordkern-foods', 'fail-cash')
    run = {
      ...run,
      metrics: { ...run.metrics, cashCents: -50_000_000_000 },
    }
    const next = advanceTime(run, 1)
    expect(next.status).toBe('failed')
    expect(next.campaign.ended).toBe(true)
    expect(next.campaign.endReason).toBe('failure')

    const base = createRun('nexora-saas', 'norm')
    const { campaign: _removed, ...without } = base
    const restored = normalizeRunState(without)
    expect(restored.campaign.campaignId).toBe('nexora-saas-36m')
  })

  it('same seed advances campaign identically', () => {
    const seed = 'replay-campaign-advance'
    const path = () => {
      let run = createRun('nordkern-foods', seed)
      const text =
        'Wir automatisieren Thüringen als Pilot und verhandeln Lidl auf Mindestmarge, ohne Massenentlassung.'
      const rationale =
        'Ziel: Marge und Kapazität. Risiko: Cash und Umsetzung. Alternative: nur Renegotiation.'
      const proposal = interpretDecisionLocally(run, text, rationale)
      run = commitDecision(run, text, rationale, proposal, `${seed}-key`)
      return advanceTime(run, 40)
    }
    const a = path()
    const b = path()
    expect(a.campaign.situations.map((item) => `${item.templateId}:${item.status}`)).toEqual(
      b.campaign.situations.map((item) => `${item.templateId}:${item.status}`),
    )
  })
})
