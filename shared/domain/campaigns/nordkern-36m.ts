/**
 * Nordkern Foods — published 36-month campaign content (version 1).
 * Location: shared/domain/campaigns/nordkern-36m.ts
 * Immutable once published; runtime evaluates eligibility from WorldState + clock + decisions.
 */
import { CAMPAIGN_DURATION_MONTHS, openingTemplateFromScenario } from '../campaign.ts'
import { getScenario } from '../scenarios.ts'
import type { CampaignDefinition, SituationTemplate } from '../types.ts'

function sit(
  partial: Omit<SituationTemplate, 'version'> & { version?: number },
): SituationTemplate {
  return {
    version: 1,
    ...partial,
  }
}

/** ≥35 situation/event families across four campaign phases. */
export function buildNordkernSituations(): SituationTemplate[] {
  const scenario = getScenario('nordkern-foods')
  const opening = openingTemplateFromScenario(scenario)

  const phase1: SituationTemplate[] = [
    opening,
    sit({
      id: 'nk-thueringen-automation',
      familyId: 'thueringen-automation',
      title: 'Thüringen-Automatisierung',
      context:
        'Der Pilot in Thüringen verlangt CAPEX, Umschulung und klare Erfolgskriterien — ohne Kapazität zu verlieren.',
      priority: 95,
      cooldownDays: 90,
      deadlineDays: 21,
      visibility: 'player_visible',
      exclusionGroup: 'phase1-capex',
      trigger: { minMonth: 0, maxMonth: 5, minDecisions: 0 },
    }),
    sit({
      id: 'nk-lidl-margin',
      familyId: 'lidl-margin',
      title: 'Lidl-Mindestmarge & Promotions',
      context:
        'Lidl fordert aggressivere Konditionen. Mindestmarge, Promo-Volumen und langfristige Abhängigkeit stehen zur Disposition.',
      priority: 92,
      cooldownDays: 60,
      deadlineDays: 14,
      visibility: 'player_visible',
      exclusionGroup: 'phase1-customer',
      trigger: { minMonth: 0, maxMonth: 5, minDecisions: 0 },
    }),
    sit({
      id: 'nk-capacity-crunch',
      familyId: 'capacity-crunch',
      title: 'Knappe Produktionskapazität',
      context:
        'Auslastung nahe dem Limit. Priorisieren Sie Aufträge, Schichten oder kurzfristige Entlastung.',
      priority: 88,
      cooldownDays: 45,
      deadlineDays: 10,
      visibility: 'player_visible',
      trigger: { minMonth: 1, maxMonth: 6, minDecisions: 1 },
    }),
    sit({
      id: 'nk-startup-issues',
      familyId: 'startup-issues',
      title: 'Anlaufprobleme Automatisierung',
      context:
        'Der Thüringen-Pilot stockt. Entscheiden Sie zwischen Nacharbeit, Pause oder Rollout-Stopp.',
      priority: 85,
      cooldownDays: 60,
      deadlineDays: 12,
      visibility: 'player_visible',
      trigger: {
        minMonth: 2,
        maxMonth: 8,
        minDecisions: 1,
        requiresResolvedTemplateIds: ['nk-thueringen-automation'],
      },
    }),
    sit({
      id: 'nk-shift-conflict',
      familyId: 'shift-conflict',
      title: 'Schichtkonflikte',
      context:
        'Schichtpläne und Überstunden belasten Morale und Betriebsrat. Braucht es Tarif-Nachjustierung oder Kapazitätsabbau?',
      priority: 70,
      cooldownDays: 50,
      deadlineDays: 10,
      visibility: 'player_visible',
      trigger: { minMonth: 2, maxMonth: 8, minDecisions: 1, metrics: { moraleBps: { max: 5_800 } } },
    }),
    sit({
      id: 'nk-works-council',
      familyId: 'works-council',
      title: 'Betriebsrat-Verhandlung',
      context:
        'Der Betriebsrat fordert Mitbestimmung bei Automatisierung und Schichtmodellen.',
      priority: 72,
      cooldownDays: 90,
      deadlineDays: 14,
      visibility: 'player_visible',
      trigger: { minMonth: 3, maxMonth: 9, minDecisions: 2 },
    }),
    sit({
      id: 'nk-retailer-reaction',
      familyId: 'retailer-reaction',
      title: 'Händlerreaktion auf Konditionen',
      context:
        'Weitere LEH-Kunden reagieren auf Lidl-Konditionen. Volume vs. Marge neu kalibrieren.',
      priority: 74,
      cooldownDays: 60,
      deadlineDays: 12,
      visibility: 'player_visible',
      trigger: {
        minMonth: 3,
        maxMonth: 10,
        minDecisions: 1,
        requiresResolvedTemplateIds: ['nk-lidl-margin'],
      },
    }),
    sit({
      id: 'nk-promo-opportunity-cost',
      familyId: 'promo-opportunity-cost',
      title: 'Opportunitätskosten schlechter Promotions',
      context:
        'Promotions fressen Marge und Kapazität. Kürzen, umstellen oder Premium-Mix stärken?',
      priority: 68,
      cooldownDays: 45,
      deadlineDays: 10,
      visibility: 'player_visible',
      trigger: { minMonth: 3, maxMonth: 10, minDecisions: 2 },
    }),
    sit({
      id: 'nk-hidden-margin-signal',
      familyId: 'lidl-margin',
      title: 'Internes Margensignal',
      context: 'Authoring-only early warning on margin erosion.',
      priority: 99,
      cooldownDays: 120,
      deadlineDays: 7,
      visibility: 'hidden',
      trigger: { minMonth: 1, maxMonth: 6, minDecisions: 1 },
    }),
  ]

  const phase2: SituationTemplate[] = [
    sit({
      id: 'nk-second-plant',
      familyId: 'second-plant',
      title: 'Zweites Werk vs. Debottlenecking',
      context:
        'Skalierung: Greenfield/Brownfield-Werk oder gezieltes Debottlenecking der bestehenden Linien?',
      priority: 90,
      cooldownDays: 180,
      deadlineDays: 21,
      visibility: 'player_visible',
      exclusionGroup: 'phase2-scale',
      trigger: { minMonth: 6, maxMonth: 14, minDecisions: 3, metrics: { cashCents: { min: 1 } } },
    }),
    sit({
      id: 'nk-debottleneck',
      familyId: 'debottleneck',
      title: 'Debottlenecking-Programm',
      context:
        'Engpassanalyse zeigt CAPEX-leichte Hebel. Tempo und Investitionsdisziplin abwägen.',
      priority: 86,
      cooldownDays: 120,
      deadlineDays: 18,
      visibility: 'player_visible',
      exclusionGroup: 'phase2-scale',
      trigger: { minMonth: 6, maxMonth: 14, minDecisions: 3 },
    }),
    sit({
      id: 'nk-premium-mix',
      familyId: 'premium-mix',
      title: 'Premium-Produktmix',
      context:
        'Shift zu Premium kann Marge heben, aber Volume und Handelspartner belasten.',
      priority: 78,
      cooldownDays: 90,
      deadlineDays: 14,
      visibility: 'player_visible',
      trigger: { minMonth: 6, maxMonth: 15, minDecisions: 3 },
    }),
    sit({
      id: 'nk-foodservice',
      familyId: 'foodservice',
      title: 'Foodservice-Ausbau',
      context:
        'Foodservice-Kanal öffnet Diversifikation — mit anderen Specs, Logistik und Forderungslaufzeiten.',
      priority: 76,
      cooldownDays: 90,
      deadlineDays: 14,
      visibility: 'player_visible',
      trigger: { minMonth: 7, maxMonth: 15, minDecisions: 4 },
    }),
    sit({
      id: 'nk-supplier-terms',
      familyId: 'supplier-terms',
      title: 'Lieferantenkonditionen',
      context:
        'Rohstoffpartner fordern Indexierung. Verhandeln, Dual-Sourcing oder Spezifikation ändern?',
      priority: 80,
      cooldownDays: 75,
      deadlineDays: 12,
      visibility: 'player_visible',
      trigger: { minMonth: 6, maxMonth: 15, minDecisions: 3 },
    }),
    sit({
      id: 'nk-quality-recall',
      familyId: 'quality-recall',
      title: 'Qualitätsereignis / Rückrufrisiko',
      context:
        'Ein Qualitätsvorfall droht. Sofortmaßnahmen, Kommunikation und CAPA priorisieren.',
      priority: 94,
      cooldownDays: 180,
      deadlineDays: 7,
      visibility: 'player_visible',
      trigger: { minMonth: 8, maxMonth: 18, minDecisions: 4, probabilityBps: 4_500 },
    }),
    sit({
      id: 'nk-reskilling',
      familyId: 'reskilling',
      title: 'Umschulung vs. Nichtnachbesetzung',
      context:
        'Automatisierung verändert Skill-Bedarf. Umschulen, natürliche Fluktuation oder aktiver Abbau?',
      priority: 73,
      cooldownDays: 90,
      deadlineDays: 14,
      visibility: 'player_visible',
      exclusionGroup: 'phase2-people',
      trigger: { minMonth: 7, maxMonth: 15, minDecisions: 4 },
    }),
    sit({
      id: 'nk-headcount-cut',
      familyId: 'headcount-cut',
      title: 'Aktiver Personalabbau',
      context:
        'Kosten- und Kapazitätsdruck legen Abbau nahe — mit Betriebsrat, Image und Know-how-Risiko.',
      priority: 71,
      cooldownDays: 120,
      deadlineDays: 14,
      visibility: 'player_visible',
      exclusionGroup: 'phase2-people',
      trigger: { minMonth: 7, maxMonth: 15, minDecisions: 4, metrics: { cashCents: { max: 8_000_000_000 } } },
    }),
    sit({
      id: 'nk-span-of-control',
      familyId: 'span-of-control',
      title: 'Führungsspannen & Werkleitung',
      context:
        'Werkleitungskapazität und Span of Control begrenzen weitere Skalierung.',
      priority: 69,
      cooldownDays: 90,
      deadlineDays: 12,
      visibility: 'player_visible',
      trigger: { minMonth: 8, maxMonth: 16, minDecisions: 5 },
    }),
  ]

  const phase3: SituationTemplate[] = [
    sit({
      id: 'nk-acquisition-jv',
      familyId: 'acquisition-jv',
      title: 'Akquisition / Joint Venture',
      context:
        'Eine regionale Marke oder Kapazität steht zum Einstieg. Cash, Integration und Governance prüfen.',
      priority: 88,
      cooldownDays: 200,
      deadlineDays: 21,
      visibility: 'player_visible',
      exclusionGroup: 'phase3-portfolio',
      trigger: { minMonth: 15, maxMonth: 26, minDecisions: 8, metrics: { cashCents: { min: 2_000_000_000 } } },
    }),
    sit({
      id: 'nk-organic-growth',
      familyId: 'organic-growth',
      title: 'Organischer Ausbau',
      context:
        'Statt M&A: Linien erweitern und Marken organisch pushen — langsamer, aber kontrollierbarer.',
      priority: 84,
      cooldownDays: 150,
      deadlineDays: 18,
      visibility: 'player_visible',
      exclusionGroup: 'phase3-portfolio',
      trigger: { minMonth: 15, maxMonth: 26, minDecisions: 8 },
    }),
    sit({
      id: 'nk-private-label',
      familyId: 'private-label',
      title: 'Handelsmarke vs. Premium-Marke',
      context:
        'Handelsmarke sichert Volume; Premium-Marke schützt Positionierung. Portfolio-Gewicht setzen.',
      priority: 79,
      cooldownDays: 120,
      deadlineDays: 14,
      visibility: 'player_visible',
      exclusionGroup: 'phase3-brand',
      trigger: { minMonth: 15, maxMonth: 27, minDecisions: 8 },
    }),
    sit({
      id: 'nk-premium-brand',
      familyId: 'premium-brand',
      title: 'Eigene Premium-Marke stärken',
      context:
        'Invest in Marke, Innovation und Listungen — zulasten kurzfristiger Handelsmarken-Volume.',
      priority: 77,
      cooldownDays: 120,
      deadlineDays: 14,
      visibility: 'player_visible',
      exclusionGroup: 'phase3-brand',
      trigger: { minMonth: 15, maxMonth: 27, minDecisions: 8 },
    }),
    sit({
      id: 'nk-central-plants',
      familyId: 'central-plants',
      title: 'Zentrale vs. autonome Werkssteuerung',
      context:
        'Steuerungsmodell der drei Werke: zentrale Standards oder lokale Autonomie?',
      priority: 75,
      cooldownDays: 150,
      deadlineDays: 16,
      visibility: 'player_visible',
      exclusionGroup: 'phase3-governance',
      trigger: { minMonth: 16, maxMonth: 27, minDecisions: 9 },
    }),
    sit({
      id: 'nk-autonomous-plants',
      familyId: 'autonomous-plants',
      title: 'Autonome Werkseinheiten',
      context:
        'Mehr lokale Verantwortung kann Tempo bringen — auf Kosten von Synergie und Kontrolle.',
      priority: 73,
      cooldownDays: 150,
      deadlineDays: 16,
      visibility: 'player_visible',
      exclusionGroup: 'phase3-governance',
      trigger: { minMonth: 16, maxMonth: 27, minDecisions: 9 },
    }),
    sit({
      id: 'nk-commodity-shock',
      familyId: 'commodity-shock',
      title: 'Rohstoff-/Energiepreisschock',
      context:
        'Inputkosten springen. Hedging, Preiserhöhung, Spezifikationswechsel oder Absicherung?',
      priority: 96,
      cooldownDays: 180,
      deadlineDays: 10,
      visibility: 'player_visible',
      trigger: { minMonth: 15, maxMonth: 28, minDecisions: 8, probabilityBps: 3_800 },
    }),
    sit({
      id: 'nk-supplier-outage',
      familyId: 'supplier-outage',
      title: 'Ausfall kritischer Lieferant',
      context:
        'Ein Schlüssel-Lieferant fällt aus. Dual-Sourcing, Buffer oder Produktschnitt?',
      priority: 93,
      cooldownDays: 160,
      deadlineDays: 8,
      visibility: 'player_visible',
      trigger: { minMonth: 16, maxMonth: 28, minDecisions: 9, probabilityBps: 3_200 },
    }),
    sit({
      id: 'nk-debt-discipline',
      familyId: 'debt-discipline',
      title: 'Verschuldung & Free Cash',
      context:
        'Banken und Eigentümer fordern klarere Debt-/Cash-Disziplin vor weiterer Expansion.',
      priority: 82,
      cooldownDays: 120,
      deadlineDays: 14,
      visibility: 'player_visible',
      trigger: { minMonth: 17, maxMonth: 27, minDecisions: 10 },
    }),
  ]

  const phase4: SituationTemplate[] = [
    sit({
      id: 'nk-reinvestment',
      familyId: 'reinvestment',
      title: 'Reinvestitionsplan',
      context:
        '36-Monats-Horizont: wohin fließt Free Cash — Capex, Marke, M&A oder Ausschüttung?',
      priority: 87,
      cooldownDays: 200,
      deadlineDays: 21,
      visibility: 'player_visible',
      trigger: { minMonth: 27, maxMonth: 35, minDecisions: 12 },
    }),
    sit({
      id: 'nk-customer-concentration',
      familyId: 'customer-concentration',
      title: 'Kundenkonzentration',
      context:
        'Abhängigkeit von wenigen LEH-Kunden bleibt hoch. Diversifikation oder bewusstes Risiko?',
      priority: 85,
      cooldownDays: 150,
      deadlineDays: 16,
      visibility: 'player_visible',
      trigger: { minMonth: 27, maxMonth: 35, minDecisions: 12 },
    }),
    sit({
      id: 'nk-key-succession',
      familyId: 'key-succession',
      title: 'Nachfolge Schlüsselrollen',
      context:
        'Werkleitung und Key Account drohen zu gehen. Nachfolge, Retention oder Reorganisation?',
      priority: 83,
      cooldownDays: 180,
      deadlineDays: 18,
      visibility: 'player_visible',
      trigger: { minMonth: 28, maxMonth: 35, minDecisions: 13 },
    }),
    sit({
      id: 'nk-capex-discipline',
      familyId: 'capex-discipline',
      title: 'Capex-Disziplin',
      context:
        'Board verlangt strengere Hurdle Rates und Portfolio-Reviews für Capex.',
      priority: 81,
      cooldownDays: 120,
      deadlineDays: 14,
      visibility: 'player_visible',
      trigger: { minMonth: 28, maxMonth: 35, minDecisions: 13 },
    }),
    sit({
      id: 'nk-owner-expectations',
      familyId: 'owner-expectations',
      title: 'Eigentümer-/Board-Erwartungen',
      context:
        'Eigentümer setzen Dividenden- und Wertsteigerungsziele. Strategie und Kommunikation abstimmen.',
      priority: 90,
      cooldownDays: 200,
      deadlineDays: 21,
      visibility: 'player_visible',
      trigger: { minMonth: 30, maxMonth: 35, minDecisions: 14 },
    }),
    sit({
      id: 'nk-exit-readiness',
      familyId: 'exit-readiness',
      title: 'Exit-/Wertsteigerungsbereitschaft',
      context:
        'Optionaler Pfad: Reporting, Governance und Equity Story für einen möglichen Exit schärfen.',
      priority: 70,
      cooldownDays: 200,
      deadlineDays: 21,
      visibility: 'player_visible',
      trigger: { minMonth: 31, maxMonth: 35, minDecisions: 15, probabilityBps: 5_000 },
    }),
    sit({
      id: 'nk-esg-compliance',
      familyId: 'esg-compliance',
      title: 'ESG- & Compliance-Druck',
      context:
        'Kunden und Regulatoren fordern nachvollziehbare ESG- und Rückverfolgbarkeitsstandards.',
      priority: 76,
      cooldownDays: 150,
      deadlineDays: 16,
      visibility: 'player_visible',
      trigger: { minMonth: 27, maxMonth: 35, minDecisions: 12 },
    }),
    sit({
      id: 'nk-final-debrief-gate',
      familyId: 'final-debrief',
      title: '36-Monats-Debrief vorbereiten',
      context:
        'Horizont naht: Outcome, Decision Quality und strategisches Profil trennen und Board-fähig machen.',
      priority: 65,
      cooldownDays: 365,
      deadlineDays: 14,
      visibility: 'player_visible',
      trigger: { minMonth: 34, maxMonth: 35, minDecisions: 16 },
    }),
  ]

  return [...phase1, ...phase2, ...phase3, ...phase4]
}

export const NORDKERN_CAMPAIGN_ID = 'nordkern-foods-36m' as const

/** Published immutable Nordkern 36-month campaign v1. */
export function nordkernCampaignV1(): CampaignDefinition {
  const situations = buildNordkernSituations()
  return {
    id: NORDKERN_CAMPAIGN_ID,
    version: 1,
    scenarioId: 'nordkern-foods',
    durationMonths: CAMPAIGN_DURATION_MONTHS,
    situations,
  }
}

export function nordkernSituationFamilyCount(): number {
  return new Set(buildNordkernSituations().map((item) => item.familyId)).size
}
