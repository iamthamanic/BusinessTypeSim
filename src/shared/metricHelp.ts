/**
 * Player-facing explanations for core company metrics (tooltips).
 * Location: src/shared/metricHelp.ts
 */

export type MetricHelpId =
  | 'cash'
  | 'ebitda'
  | 'headcount'
  | 'resilience'
  | 'revenue'
  | 'runway'
  | 'morale'
  | 'marketPosition'

const METRIC_HELP: Record<MetricHelpId, string> = {
  cash:
    'Verfügbare Liquidität auf dem Konto. Zeigt, wie lange die Firma Zahlungen leisten kann, bevor neues Kapital nötig wird.',
  ebitda:
    'Operatives Ergebnis vor Zinsen, Steuern und Abschreibungen (Jahresbasis). Positiv = operativ tragfähig, negativ = laufender Cash-Burn.',
  headcount:
    'Anzahl der Mitarbeitenden. Beeinflusst Kosten, Kapazität und wie schnell die Organisation Entscheidungen umsetzen kann.',
  resilience:
    'Widerstandsfähigkeit der Firma gegen Störungen (Lieferkette, Kunden, Organisation). Höher = stabiler bei Rückschlägen.',
  revenue:
    'Jahresumsatz bzw. ARR (wiederkehrender Umsatz). Zeigt die aktuelle Ertragsbasis, nicht den kurzfristigen Kontostand.',
  runway:
    'Geschätzte Monate, bis das Cash bei aktuellem Burn aufgebraucht wäre. Schätzung aus Cash und EBITDA, kein Garantiewert.',
  morale:
    'Organisationsklima und Teamenergie. Niedrige Werte erschweren Umsetzung und erhöhen Fluktuationsrisiko.',
  marketPosition:
    'Relative Wettbewerbsposition im sichtbaren Markt. Höher = stärkere Wahrnehmung und bessere Durchsetzungskraft.',
}

export function metricHelp(id: MetricHelpId): string {
  return METRIC_HELP[id]
}
