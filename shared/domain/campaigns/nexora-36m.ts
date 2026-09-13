/**
 * Nexora — published 36-month SaaS campaign content (version 1).
 * Location: shared/domain/campaigns/nexora-36m.ts
 */
import { CAMPAIGN_DURATION_MONTHS, openingTemplateFromScenario } from '../campaign.ts'
import { getScenario } from '../scenarios.ts'
import type { CampaignDefinition, SituationTemplate } from '../types.ts'

function sit(
  partial: Omit<SituationTemplate, 'version' | 'cooldownDays' | 'deadlineDays' | 'visibility'> &
    Partial<Pick<SituationTemplate, 'version' | 'cooldownDays' | 'deadlineDays' | 'visibility'>>,
): SituationTemplate {
  return {
    version: 1,
    cooldownDays: 90,
    deadlineDays: 14,
    visibility: 'player_visible',
    ...partial,
  }
}

/** ≥35 situation/event families across four campaign phases. */
export function buildNexoraSituations(): SituationTemplate[] {
  const opening = openingTemplateFromScenario(getScenario('nexora-saas'))

  const phase1: SituationTemplate[] = [
    opening,
    sit({
      id: 'nx-translog-renewal',
      familyId: 'translog-renewal',
      title: 'TransLog-Renewal',
      context:
        'TransLog (~18 % ARR) steht zur Verlängerung. Konditionen, Scope und Abhängigkeit neu verhandeln.',
      priority: 95,
      exclusionGroup: 'phase1-enterprise',
      trigger: { minMonth: 0, maxMonth: 5 },
    }),
    sit({
      id: 'nx-ai-dispatch-platform',
      familyId: 'ai-dispatch-platform',
      title: 'Generische AI-Dispatch-Plattform',
      context: 'Build vs. Extend: generische Dispatch-Plattform vs. kundenspezifische Lieferungen.',
      priority: 93,
      exclusionGroup: 'phase1-product',
      trigger: { minMonth: 0, maxMonth: 5 },
    }),
    sit({
      id: 'nx-eng-allocation',
      familyId: 'eng-allocation',
      title: 'Engineering Allocation',
      context: 'Kapazität zwischen Platform, Customer Delivery und Tech Debt verteilen.',
      priority: 90,
      trigger: { minMonth: 0, maxMonth: 6, minDecisions: 1 },
    }),
    sit({
      id: 'nx-hiring-runway',
      familyId: 'hiring-runway',
      title: 'Hiring & Runway',
      context: 'Hiring-Plan vs. Runway. Tempo, Rollenmix und Burn steuern.',
      priority: 88,
      trigger: { minMonth: 1, maxMonth: 6, minDecisions: 1 },
    }),
    sit({
      id: 'nx-delivery-delay',
      familyId: 'delivery-delay',
      title: 'Delivery Delay',
      context: 'Ein Enterprise-Delivery droht zu rutschen. Scope cut, Staffing oder Eskalation?',
      priority: 86,
      trigger: {
        minMonth: 2,
        maxMonth: 8,
        minDecisions: 2,
        requiresResolvedTemplateIds: ['nx-translog-renewal'],
      },
    }),
    sit({
      id: 'nx-design-partner',
      familyId: 'design-partner',
      title: 'Design-Partner-Akzeptanz',
      context: 'Design Partner bewerten die AI-Dispatch-Roadmap. Commitment oder Pivot?',
      priority: 84,
      trigger: {
        minMonth: 2,
        maxMonth: 8,
        minDecisions: 2,
        requiresResolvedTemplateIds: ['nx-ai-dispatch-platform'],
      },
    }),
    sit({
      id: 'nx-midmarket-winloss',
      familyId: 'midmarket-winloss',
      title: 'Mid-Market Win/Loss',
      context: 'Mid-Market Pipeline schwankt. Pricing, Packaging oder Segmentfokus anpassen?',
      priority: 78,
      trigger: { minMonth: 3, maxMonth: 9, minDecisions: 2 },
    }),
    sit({
      id: 'nx-integration-debt',
      familyId: 'integration-debt',
      title: 'Integrationsschuld',
      context: 'Integrationen und Custom Work belasten die Plattform. Debt abbauen oder weiter liefern?',
      priority: 80,
      trigger: { minMonth: 3, maxMonth: 10, minDecisions: 3 },
    }),
    sit({
      id: 'nx-hidden-churn-signal',
      familyId: 'translog-renewal',
      title: 'Internes Churn-Signal',
      context: 'Authoring-only early warning.',
      priority: 99,
      visibility: 'hidden',
      trigger: { minMonth: 1, maxMonth: 6, minDecisions: 1 },
    }),
  ]

  const phase2: SituationTemplate[] = [
    sit({
      id: 'nx-pricing-packaging',
      familyId: 'pricing-packaging',
      title: 'Pricing & Paketierung',
      context: 'Pakete, Seats und Usage neu schneiden — Wirkung auf NRR und Sales Motion.',
      priority: 88,
      exclusionGroup: 'phase2-monetization',
      trigger: { minMonth: 6, maxMonth: 14, minDecisions: 3 },
    }),
    sit({
      id: 'nx-usage-pricing',
      familyId: 'usage-pricing',
      title: 'Usage-basiertes Pricing',
      context: 'Shift zu Usage kann Expansion heben, Forecast und Enterprise-Deals erschweren.',
      priority: 84,
      exclusionGroup: 'phase2-monetization',
      trigger: { minMonth: 6, maxMonth: 14, minDecisions: 3 },
    }),
    sit({
      id: 'nx-sales-segment',
      familyId: 'sales-segment',
      title: 'Sales-Segmentfokus',
      context: 'Enterprise vs. Mid-Market Quota und Coverage neu ausrichten.',
      priority: 86,
      trigger: { minMonth: 6, maxMonth: 15, minDecisions: 3 },
    }),
    sit({
      id: 'nx-customer-success',
      familyId: 'customer-success',
      title: 'Customer Success Ausbau',
      context: 'CS-Kapazität und Playbooks gegen Churn und Expansion.',
      priority: 82,
      trigger: { minMonth: 7, maxMonth: 15, minDecisions: 4 },
    }),
    sit({
      id: 'nx-international',
      familyId: 'international',
      title: 'Internationalisierung vs. DACH',
      context: 'Expansion außerhalb DACH vs. Vertiefung im Kernmarkt.',
      priority: 80,
      exclusionGroup: 'phase2-geo',
      trigger: { minMonth: 7, maxMonth: 15, minDecisions: 4 },
    }),
    sit({
      id: 'nx-dach-focus',
      familyId: 'dach-focus',
      title: 'DACH-Fokus vertiefen',
      context: 'Kapital und GTM auf DACH bündeln — Internationalisierung verschieben.',
      priority: 78,
      exclusionGroup: 'phase2-geo',
      trigger: { minMonth: 7, maxMonth: 15, minDecisions: 4 },
    }),
    sit({
      id: 'nx-funding-timing',
      familyId: 'funding-timing',
      title: 'Funding Timing',
      context: 'Runway und Valuation: jetzt raisen, bridge, oder Profitabilität priorisieren?',
      priority: 92,
      trigger: { minMonth: 6, maxMonth: 15, minDecisions: 4, metrics: { cashCents: { max: 400_000_000 } } },
    }),
    sit({
      id: 'nx-vp-eng',
      familyId: 'vp-eng',
      title: 'VP Engineering Leadership',
      context: 'Leadership-Lücke in Engineering. Hire, promote oder Interimsmodell?',
      priority: 76,
      exclusionGroup: 'phase2-leadership',
      trigger: { minMonth: 8, maxMonth: 15, minDecisions: 5 },
    }),
    sit({
      id: 'nx-vp-product',
      familyId: 'vp-product',
      title: 'VP Product Leadership',
      context: 'Product Leadership stärken — Bar vs. Speed im Hiring.',
      priority: 74,
      exclusionGroup: 'phase2-leadership',
      trigger: { minMonth: 8, maxMonth: 15, minDecisions: 5 },
    }),
  ]

  const phase3: SituationTemplate[] = [
    sit({
      id: 'nx-enterprise-org',
      familyId: 'enterprise-org',
      title: 'Enterprise vs. Mid-Market Org',
      context: 'Organisationsschnitt: getrennte Motions oder eine integrierte GTM-Org?',
      priority: 88,
      exclusionGroup: 'phase3-org',
      trigger: { minMonth: 15, maxMonth: 26, minDecisions: 8 },
    }),
    sit({
      id: 'nx-midmarket-org',
      familyId: 'midmarket-org',
      title: 'Mid-Market Org skalieren',
      context: 'Mid-Market Motion mit eigenen Playbooks und Economics ausbauen.',
      priority: 84,
      exclusionGroup: 'phase3-org',
      trigger: { minMonth: 15, maxMonth: 26, minDecisions: 8 },
    }),
    sit({
      id: 'nx-platform-teams',
      familyId: 'platform-teams',
      title: 'Plattformteams vs. Produkt-Squads',
      context: 'Teamtopologie: zentrale Plattform oder end-to-end Squads?',
      priority: 82,
      exclusionGroup: 'phase3-teams',
      trigger: { minMonth: 16, maxMonth: 27, minDecisions: 9 },
    }),
    sit({
      id: 'nx-product-squads',
      familyId: 'product-squads',
      title: 'Produkt-Squads stärken',
      context: 'Mehr Ownership in Squads — Trade-off gegen Plattform-Konsistenz.',
      priority: 80,
      exclusionGroup: 'phase3-teams',
      trigger: { minMonth: 16, maxMonth: 27, minDecisions: 9 },
    }),
    sit({
      id: 'nx-data-ai-fn',
      familyId: 'data-ai-fn',
      title: 'Zentralisierte Data/AI-Funktion',
      context: 'Data/AI als zentrale Capability vs. embedded in Product.',
      priority: 78,
      trigger: { minMonth: 16, maxMonth: 27, minDecisions: 9 },
    }),
    sit({
      id: 'nx-clevel-hire',
      familyId: 'clevel-hire',
      title: 'C-Level Hiring',
      context: 'CFO/COO/CRO Timing und Kultur-Fit gegen Runway und Board-Druck.',
      priority: 86,
      trigger: { minMonth: 15, maxMonth: 27, minDecisions: 8, metrics: { cashCents: { min: 100_000_000 } } },
    }),
    sit({
      id: 'nx-strategic-partner',
      familyId: 'strategic-partner',
      title: 'Akquisition / strategische Partnerschaft',
      context: 'Buy vs. Build: Capability oder Marktzugang über Deal sichern?',
      priority: 84,
      trigger: { minMonth: 17, maxMonth: 27, minDecisions: 10, metrics: { cashCents: { min: 200_000_000 } } },
    }),
    sit({
      id: 'nx-logo-churn',
      familyId: 'logo-churn',
      title: 'Großkunde churnt',
      context: 'Ein Enterprise-Logo droht abzuspringen. Save, Replace oder Portfolio-Schnitt?',
      priority: 96,
      trigger: { minMonth: 15, maxMonth: 28, minDecisions: 8, probabilityBps: 3_500 },
    }),
    sit({
      id: 'nx-security-incident',
      familyId: 'security-incident',
      title: 'Security/Availability Incident',
      context: 'Incident Response, Kundenkommunikation und Tech-Invest priorisieren.',
      priority: 97,
      trigger: { minMonth: 16, maxMonth: 28, minDecisions: 9, probabilityBps: 3_000 },
    }),
  ]

  const phase4: SituationTemplate[] = [
    sit({
      id: 'nx-profit-vs-growth',
      familyId: 'profit-vs-growth',
      title: 'Profitabilität vs. Wachstum',
      context: 'Rule of 40 und Board: Wachstum drosseln oder weiter investieren?',
      priority: 90,
      trigger: { minMonth: 27, maxMonth: 35, minDecisions: 12 },
    }),
    sit({
      id: 'nx-expansion',
      familyId: 'expansion',
      title: 'Expansion Motion',
      context: 'Land-and-expand vs. new logos — Kapazität und Incentive-Design.',
      priority: 82,
      trigger: { minMonth: 27, maxMonth: 35, minDecisions: 12 },
    }),
    sit({
      id: 'nx-board-funding',
      familyId: 'board-funding',
      title: 'Board & Funding',
      context: 'Nächste Finanzierungsrunde, Secondary oder Path to Profitability kommunizieren.',
      priority: 88,
      trigger: { minMonth: 28, maxMonth: 35, minDecisions: 13 },
    }),
    sit({
      id: 'nx-portfolio-focus',
      familyId: 'portfolio-focus',
      title: 'Portfolio-Fokus',
      context: 'Produktlinien schärfen oder breit halten — OpEx und Roadmap klarziehen.',
      priority: 80,
      trigger: { minMonth: 28, maxMonth: 35, minDecisions: 13 },
    }),
    sit({
      id: 'nx-leadership-succession',
      familyId: 'leadership-succession',
      title: 'Leadership Succession',
      context: 'Schlüsselrollen und Founder-Abhängigkeit für die nächste Phase absichern.',
      priority: 84,
      trigger: { minMonth: 29, maxMonth: 35, minDecisions: 14 },
    }),
    sit({
      id: 'nx-nrr-push',
      familyId: 'nrr-push',
      title: 'NRR-Hebel',
      context: 'Expansion, Packaging und CS gegen NRR-Ziele kalibrieren.',
      priority: 78,
      trigger: { minMonth: 27, maxMonth: 35, minDecisions: 12 },
    }),
    sit({
      id: 'nx-tech-debt-final',
      familyId: 'tech-debt-final',
      title: 'Tech-Debt Endgame',
      context: 'Platform Health vor dem Horizont: Debt vs. Feature Freeze.',
      priority: 76,
      trigger: { minMonth: 30, maxMonth: 35, minDecisions: 14 },
    }),
    sit({
      id: 'nx-final-debrief',
      familyId: 'final-debrief',
      title: '36-Monats-Debrief vorbereiten',
      context: 'Outcome, Decision Quality und strategisches Profil board-fähig trennen.',
      priority: 65,
      cooldownDays: 365,
      trigger: { minMonth: 34, maxMonth: 35, minDecisions: 16 },
    }),
  ]

  return [...phase1, ...phase2, ...phase3, ...phase4]
}

export const NEXORA_CAMPAIGN_ID = 'nexora-saas-36m' as const

export function nexoraCampaignV1(): CampaignDefinition {
  return {
    id: NEXORA_CAMPAIGN_ID,
    version: 1,
    scenarioId: 'nexora-saas',
    durationMonths: CAMPAIGN_DURATION_MONTHS,
    situations: buildNexoraSituations(),
  }
}

export function nexoraSituationFamilyCount(): number {
  return new Set(buildNexoraSituations().map((item) => item.familyId)).size
}
