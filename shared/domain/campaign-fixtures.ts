/**
 * Published campaign catalog — generic scaffolds + production packs.
 * Location: shared/domain/campaign-fixtures.ts
 */
import {
  CAMPAIGN_DURATION_MONTHS,
  latestCampaignForScenario,
  openingTemplateFromScenario,
  type CampaignCatalog,
} from './campaign.ts'
import { nordkernCampaignV1, NORDKERN_CAMPAIGN_ID } from './campaigns/nordkern-36m.ts'
import { nexoraCampaignV1, NEXORA_CAMPAIGN_ID } from './campaigns/nexora-36m.ts'
import { getScenario } from './scenarios.ts'
import type { CampaignDefinition, ScenarioId, SituationTemplate } from './types.ts'

function followUpPressure(): SituationTemplate {
  return {
    id: 'followup_pressure',
    version: 1,
    familyId: 'followup',
    title: 'Operativer Nachdruck',
    context:
      'Nach der ersten Entscheidung steigt der Druck auf Cash, Kapazität oder Teamfokus. Priorisiere den nächsten Hebel bewusst.',
    priority: 80,
    cooldownDays: 60,
    deadlineDays: 14,
    visibility: 'player_visible',
    exclusionGroup: 'phase-1-followup',
    trigger: {
      minDecisions: 1,
      minDay: 5,
      maxMonth: 12,
    },
  }
}

function followUpOpportunity(): SituationTemplate {
  return {
    id: 'followup_opportunity',
    version: 1,
    familyId: 'followup',
    title: 'Strategische Opportunität',
    context:
      'Eine zeitlich begrenzte Opportunität steht im Raum. Sie konkurriert mit dem operativen Nachdruck um Management-Attention.',
    priority: 70,
    cooldownDays: 60,
    deadlineDays: 10,
    visibility: 'player_visible',
    exclusionGroup: 'phase-1-followup',
    trigger: {
      minDecisions: 1,
      minDay: 5,
      maxMonth: 12,
      metrics: { cashCents: { min: 1 } },
    },
  }
}

/** Hidden twin — eligible with pressure but must never appear in player views. */
function hiddenPressureSignal(): SituationTemplate {
  return {
    id: 'hidden_pressure_signal',
    version: 1,
    familyId: 'followup',
    title: 'Internes Frühwarnsignal',
    context: 'Authoring-only signal; not for players.',
    priority: 90,
    cooldownDays: 90,
    deadlineDays: 7,
    visibility: 'hidden',
    trigger: {
      minDecisions: 1,
      minDay: 5,
      maxMonth: 12,
    },
  }
}

function scaffoldForScenario(scenarioId: ScenarioId): CampaignDefinition {
  const scenario = getScenario(scenarioId)
  return {
    id: `scaffold-${scenarioId}`,
    version: 1,
    scenarioId,
    durationMonths: CAMPAIGN_DURATION_MONTHS,
    situations: [
      openingTemplateFromScenario(scenario),
      followUpPressure(),
      followUpOpportunity(),
      hiddenPressureSignal(),
    ],
  }
}

const PLAYABLE_SCAFFOLD: ScenarioId[] = [
  'klarwerk-services',
  'heliora-clinic',
  'marktwerk-marketplace',
  'stromfeld-energy',
  'urbanfit-retail',
]

const nordkern = nordkernCampaignV1()
const nexora = nexoraCampaignV1()

/** Immutable published catalog keyed by campaign id. */
export const publishedCampaigns: CampaignCatalog = {
  ...Object.fromEntries(
    PLAYABLE_SCAFFOLD.map((scenarioId) => {
      const def = scaffoldForScenario(scenarioId)
      return [def.id, [def]]
    }),
  ),
  [NORDKERN_CAMPAIGN_ID]: [nordkern],
  [NEXORA_CAMPAIGN_ID]: [nexora],
}

export function getPublishedCampaignForScenario(scenarioId: ScenarioId): CampaignDefinition {
  const found = latestCampaignForScenario(publishedCampaigns, scenarioId)
  if (!found) {
    const scenario = getScenario(scenarioId)
    return {
      id: `scaffold-${scenarioId}`,
      version: 1,
      scenarioId,
      durationMonths: CAMPAIGN_DURATION_MONTHS,
      situations: [openingTemplateFromScenario(scenario)],
    }
  }
  return found
}

/**
 * Test-only campaign with tight windows for deterministic fixtures.
 * Not registered in the published catalog.
 */
export function buildTestCampaign(overrides?: Partial<CampaignDefinition>): CampaignDefinition {
  const base = scaffoldForScenario('nexora-saas')
  return {
    ...base,
    id: overrides?.id ?? 'test-campaign',
    version: overrides?.version ?? 1,
    scenarioId: overrides?.scenarioId ?? 'nordkern-foods',
    durationMonths: overrides?.durationMonths ?? CAMPAIGN_DURATION_MONTHS,
    situations: overrides?.situations ?? base.situations,
  }
}
