/**
 * House assistant present in every company — default chat counterpart.
 * Location: shared/domain/house-assistant.ts
 */
import type { AdvisorDefinition, ScenarioDefinition } from './types.ts'

export const HOUSE_ASSISTANT_ID = 'adalbert'

export const HOUSE_ASSISTANT: AdvisorDefinition = {
  id: HOUSE_ASSISTANT_ID,
  name: 'Adalbert Assistent',
  role: 'Assistent',
  stance:
    'Unterstützt den CEO bei Orientierung, fasst Lage zusammen und vermittelt Anfragen an die Fachbereiche.',
  domains: [
    'finance',
    'runway',
    'margin',
    'capex',
    'pricing',
    'retail',
    'operations',
    'product',
    'technical',
    'sales',
    'customer',
    'people',
    'quality',
    'marketplace',
    'brand',
    'cx',
    'risk',
    'governance',
    'organization',
  ],
}

export function withHouseAssistant(advisors: AdvisorDefinition[]): AdvisorDefinition[] {
  if (advisors.some((advisor) => advisor.id === HOUSE_ASSISTANT_ID)) return advisors
  return [HOUSE_ASSISTANT, ...advisors]
}

export function withHouseAssistantScenario(scenario: ScenarioDefinition): ScenarioDefinition {
  return {
    ...scenario,
    advisors: withHouseAssistant(scenario.advisors),
  }
}
