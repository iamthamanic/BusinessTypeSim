import type { ScenarioDefinition, ScenarioId, WorldModules } from './types.ts'
import { nexoraWorldV2, nordkernWorldV2 } from './world-fixtures.ts'

const commonMetricDefinitions: ScenarioDefinition['metricDefinitions'] = [
  { key: 'revenueAnnualCents', label: 'Umsatz / ARR', format: 'currency' },
  { key: 'ebitdaAnnualCents', label: 'EBITDA', format: 'currency' },
  { key: 'cashCents', label: 'Cash', format: 'currency' },
  { key: 'headcount', label: 'Mitarbeitende', format: 'integer' },
  { key: 'moraleBps', label: 'Organisation', format: 'percent' },
  { key: 'resilienceBps', label: 'Resilienz', format: 'percent' },
]

/** Published V1 snapshots (immutable). World State V2 editions are appended below. */
const scenarioCatalogV1: ScenarioDefinition[] = [
  {
    id: 'nexora-saas',
    version: 1,
    companyName: 'Nexora',
    industry: 'B2B SaaS / Logistik',
    stage: 'Scale-up',
    scaleLabel: '11,8 Mio. € ARR · 84 Mitarbeitende',
    headline: 'Großkunde oder Plattform?',
    description: 'Ein schnell wachsendes Dispatching-SaaS muss zwischen Enterprise-Anpassung, AI-Roadmap und Runway balancieren.',
    decisionTitle: 'TransLog Renewal',
    decisionContext: 'TransLog steht für rund 18 % des ARR und verlängert in sieben Monaten. Ein kundenspezifisches Routing-Projekt erhöht die Renewal-Chance, bindet aber einen großen Teil des Engineering-Teams. Gleichzeitig verliert Nexora Mid-Market-Deals wegen fehlender AI-Dispatch-Funktionen.',
    deadlineDays: 14,
    startingMetrics: {
      revenueAnnualCents: 1_180_000_000,
      ebitdaAnnualCents: -160_000_000,
      cashCents: 520_000_000,
      headcount: 84,
      capacityUtilizationBps: 8200,
      customerConcentrationBps: 1800,
      moraleBps: 7200,
      resilienceBps: 5600,
      marketPositionBps: 6100,
    },
    metricDefinitions: commonMetricDefinitions,
    knownFacts: [
      'TransLog liefert 2,1 Mio. € ARR und verlängert in sieben Monaten.',
      '32 Software Engineers arbeiten im Unternehmen.',
      '68 % der aktuellen Pipeline liegt im Mid-Market.',
      'Der aktuelle Cash-Burn liegt bei rund 260.000 € pro Monat.',
    ],
    analyses: [
      {
        id: 'saas-lost-deals',
        title: 'Lost-Deal-Analyse',
        description: 'Sales Operations analysiert verlorene Deals nach Segment und Kaufgrund.',
        durationDays: 3,
        resultTitle: 'AI ist vor allem im Mid-Market relevant',
        resultBody: 'Von 31 verlorenen Deals liegen 22 im Mid-Market. Bei 14 war fehlendes AI Dispatch der Hauptgrund, bei weiteren 9 ein wichtiger Mitgrund. Das maximale ARR dieser 31 Deals liegt bei etwa 2,85 Mio. €.',
        confidence: 'high',
        evidenceTags: ['market', 'sales', 'ai'],
      },
      {
        id: 'saas-architecture',
        title: 'CTO Plattformanalyse',
        description: 'Der CTO trennt wiederverwendbare Plattformanforderungen von TransLog-Sonderlogik.',
        durationDays: 4,
        resultTitle: '60 % der Anforderungen sind generisch',
        resultBody: 'Rund 60 % der TransLog-Anforderungen können als generische Dispatching-Plattform umgesetzt werden. Die restlichen 40 % liegen vor allem in Depotregeln und proprietären Integrationen.',
        confidence: 'medium',
        evidenceTags: ['technical', 'optionality'],
      },
      {
        id: 'saas-runway',
        title: 'Runway-Szenarien',
        description: 'Finance simuliert Hiring- und Projektvarianten gegen Cash und Burn.',
        durationDays: 2,
        resultTitle: 'Zusätzliches Team verkürzt Runway merklich',
        resultBody: 'Ein zusätzlicher jährlicher Personalaufwand von rund 700.000 € erhöht den monatlichen Burn auf etwa 315.000–320.000 € und reduziert den Runway grob von 20 auf 16 Monate.',
        confidence: 'high',
        evidenceTags: ['finance', 'runway'],
      },
    ],
    actionRules: [
      {
        kind: 'start_project',
        label: 'Generische AI-Dispatch-Plattform bauen',
        keywords: ['plattform', 'ai', 'dispatch', 'generic', 'generisch'],
        effect: {
          metrics: { cashCents: -55_000_000, moraleBps: -150, marketPositionBps: 450 },
          delayed: {
            days: 180,
            title: 'Plattform-Release',
            body: 'Die neue Dispatching-Plattform erreicht den Markt. Der tatsächliche Effekt hängt von Delivery und Adoption ab.',
            probabilityBps: 7200,
            successMetrics: { revenueAnnualCents: 155_000_000, marketPositionBps: 700, resilienceBps: 350 },
            failureMetrics: { cashCents: -45_000_000, moraleBps: -350, marketPositionBps: -250 },
          },
        },
      },
      {
        kind: 'renegotiate_customer',
        label: 'TransLog-Verlängerung verhandeln',
        keywords: ['translog', 'renewal', 'verlänger', 'vertrag'],
        effect: {
          metrics: { resilienceBps: 100 },
          delayed: {
            days: 150,
            title: 'TransLog entscheidet',
            body: 'TransLog bewertet Produktfortschritt, Integrationen und Wechselkosten neu.',
            probabilityBps: 7600,
            successMetrics: { revenueAnnualCents: 90_000_000, customerConcentrationBps: 350, cashCents: 35_000_000 },
            failureMetrics: { revenueAnnualCents: -210_000_000, customerConcentrationBps: -800, marketPositionBps: -300 },
          },
        },
      },
      {
        kind: 'change_hiring_policy',
        label: 'Engineering gezielt aufstocken',
        keywords: ['hire', 'hiring', 'einstell', 'entwickler', 'engineer'],
        effect: { metrics: { headcount: 6, cashCents: -18_000_000, moraleBps: 120, marketPositionBps: 120 } },
      },
    ],
    scoreRubric: {
      framingKeywords: ['translog', 'mid-market', 'plattform', 'abhängigkeit', 'runway'],
      objectiveKeywords: ['wachstum', 'arr', 'renewal', 'runway', 'plattform', 'optionalität'],
      riskKeywords: ['risiko', 'cash', 'burn', 'abhängigkeit', 'verzöger', 'wechsel'],
      relevantAnalysisIds: ['saas-lost-deals', 'saas-architecture', 'saas-runway'],
    },
    advisors: [
      { id: 'cfo', name: 'Mara Klein', role: 'CFO', stance: 'Cash und Finanzierbarkeit vor Wachstum um jeden Preis.', domains: ['finance', 'runway'] },
      { id: 'cto', name: 'David Chen', role: 'CTO', stance: 'Wiederverwendbare Plattform statt kundenspezifischem Fork.', domains: ['technical', 'product'] },
      { id: 'sales', name: 'Leonie Fischer', role: 'VP Sales', stance: 'TransLog halten, aber Mid-Market-Signal ernst nehmen.', domains: ['sales', 'customer'] },
    ],
  },
  {
    id: 'nordkern-foods',
    version: 1,
    companyName: 'Nordkern Foods',
    industry: 'Lebensmittelproduktion',
    stage: 'Mittelstand',
    scaleLabel: '148 Mio. € Umsatz · 620 Mitarbeitende',
    headline: 'Kapazität wächst, Marge fällt',
    description: 'Drei Werke laufen nahe am Limit, während Händlerdruck und ineffiziente Promotionen die Profitabilität erodieren.',
    decisionTitle: 'Kapazität und Kundenmix',
    decisionContext: 'Der Absatz ist in zwei Jahren um 24 % gestiegen, EBITDA aber um 11 % gefallen. Werke laufen im Mittel zu 91 %. Automatisierung könnte Stückkosten und Engpässe reduzieren; Lidl steht für 19 % Umsatz, aber nur 7,5 % DB-II-Marge.',
    deadlineDays: 21,
    startingMetrics: {
      revenueAnnualCents: 14_800_000_000,
      ebitdaAnnualCents: 940_000_000,
      cashCents: 2_400_000_000,
      headcount: 620,
      capacityUtilizationBps: 9100,
      customerConcentrationBps: 1900,
      moraleBps: 6800,
      resilienceBps: 6100,
      marketPositionBps: 6500,
    },
    metricDefinitions: commonMetricDefinitions,
    knownFacts: [
      'Niedersachsen läuft bei 94 %, Thüringen bei 92 %, NRW bei 84 % Auslastung.',
      'Automatisierung aller Werke würde 14 Mio. € kosten und langfristig rund 15–18 % Kapazität schaffen.',
      'Lidl steht für 28 Mio. € Umsatz und rund 2,1 Mio. € DB II.',
      'Premium Bowls liefern etwa 21 % DB-II-Marge, Promo-/Sonderartikel etwa 4 %.',
    ],
    analyses: [
      {
        id: 'food-profitability',
        title: 'Profitabilität nach Kunde & Produkt',
        description: 'Finance zerlegt Deckungsbeitrag nach Händler, Produktgruppe und Promotion.',
        durationDays: 4,
        resultTitle: 'Rund 40 Mio. € Umsatz liegen unter 7 % DB',
        resultBody: 'Ein erheblicher Anteil knapper Produktionszeit fließt in margenschwache Promotionen und klassische Fertiggerichte. Kleinere Händler/Foodservice liegen im Mittel bei rund 18 % DB II.',
        confidence: 'high',
        evidenceTags: ['finance', 'customer', 'product'],
      },
      {
        id: 'food-automation',
        title: 'Automatisierungs-Pilot Thüringen',
        description: 'COO und HR modellieren Investition, Kapazität und natürliche Fluktuation.',
        durationDays: 5,
        resultTitle: 'Pilot kann Wachstum vor Entlassungen stellen',
        resultBody: 'Ein Thüringen-Pilot kostet grob 7–9 Mio. €. Über zwei bis drei Jahre können 50–65 von 70–90 möglichen Stellenreduktionen gruppenweit wahrscheinlich über natürliche Fluktuation und Nichtnachbesetzung erfolgen.',
        confidence: 'medium',
        evidenceTags: ['operations', 'people', 'capex'],
      },
      {
        id: 'food-lidl',
        title: 'Lidl Cost-to-Serve',
        description: 'Sales und Finance prüfen Normalgeschäft gegen Promotions und Vertragsfolgen.',
        durationDays: 3,
        resultTitle: 'Normalgeschäft ist tragbar, Promotions teils fast wertlos',
        resultBody: 'Normale Lidl-Aufträge liegen grob bei 10–11 % DB-II-Marge. Einzelne Promotions fallen auf 2–5 %; unter Engpassbedingungen kann ihr Opportunitätswert negativ sein.',
        confidence: 'high',
        evidenceTags: ['customer', 'margin', 'capacity'],
      },
    ],
    actionRules: [
      {
        kind: 'allocate_capital',
        label: 'Thüringen schrittweise automatisieren',
        keywords: ['automatis', 'thüringen', 'pilot', 'anlage'],
        effect: {
          metrics: { cashCents: -820_000_000, capacityUtilizationBps: -550, moraleBps: -120, resilienceBps: 280 },
          delayed: {
            days: 270,
            title: 'Automatisierungs-Pilot erreicht Regelbetrieb',
            body: 'Kapazität und Stückkosten reagieren auf Implementierungsqualität und Anlaufkurve.',
            probabilityBps: 7800,
            successMetrics: { ebitdaAnnualCents: 180_000_000, capacityUtilizationBps: -500, moraleBps: 180, resilienceBps: 250 },
            failureMetrics: { cashCents: -120_000_000, moraleBps: -420, capacityUtilizationBps: 250 },
          },
        },
      },
      {
        kind: 'renegotiate_customer',
        label: 'Lidl-Geschäft auf Mindestmarge neu verhandeln',
        keywords: ['lidl', 'mindestmarge', 'promotion', 'neu verhandel'],
        effect: {
          metrics: { capacityUtilizationBps: -180, resilienceBps: 120 },
          delayed: {
            days: 90,
            title: 'Lidl reagiert auf neue Konditionen',
            body: 'Ein Teil des Geschäfts wird neu bepreist oder neu ausgeschrieben.',
            probabilityBps: 6000,
            successMetrics: { ebitdaAnnualCents: 95_000_000, revenueAnnualCents: -70_000_000, capacityUtilizationBps: -160 },
            failureMetrics: { revenueAnnualCents: -560_000_000, ebitdaAnnualCents: -65_000_000, customerConcentrationBps: -450 },
          },
        },
      },
      {
        kind: 'prioritize_product',
        label: 'Kapazität auf margenstärkere Produkte verschieben',
        keywords: ['premium', 'marge', 'produktmix', 'kapazität', 'foodservice', 'kleinere händler'],
        effect: { metrics: { revenueAnnualCents: -120_000_000, ebitdaAnnualCents: 85_000_000, capacityUtilizationBps: -220, resilienceBps: 180 } },
      },
      {
        kind: 'change_headcount_plan',
        label: 'Fluktuation und Umschulung statt Massenabbau',
        keywords: ['fluktuation', 'umschul', 'keine kündigung', 'nicht nachbesetz'],
        effect: { metrics: { moraleBps: 350, resilienceBps: 120 } },
      },
    ],
    scoreRubric: {
      framingKeywords: ['marge', 'kapazität', 'lidl', 'auslastung', 'deckungsbeitrag'],
      objectiveKeywords: ['ebitda', 'marge', 'kapazität', 'resilienz', 'wachstum', 'deckungsbeitrag'],
      riskKeywords: ['risiko', 'betriebsrat', 'cash', 'lidl', 'auslastung', 'umsetzung'],
      relevantAnalysisIds: ['food-profitability', 'food-automation', 'food-lidl'],
    },
    advisors: [
      { id: 'cfo', name: 'Saskia Reuter', role: 'CFO', stance: 'Deckungsbeitrag pro knapper Produktionsstunde priorisieren.', domains: ['finance', 'margin'] },
      { id: 'coo', name: 'Martin Vogt', role: 'COO', stance: 'Kapazität sichern, aber Pilotrisiko begrenzen.', domains: ['operations', 'capex'] },
      { id: 'hr', name: 'Aylin Demir', role: 'CHRO', stance: 'Fluktuation, Umschulung und Betriebsrat früh einplanen.', domains: ['people', 'organization'] },
    ],
  },
  {
    id: 'klarwerk-services',
    version: 1,
    companyName: 'Klarwerk Consulting',
    industry: 'Professional Services',
    stage: 'Small Business',
    scaleLabel: '3,2 Mio. € Umsatz · 27 Mitarbeitende',
    headline: 'Der Gründer ist der Engpass',
    description: 'Eine profitable Beratung wächst, aber Vertrieb, Delivery und Kundenbeziehungen hängen zu stark an einer Person.',
    decisionTitle: 'Vom Gründerbetrieb zur Führungsebene',
    decisionContext: 'Der Gründer verkauft 62 % des Neugeschäfts, reviewed fast jedes Projekt und entscheidet über Preise. Zwei Senior-Berater wollen mehr Verantwortung, während ein Großkunde 26 % des Umsatzes stellt.',
    deadlineDays: 30,
    startingMetrics: {
      revenueAnnualCents: 320_000_000,
      ebitdaAnnualCents: 54_000_000,
      cashCents: 92_000_000,
      headcount: 27,
      capacityUtilizationBps: 8800,
      customerConcentrationBps: 2600,
      moraleBps: 7000,
      resilienceBps: 4800,
      marketPositionBps: 5600,
    },
    metricDefinitions: commonMetricDefinitions,
    knownFacts: [
      '62 % des Neugeschäfts wird direkt vom Gründer verkauft.',
      'Ein Großkunde liefert 26 % des Umsatzes.',
      'Zwei Senior-Berater führen informell Teams, aber ohne klare Ergebnisverantwortung.',
      'Die Auslastung liegt bei 88 %, Überstunden nehmen zu.',
    ],
    analyses: [
      {
        id: 'services-client-profit',
        title: 'Kundenprofitabilität',
        description: 'Finance prüft Projektmargen, Zahlungsziele und Scope Creep.',
        durationDays: 3,
        resultTitle: 'Der größte Kunde bindet mehr Senior-Zeit als gedacht',
        resultBody: 'Der Großkunde liefert 26 % Umsatz, aber nur rund 17 % Deckungsbeitrag. Scope Creep und lange Zahlungsziele verschlechtern Cash Conversion.',
        confidence: 'high',
        evidenceTags: ['finance', 'customer'],
      },
      {
        id: 'services-leadership',
        title: 'Leadership Capacity Review',
        description: 'HR bewertet interne Führungskandidaten und Gründerabhängigkeit.',
        durationDays: 4,
        resultTitle: 'Interne Führung ist realistisch',
        resultBody: 'Eine Senior-Beraterin ist kurzfristig für Delivery Leadership geeignet. Der zweite Kandidat ist vertrieblich stark, braucht aber Coaching in People Management.',
        confidence: 'medium',
        evidenceTags: ['people', 'organization'],
      },
      {
        id: 'services-pricing',
        title: 'Pricing Benchmark',
        description: 'Sales Operations vergleicht Tagessätze, Win Rate und Auslastung.',
        durationDays: 2,
        resultTitle: 'Preise liegen unter Markt trotz hoher Auslastung',
        resultBody: 'Die wichtigsten Profile liegen 8–12 % unter vergleichbaren Angeboten. Die Win Rate ist hoch genug, um selektiv höhere Preise zu testen.',
        confidence: 'medium',
        evidenceTags: ['pricing', 'sales'],
      },
    ],
    actionRules: [
      {
        kind: 'restructure_organization',
        label: 'Erste echte Führungsebene einziehen',
        keywords: ['führung', 'lead', 'delegier', 'verantwortung', 'teamleiter'],
        effect: {
          metrics: { moraleBps: 260, resilienceBps: 520, cashCents: -6_000_000 },
          delayed: {
            days: 120,
            title: 'Neue Führungsebene greift',
            body: 'Delivery und Vertrieb werden unabhängiger vom Gründer.',
            probabilityBps: 7400,
            successMetrics: { revenueAnnualCents: 28_000_000, ebitdaAnnualCents: 8_000_000, resilienceBps: 450 },
            failureMetrics: { moraleBps: -350, ebitdaAnnualCents: -4_000_000 },
          },
        },
      },
      {
        kind: 'set_pricing_policy',
        label: 'Preise selektiv erhöhen',
        keywords: ['preis', 'tagessatz', 'pricing', 'rate'],
        effect: { metrics: { revenueAnnualCents: 18_000_000, ebitdaAnnualCents: 9_000_000, capacityUtilizationBps: -120 } },
      },
      {
        kind: 'renegotiate_customer',
        label: 'Großkunden-Scope und Zahlungsziele neu verhandeln',
        keywords: ['großkunde', 'scope', 'zahlungsziel', 'kunde'],
        effect: {
          metrics: { resilienceBps: 180 },
          delayed: {
            days: 60,
            title: 'Großkunde reagiert auf neue Konditionen',
            body: 'Scope und Zahlungsziele werden neu austariert.',
            probabilityBps: 6800,
            successMetrics: { ebitdaAnnualCents: 6_000_000, cashCents: 8_000_000 },
            failureMetrics: { revenueAnnualCents: -32_000_000, customerConcentrationBps: -300 },
          },
        },
      },
    ],
    scoreRubric: {
      framingKeywords: ['gründer', 'engpass', 'führung', 'kunde', 'auslastung'],
      objectiveKeywords: ['delegation', 'resilienz', 'marge', 'wachstum', 'cash', 'führung'],
      riskKeywords: ['risiko', 'kunde', 'fluktuation', 'qualität', 'delegation'],
      relevantAnalysisIds: ['services-client-profit', 'services-leadership', 'services-pricing'],
    },
    advisors: [
      { id: 'finance', name: 'Eva Brandt', role: 'Finance Lead', stance: 'Cash Conversion und Projektmarge sichtbar machen.', domains: ['finance', 'pricing'] },
      { id: 'delivery', name: 'Jonas Weber', role: 'Delivery Lead', stance: 'Entscheidungen und Reviews aus dem Gründerkalender lösen.', domains: ['operations', 'people'] },
      { id: 'sales', name: 'Mila Hoffmann', role: 'Sales Lead', stance: 'Preise und Großkundenabhängigkeit aktiv steuern.', domains: ['sales', 'customer'] },
    ],
  },
  {
    id: 'heliora-clinic',
    version: 1,
    companyName: 'Askolep Klinikgruppe',
    industry: 'Gesundheitswesen',
    stage: 'Mittelstand',
    scaleLabel: '48 Mio. € Umsatz · 410 Mitarbeitende',
    headline: 'Wachstum oder Versorgungsqualität?',
    description: 'Eine regionale Klinikgruppe steht vor einem Übernahmeangebot und gleichzeitigem Fachkräftemangel auf der Station.',
    decisionTitle: 'Übernahme vs. Qualitätsfokus',
    decisionContext: 'Ein Investor bietet 22 Mio. € für eine Minderheitsbeteiligung und drängt auf zwei neue Standorte. Gleichzeitig liegt die Pflegequote unter Plan, Wartezeiten steigen und ein Zulieferer für Medizintechnik erhöht Preise um 14 %.',
    deadlineDays: 21,
    startingMetrics: {
      revenueAnnualCents: 4_800_000_000,
      ebitdaAnnualCents: 210_000_000,
      cashCents: 640_000_000,
      headcount: 410,
      capacityUtilizationBps: 9100,
      customerConcentrationBps: 1200,
      moraleBps: 6100,
      resilienceBps: 5200,
      marketPositionBps: 5800,
    },
    metricDefinitions: commonMetricDefinitions,
    knownFacts: [
      'Zwei Standorte erzielen 71 % des Umsatzes.',
      'Offene Pflegestellen: 38 Vollzeitäquivalente.',
      'Investor fordert Expansion innerhalb von 18 Monaten.',
      'Medizintechnik-Kosten steigen um 14 % zum nächsten Quartal.',
    ],
    analyses: [
      {
        id: 'clinic-staffing',
        title: 'Personalengpass-Analyse',
        description: 'HR prüft Fluktuation, Überstunden und Recruiting-Pipeline.',
        durationDays: 4,
        resultTitle: 'Qualität leidet vor allem an Nachtschichten',
        resultBody: 'Überstunden konzentrieren sich auf Nachtschichten in zwei Kliniken. Ohne 20–25 zusätzliche Pflegekräfte steigt das Risiko für Qualitätsbeanstandungen in 6 Monaten deutlich.',
        confidence: 'high',
        evidenceTags: ['people', 'quality'],
      },
      {
        id: 'clinic-deal',
        title: 'Investoren-Due-Diligence',
        description: 'Finance bewertet Deal-Bedingungen und Kontrollrechte.',
        durationDays: 5,
        resultTitle: 'Kapital hilft, aber Governance ist eng',
        resultBody: '22 Mio. € lösen Capex und Recruiting, binden aber Board-Sitze und eine Expansionsklausel. Ablehnung bewahrt Kontrolle, verzögert aber Sanierung der Pflegequote.',
        confidence: 'medium',
        evidenceTags: ['finance', 'governance'],
      },
      {
        id: 'clinic-procurement',
        title: 'Beschaffungsreview',
        description: 'Einkauf prüft Alternativen zur Medizintechnik-Preiserhöhung.',
        durationDays: 3,
        resultTitle: 'Wechsel möglich, aber mit Umstellungsrisiko',
        resultBody: 'Ein Zweitlieferant ist 6 % günstiger, benötigt jedoch 4 Monate Validierung und Schulung. Kurzfristig bleibt Verhandlung der bessere Hebel.',
        confidence: 'medium',
        evidenceTags: ['operations', 'cost'],
      },
    ],
    actionRules: [
      {
        kind: 'accept_contract',
        label: 'Investorenbeteiligung annehmen',
        keywords: ['investor', 'beteiligung', 'kapital', 'übernahme', 'deal'],
        effect: {
          metrics: { cashCents: 2_200_000_000, resilienceBps: -180, moraleBps: -120 },
          delayed: {
            days: 150,
            title: 'Expansionsdruck setzt ein',
            body: 'Der Investor fordert konkrete Standortentscheidungen.',
            probabilityBps: 7200,
            successMetrics: { revenueAnnualCents: 280_000_000, marketPositionBps: 350 },
            failureMetrics: { moraleBps: -450, ebitdaAnnualCents: -40_000_000 },
          },
        },
      },
      {
        kind: 'change_hiring_policy',
        label: 'Pflege-Recruiting und Schichtmodelle priorisieren',
        keywords: ['pflege', 'recruiting', 'personal', 'schicht', 'qualität'],
        effect: {
          metrics: { cashCents: -85_000_000, moraleBps: 320, resilienceBps: 280 },
          delayed: {
            days: 90,
            title: 'Personalquote verbessert sich',
            body: 'Neue Pflegekräfte und angepasste Schichten entlasten Stationen.',
            probabilityBps: 7000,
            successMetrics: { moraleBps: 280, ebitdaAnnualCents: 18_000_000 },
            failureMetrics: { cashCents: -40_000_000, moraleBps: -200 },
          },
        },
      },
      {
        kind: 'renegotiate_customer',
        label: 'Medizintechnik-Konditionen neu verhandeln',
        keywords: ['medizintechnik', 'einkauf', 'lieferant', 'preis', 'beschaffung'],
        effect: { metrics: { ebitdaAnnualCents: 22_000_000, cashCents: 12_000_000 } },
      },
    ],
    scoreRubric: {
      framingKeywords: ['qualität', 'pflege', 'investor', 'wachstum', 'kosten'],
      objectiveKeywords: ['versorgung', 'kontrolle', 'cash', 'personal', 'margen'],
      riskKeywords: ['risiko', 'qualität', 'governance', 'fluktuation', 'expansion'],
      relevantAnalysisIds: ['clinic-staffing', 'clinic-deal', 'clinic-procurement'],
    },
    advisors: [
      { id: 'cfo', name: 'Dr. Lena Orth', role: 'CFO', stance: 'Kapital und Kontrolle getrennt bewerten.', domains: ['finance', 'governance'] },
      { id: 'cmo', name: 'Prof. Amir Said', role: 'Ärztlicher Direktor', stance: 'Versorgungsqualität darf nicht dem Wachstum weichen.', domains: ['quality', 'operations'] },
      { id: 'chro', name: 'Tanja Voigt', role: 'CHRO', stance: 'Ohne Pflegepersonal ist Expansion teure Symbolpolitik.', domains: ['people', 'organization'] },
    ],
  },
  {
    id: 'marktwerk-marketplace',
    version: 1,
    companyName: 'Marktwerk',
    industry: 'Marketplace / Plattform',
    stage: 'Scale-up',
    scaleLabel: '36 Mio. € GMV · 95 Mitarbeitende',
    headline: 'Take Rate oder Händlervertrauen?',
    description: 'Ein B2B-Marketplace will die Take Rate erhöhen, riskiert aber Abwanderung von Top-Händlern an einen neuen Rivalen.',
    decisionTitle: 'Monetarisierung unter Wettbewerbsdruck',
    decisionContext: 'Finance fordert +1,2 pp Take Rate. Die Top-20-Händler erzeugen 44 % des GMV und drohen mit Parallelverkauf. Gleichzeitig verbrennt Logistics-Support Cash und NPS fällt.',
    deadlineDays: 16,
    startingMetrics: {
      revenueAnnualCents: 720_000_000,
      ebitdaAnnualCents: -95_000_000,
      cashCents: 410_000_000,
      headcount: 95,
      capacityUtilizationBps: 7800,
      customerConcentrationBps: 4400,
      moraleBps: 6800,
      resilienceBps: 4900,
      marketPositionBps: 6200,
    },
    metricDefinitions: commonMetricDefinitions,
    knownFacts: [
      'Take Rate liegt bei 8,4 %.',
      'Top-20-Händler = 44 % GMV.',
      'Ein neuer Rivale wirbt mit 6,5 % Take Rate.',
      'Support-Kosten pro Ticket sind in 9 Monaten um 31 % gestiegen.',
    ],
    analyses: [
      {
        id: 'market-churn',
        title: 'Händler-Churn-Risiko',
        description: 'Marketplace Ops schätzt Abwanderung bei Preiserhöhung.',
        durationDays: 3,
        resultTitle: 'Preis allein treibt Abwanderung der Top-Händler',
        resultBody: 'Eine pauschale +1,2-pp-Erhöhung ohne Gegenleistung würde geschätzt 9–14 % GMV der Top-20 gefährden. Gestaffelte Preise plus Service-SLA wirken stabiler.',
        confidence: 'high',
        evidenceTags: ['marketplace', 'pricing'],
      },
      {
        id: 'market-unit',
        title: 'Unit Economics Support',
        description: 'Finance analysiert Contribution nach Händlersegment.',
        durationDays: 4,
        resultTitle: 'Long-Tail ist teurer als gedacht',
        resultBody: 'Long-Tail-Händler liefern 28 % GMV, aber 51 % der Support-Tickets. Automatisierung und Self-Service könnten 18 % Support-Kosten sparen.',
        confidence: 'medium',
        evidenceTags: ['finance', 'operations'],
      },
      {
        id: 'market-rival',
        title: 'Wettbewerbsradar',
        description: 'Strategy prüft Rivalen-Angebot und Wechselkosten.',
        durationDays: 2,
        resultTitle: 'Wechselkosten sind real, aber sinkend',
        resultBody: 'API-Integrationen halten viele Händler noch 6–9 Monate. Danach steigt das Wechselrisiko, wenn Service und Preis nicht zusammenpassen.',
        confidence: 'medium',
        evidenceTags: ['strategy', 'competition'],
      },
    ],
    actionRules: [
      {
        kind: 'set_pricing_policy',
        label: 'Gestaffelte Take Rate einführen',
        keywords: ['take rate', 'preis', 'staffel', 'monetarisierung', 'gebühr'],
        effect: {
          metrics: { revenueAnnualCents: 55_000_000, ebitdaAnnualCents: 28_000_000, customerConcentrationBps: -200 },
          delayed: {
            days: 75,
            title: 'Händlerreaktion auf Pricing',
            body: 'Top-Händler bewerten die neue Staffelung.',
            probabilityBps: 6600,
            successMetrics: { marketPositionBps: 220, cashCents: 20_000_000 },
            failureMetrics: { revenueAnnualCents: -70_000_000, customerConcentrationBps: 300 },
          },
        },
      },
      {
        kind: 'start_project',
        label: 'Self-Service und Ticket-Automation starten',
        keywords: ['support', 'automation', 'self-service', 'ticket', 'ops'],
        effect: {
          metrics: { cashCents: -45_000_000, resilienceBps: 160 },
          delayed: {
            days: 100,
            title: 'Support-Kosten sinken',
            body: 'Automatisierung entlastet Ops und verbessert Beitrag der Long-Tail-Händler.',
            probabilityBps: 7100,
            successMetrics: { ebitdaAnnualCents: 24_000_000, moraleBps: 180 },
            failureMetrics: { cashCents: -25_000_000, moraleBps: -150 },
          },
        },
      },
      {
        kind: 'renegotiate_customer',
        label: 'Top-Händler mit SLA und Bundles halten',
        keywords: ['top-händler', 'sla', 'bundle', 'bindung', 'partner'],
        effect: { metrics: { resilienceBps: 240, customerConcentrationBps: -180, cashCents: -18_000_000 } },
      },
    ],
    scoreRubric: {
      framingKeywords: ['take rate', 'händler', 'support', 'wettbewerb', 'gmv'],
      objectiveKeywords: ['marge', 'bindung', 'effizienz', 'wachstum', 'cash'],
      riskKeywords: ['churn', 'rivale', 'konzentration', 'kosten', 'risiko'],
      relevantAnalysisIds: ['market-churn', 'market-unit', 'market-rival'],
    },
    advisors: [
      { id: 'cfo', name: 'Nora Klein', role: 'CFO', stance: 'Contribution vor GMV-Romantik.', domains: ['finance', 'pricing'] },
      { id: 'coo', name: 'Ravi Menon', role: 'COO', stance: 'Support-Last ist ein Produktproblem.', domains: ['operations', 'marketplace'] },
      { id: 'partnerships', name: 'Clara Berg', role: 'VP Partnerships', stance: 'Top-Händler brauchen Gegenwert, nicht nur Preise.', domains: ['sales', 'customer'] },
    ],
  },
  {
    id: 'stromfeld-energy',
    version: 1,
    companyName: 'Stromfeld Energy',
    industry: 'Energie / Utilities',
    stage: 'Scale-up',
    scaleLabel: '210 Mio. € Umsatz · 320 Mitarbeitende',
    headline: 'Netzausbau oder Margensicherung?',
    description: 'Ein regionaler Energieversorger muss zwischen teurem Netzausbau, Preisdeckel-Politik und Industriekundenbindung wählen.',
    decisionTitle: 'Capex unter Regulierungsdruck',
    decisionContext: 'Die Regulierungsbehörde erwartet Netzinvestitionen von 38 Mio. € in 24 Monaten. Gleichzeitig droht ein Industriekunde mit 19 % Umsatzanteil mit Abwanderung, falls Preise steigen.',
    deadlineDays: 28,
    startingMetrics: {
      revenueAnnualCents: 21_000_000_000,
      ebitdaAnnualCents: 1_150_000_000,
      cashCents: 2_400_000_000,
      headcount: 320,
      capacityUtilizationBps: 8600,
      customerConcentrationBps: 1900,
      moraleBps: 6400,
      resilienceBps: 5700,
      marketPositionBps: 6000,
    },
    metricDefinitions: commonMetricDefinitions,
    knownFacts: [
      'Behörde erwartet 38 Mio. € Netz-Capex in 24 Monaten.',
      'Ein Industriekunde steht für 19 % Umsatz.',
      'Wartungsrückstand an zwei Umspannwerken ist kritisch.',
      'Fremdkapitalzinsen sind in 12 Monaten um 180 bps gestiegen.',
    ],
    analyses: [
      {
        id: 'energy-capex',
        title: 'Capex-Priorisierung',
        description: 'Engineering priorisiert Netzmaßnahmen nach Ausfallrisiko.',
        durationDays: 5,
        resultTitle: 'Zwei Umspannwerke zuerst',
        resultBody: '80 % des kritischen Risikos sitzt in zwei Anlagen. Ein gestaffelter Capex-Plan reduziert Peak-Cashout um ca. 11 Mio. € im ersten Jahr.',
        confidence: 'high',
        evidenceTags: ['operations', 'capex'],
      },
      {
        id: 'energy-customer',
        title: 'Industriekunden-Szenario',
        description: 'Sales prüft Abwanderungsrisiko und Vertragsoptionen.',
        durationDays: 3,
        resultTitle: 'Mehrjahresvertrag gegen Preisstabilität möglich',
        resultBody: 'Der Kunde akzeptiert eher ein 36-Monats-Paket mit begrenzter Preiserhöhung als eine sofortige +8 %-Anpassung.',
        confidence: 'medium',
        evidenceTags: ['customer', 'pricing'],
      },
      {
        id: 'energy-finance',
        title: 'Finanzierungsoptionen',
        description: 'Treasury vergleicht Kredit, Anleihe und Phasen-Capex.',
        durationDays: 4,
        resultTitle: 'Phasenfinanzierung schont Zinslast',
        resultBody: 'Ein gestreckter Capex plus revolvierende Linie kostet weniger als ein Front-loaded Kredit bei aktuellem Zinsniveau.',
        confidence: 'medium',
        evidenceTags: ['finance', 'risk'],
      },
    ],
    actionRules: [
      {
        kind: 'allocate_capital',
        label: 'Netz-Capex gestaffelt freigeben',
        keywords: ['capex', 'netz', 'invest', 'umspann', 'ausbau'],
        effect: {
          metrics: { cashCents: -1_100_000_000, resilienceBps: 420 },
          delayed: {
            days: 180,
            title: 'Erste Netzmaßnahmen greifen',
            body: 'Kritische Anlagen werden modernisiert, Ausfallrisiko sinkt.',
            probabilityBps: 7500,
            successMetrics: { marketPositionBps: 280, ebitdaAnnualCents: 60_000_000 },
            failureMetrics: { cashCents: -200_000_000, moraleBps: -160 },
          },
        },
      },
      {
        kind: 'renegotiate_customer',
        label: 'Industriekunden-Mehrjahresvertrag sichern',
        keywords: ['industrie', 'vertrag', 'kunde', 'preisstabilität', 'bindung'],
        effect: {
          metrics: { resilienceBps: 260, customerConcentrationBps: -120 },
          delayed: {
            days: 60,
            title: 'Vertragsverhandlung abgeschlossen',
            body: 'Preis und Laufzeit werden neu austariert.',
            probabilityBps: 6900,
            successMetrics: { revenueAnnualCents: 120_000_000, cashCents: 40_000_000 },
            failureMetrics: { revenueAnnualCents: -380_000_000, customerConcentrationBps: -400 },
          },
        },
      },
      {
        kind: 'set_pricing_policy',
        label: 'Tarife selektiv anpassen',
        keywords: ['tarif', 'preis', 'preiserhöhung', 'marge'],
        effect: { metrics: { revenueAnnualCents: 260_000_000, ebitdaAnnualCents: 90_000_000, moraleBps: -140 } },
      },
    ],
    scoreRubric: {
      framingKeywords: ['netz', 'capex', 'kunde', 'regulierung', 'zinsen'],
      objectiveKeywords: ['resilienz', 'cash', 'bindung', 'marge', 'versorgung'],
      riskKeywords: ['ausfall', 'abwanderung', 'zins', 'behörde', 'risiko'],
      relevantAnalysisIds: ['energy-capex', 'energy-customer', 'energy-finance'],
    },
    advisors: [
      { id: 'cfo', name: 'Henrik Pauli', role: 'CFO', stance: 'Peak-Cash und Zinslast zuerst absichern.', domains: ['finance', 'capex'] },
      { id: 'cto-grid', name: 'Ines Marquardt', role: 'Grid CTO', stance: 'Kritische Anlagen vor Symbolprojekten.', domains: ['operations', 'risk'] },
      { id: 'sales', name: 'Omar Farid', role: 'Key Account Lead', stance: 'Industriekundenbindung schlägt kurzfristige Preismaßnahmen.', domains: ['sales', 'customer'] },
    ],
  },
  {
    id: 'urbanfit-retail',
    version: 1,
    companyName: 'Urbanatics',
    industry: 'Retail / DTC',
    stage: 'Growth',
    scaleLabel: '28 Mio. € Umsatz · 140 Mitarbeitende',
    headline: 'Filialen oder digitale Marge?',
    description: 'Eine Sportmarke mit starken Online-Umsätzen prüft teure City-Filialen gegen Profitabilität und Lagerumschlag.',
    decisionTitle: 'Omnichannel-Expansion',
    decisionContext: 'Marketing will drei Flagship-Stores. Operations warnt vor Überbestand und Retourenquote von 19 %. Ein Großhändler bietet Listung, verlangt aber 28 % Marge und Exklusivfenster.',
    deadlineDays: 18,
    startingMetrics: {
      revenueAnnualCents: 2_800_000_000,
      ebitdaAnnualCents: 120_000_000,
      cashCents: 380_000_000,
      headcount: 140,
      capacityUtilizationBps: 7400,
      customerConcentrationBps: 900,
      moraleBps: 7100,
      resilienceBps: 5400,
      marketPositionBps: 6300,
    },
    metricDefinitions: commonMetricDefinitions,
    knownFacts: [
      'Online-Anteil am Umsatz: 72 %.',
      'Retourenquote: 19 %.',
      'Drei geplante Flagships kosten zusammen ca. 4,8 Mio. € Capex.',
      'Wholesale-Angebot verlangt 28 % Handelsspanne.',
    ],
    analyses: [
      {
        id: 'retail-stores',
        title: 'Filial-Business-Case',
        description: 'Retail Finance modelliert Break-even der Flagships.',
        durationDays: 4,
        resultTitle: 'Nur ein Standort trägt sich in 24 Monaten',
        resultBody: 'Zwei der drei Lagen erreichen Break-even erst nach 36+ Monaten. Ein Pilot-Store plus Pop-ups ist kapitalärmer und lernt schneller.',
        confidence: 'high',
        evidenceTags: ['retail', 'finance'],
      },
      {
        id: 'retail-returns',
        title: 'Retouren-Treiber',
        description: 'Ops analysiert Retouren nach Kategorie und Fit.',
        durationDays: 3,
        resultTitle: 'Größenberatung senkt Retouren stärker als Rabatte',
        resultBody: '42 % der Retouren betreffen zwei Kategorien. Bessere Fit-Guides und Größen-AI könnten die Quote um 3–5 pp senken.',
        confidence: 'medium',
        evidenceTags: ['operations', 'cx'],
      },
      {
        id: 'retail-wholesale',
        title: 'Wholesale-Deal-Check',
        description: 'Sales bewertet Handelsspanne gegen Markenkontrolle.',
        durationDays: 2,
        resultTitle: 'Volumen ja, Marke gefährdet',
        resultBody: 'Der Deal könnte +6 Mio. € Umsatz bringen, aber Exklusivfenster und Preisdumping-Risiko belasten DTC-Marge.',
        confidence: 'medium',
        evidenceTags: ['sales', 'brand'],
      },
    ],
    actionRules: [
      {
        kind: 'allocate_capital',
        label: 'Einen Pilot-Flagship statt Dreierpaket',
        keywords: ['filiale', 'flagship', 'store', 'pilot', 'laden'],
        effect: {
          metrics: { cashCents: -160_000_000, marketPositionBps: 180 },
          delayed: {
            days: 120,
            title: 'Pilot-Store liefert Lernkurve',
            body: 'Conversion und Markenwirkung werden messbar.',
            probabilityBps: 6800,
            successMetrics: { revenueAnnualCents: 90_000_000, marketPositionBps: 220 },
            failureMetrics: { cashCents: -50_000_000, ebitdaAnnualCents: -25_000_000 },
          },
        },
      },
      {
        kind: 'start_project',
        label: 'Retouren- und Fit-Programm starten',
        keywords: ['retour', 'fit', 'größe', 'cx', 'ops'],
        effect: {
          metrics: { cashCents: -28_000_000, resilienceBps: 140 },
          delayed: {
            days: 90,
            title: 'Retourenquote verbessert sich',
            body: 'Bessere Fit-Guides und Prozessfixes greifen.',
            probabilityBps: 7200,
            successMetrics: { ebitdaAnnualCents: 35_000_000, cashCents: 22_000_000 },
            failureMetrics: { cashCents: -15_000_000 },
          },
        },
      },
      {
        kind: 'accept_contract',
        label: 'Wholesale-Listung annehmen',
        keywords: ['wholesale', 'händler', 'listung', 'handel', 'kanal'],
        effect: {
          metrics: { revenueAnnualCents: 180_000_000, ebitdaAnnualCents: -12_000_000, marketPositionBps: 120 },
          delayed: {
            days: 100,
            title: 'Wholesale-Kanal zeigt Wirkung',
            body: 'Volumen steigt, Markenkontrolle wird getestet.',
            probabilityBps: 6400,
            successMetrics: { revenueAnnualCents: 120_000_000, cashCents: 30_000_000 },
            failureMetrics: { ebitdaAnnualCents: -40_000_000, marketPositionBps: -250 },
          },
        },
      },
    ],
    scoreRubric: {
      framingKeywords: ['filiale', 'online', 'retouren', 'wholesale', 'marge'],
      objectiveKeywords: ['cash', 'marke', 'effizienz', 'wachstum', 'kanal'],
      riskKeywords: ['überbestand', 'dumping', 'capex', 'retour', 'risiko'],
      relevantAnalysisIds: ['retail-stores', 'retail-returns', 'retail-wholesale'],
    },
    advisors: [
      { id: 'cfo', name: 'Sophie Lang', role: 'CFO', stance: 'Capex nur mit klarer Lernhypothese.', domains: ['finance', 'retail'] },
      { id: 'coo', name: 'Ben Okonkwo', role: 'COO', stance: 'Retouren und Bestand vor Symbol-Stores.', domains: ['operations', 'cx'] },
      { id: 'brand', name: 'Mira Schulz', role: 'Brand Lead', stance: 'Wholesale darf DTC-Preisarchitektur nicht zerstören.', domains: ['brand', 'sales'] },
    ],
  },
]

function publishWorldEdition(base: ScenarioDefinition, initialWorld: WorldModules): ScenarioDefinition {
  return {
    ...base,
    version: 2,
    initialWorld,
  }
}

function requireV1(id: ScenarioId): ScenarioDefinition {
  const scenario = scenarioCatalogV1.find((candidate) => candidate.id === id)
  if (!scenario) {
    throw new Error(`Missing V1 scenario seed: ${id}`)
  }
  return scenario
}

/**
 * All published scenario versions. Multiple rows per id are intentional:
 * runs bind to `scenarioVersion` and must not silently pick newer content.
 */
export const scenarios: ScenarioDefinition[] = [
  ...scenarioCatalogV1,
  publishWorldEdition(requireV1('nexora-saas'), nexoraWorldV2()),
  publishWorldEdition(requireV1('nordkern-foods'), nordkernWorldV2()),
]

/** Latest published version for a scenario id (UI catalog / new runs). */
export function getScenario(id: ScenarioId): ScenarioDefinition {
  const matches = scenarios.filter((candidate) => candidate.id === id)
  if (matches.length === 0) {
    throw new Error(`Unknown scenario: ${id}`)
  }
  return matches.reduce((latest, candidate) =>
    candidate.version > latest.version ? candidate : latest,
  )
}

/** Exact published snapshot for a run's bound scenario version. */
export function getScenarioAtVersion(id: ScenarioId, version: number): ScenarioDefinition {
  const scenario = scenarios.find((candidate) => candidate.id === id && candidate.version === version)
  if (!scenario) {
    throw new Error(`Unknown scenario version: ${id}@${version}`)
  }
  return scenario
}

export function listPublishedScenarioVersions(id: ScenarioId): number[] {
  return scenarios
    .filter((candidate) => candidate.id === id)
    .map((candidate) => candidate.version)
    .sort((a, b) => a - b)
}

/** Latest published edition per scenario id — for UI catalogs / new runs only. */
export function listPlayableScenarios(): ScenarioDefinition[] {
  const latestById = new Map<ScenarioId, ScenarioDefinition>()
  for (const scenario of scenarios) {
    const current = latestById.get(scenario.id)
    if (!current || scenario.version > current.version) {
      latestById.set(scenario.id, scenario)
    }
  }
  return [...latestById.values()]
}
