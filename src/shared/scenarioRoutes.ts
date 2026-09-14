/**
 * Public URL slugs ↔ scenario ids for /szenario/:slug routes.
 * Location: src/shared/scenarioRoutes.ts
 */
import type { ScenarioId } from '../domain'

const SLUG_TO_ID: Record<string, ScenarioId> = {
  nexora: 'nexora-saas',
  'nexora-saas': 'nexora-saas',
  nordkern: 'nordkern-foods',
  'nordkern-foods': 'nordkern-foods',
  klarwerk: 'klarwerk-services',
  'klarwerk-services': 'klarwerk-services',
  heliora: 'heliora-clinic',
  askolep: 'heliora-clinic',
  'heliora-clinic': 'heliora-clinic',
  marktwerk: 'marktwerk-marketplace',
  'marktwerk-marketplace': 'marktwerk-marketplace',
  stromfeld: 'stromfeld-energy',
  'stromfeld-energy': 'stromfeld-energy',
  urbanfit: 'urbanfit-retail',
  urbanatics: 'urbanfit-retail',
  'urbanfit-retail': 'urbanfit-retail',
}

const ID_TO_SLUG: Record<ScenarioId, string> = {
  'nexora-saas': 'nexora',
  'nordkern-foods': 'nordkern',
  'klarwerk-services': 'klarwerk',
  'heliora-clinic': 'heliora',
  'marktwerk-marketplace': 'marktwerk',
  'stromfeld-energy': 'stromfeld',
  'urbanfit-retail': 'urbanfit',
}

export function scenarioIdFromSlug(slug: string | undefined): ScenarioId | null {
  if (!slug) return null
  return SLUG_TO_ID[slug.trim().toLowerCase()] ?? null
}

export function scenarioSlug(id: ScenarioId): string {
  return ID_TO_SLUG[id]
}
