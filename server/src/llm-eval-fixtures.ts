/**
 * Business-Type eval harness — curated + generated fixtures (schema validity focus).
 * Location: server/src/llm-eval-fixtures.ts
 * Never logs API keys or full system prompts.
 */
export type EvalFixture = {
  id: string
  locale: 'de'
  category:
    | 'schema_validity'
    | 'action_params'
    | 'tool_choice'
    | 'hidden_info'
    | 'unusual_strategy'
  playerText: string
  rationale: string
  expectSchemaValid: boolean
}

const STRATEGY_STEMS = [
  'Pilot in Thüringen mit Capex-Deckel',
  'Lidl-Mindestmarge vor Automatisierung',
  'Kapazität auf Premium umschichten',
  'Hiring einfrieren und Umschulung',
  'Preis +150 bps nur bei Bestandskunden',
  'Joint Venture prüfen statt zweite Linie',
  'Cash-Puffer vor Rollout erzwingen',
  'Parallele Renegotiation und Debottlenecking',
]

function buildFixture(index: number): EvalFixture {
  const stem = STRATEGY_STEMS[index % STRATEGY_STEMS.length]!
  const unusual = index % 17 === 0
  const invalid = index % 29 === 0
  return {
    id: `bt-eval-${String(index + 1).padStart(3, '0')}`,
    locale: 'de',
    category: invalid
      ? 'schema_validity'
      : unusual
        ? 'unusual_strategy'
        : index % 5 === 0
          ? 'hidden_info'
          : index % 3 === 0
            ? 'tool_choice'
            : 'action_params',
    playerText: invalid
      ? ''
      : `${stem}. Zuerst ${index % 2 === 0 ? 'Pilot' : 'Verhandlung'}, weil Cash und Kapazität eng sind. Falls es scheitert, Fallback ohne Rollout.`,
    rationale: unusual
      ? `Ungewöhnliche, aber rationale Strategie #${index + 1}: bewusst gegen Keyword-Checklisten, mit klarer Contingency.`
      : `Ziel Resilienz und Marge. Annahme: Puffer nötig. Fixture ${index + 1}.`,
    expectSchemaValid: !invalid,
  }
}

/** At least 200 fixtures as required by issue #11 acceptance. */
export function listBusinessTypeEvalFixtures(count = 200): EvalFixture[] {
  return Array.from({ length: count }, (_, index) => buildFixture(index))
}
