/**
 * Situation opening unit tests + eval fixtures (Nexora, Nordkern).
 * Location: tests/situation-opening.test.ts
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  buildSituationOpeningFallback,
  buildSituationOpeningInput,
  createRun,
  evaluateSituationOpeningQuality,
  normalizeSituationOpening,
  openingSequenceTexts,
  sanitizeOpeningMessage,
  situationOpeningModuleIsGeneric,
} from '../shared/domain/index.ts'

const here = dirname(fileURLToPath(import.meta.url))
const openingSource = readFileSync(
  join(here, '../shared/domain/situation-opening.ts'),
  'utf8',
)

describe('situation opening context', () => {
  it('builds player-visible input without scenarioId special cases in module', () => {
    expect(situationOpeningModuleIsGeneric(openingSource)).toBe(true)
    expect(openingSource).not.toMatch(/if\s*\(\s*scenarioId/)
  })

  it('includes player-visible situation + advisors for Nexora and Nordkern via same API', () => {
    const nexora = createRun('nexora-saas', 'open-nexora')
    const nordkern = createRun('nordkern-foods', 'open-nordkern')
    const nexoraInput = buildSituationOpeningInput(nexora)
    const nordkernInput = buildSituationOpeningInput(nordkern)
    expect(nexoraInput).not.toBeNull()
    expect(nordkernInput).not.toBeNull()
    expect(nexoraInput?.situationContext.length).toBeGreaterThan(20)
    expect(nordkernInput?.situationContext.length).toBeGreaterThan(20)
    expect(nexoraInput?.advisors.length).toBeGreaterThan(0)
    expect(nordkernInput?.advisors.length).toBeGreaterThan(0)
    expect(nexoraInput?.advisors.every((advisor) => advisor.id !== 'adalbert')).toBe(true)
    const serialized = JSON.stringify(nexoraInput)
    expect(serialized.toLowerCase()).not.toContain('hidden')
    expect(serialized.toLowerCase()).not.toContain('trigger_id')
  })

  it('fallback is multi-message and never mentions Quest or 30 seconds', () => {
    const run = createRun('nexora-saas', 'open-fallback')
    const opening = buildSituationOpeningFallback(run)
    const text = openingSequenceTexts(opening).join('\n')
    expect(opening.messages.length).toBeGreaterThanOrEqual(2)
    expect(text.toLowerCase()).not.toContain('quest')
    expect(text.toLowerCase()).not.toMatch(/30\s*sekunden/)
    expect(text.toLowerCase()).not.toContain('kurzes briefing zur eröffnungslage')
    expect(opening.messages[0]?.startsWith('Folgende Situation:')).toBe(true)
  })

  it('sanitize strips game/UI language', () => {
    const dirty =
      'Folgende Situation: Der Kunde wartet.\n'
      + 'Ich lege das in 30 Sekunden unter Quest ab.\n'
      + 'Kurzes Briefing zur Eröffnungslage'
    const clean = sanitizeOpeningMessage(dirty)
    expect(clean.toLowerCase()).not.toContain('quest')
    expect(clean.toLowerCase()).not.toMatch(/30\s*sekunden/)
    expect(clean.toLowerCase()).not.toContain('kurzes briefing')
    expect(clean).toContain('Folgende Situation')
  })

  it('normalize drops invented advisor ids', () => {
    const run = createRun('nexora-saas', 'open-ids')
    const normalized = normalizeSituationOpening(
      {
        messages: [
          'Folgende Situation: TransLog steht vor der Verlängerung.',
          'Gleichzeitig fehlen uns Funktionen für viele neue Kunden.',
        ],
        decisionPrompt: 'Priorisieren wir TransLog — oder den breiteren Markt?',
        relevantAdvisorIds: ['cto', 'ghost-cfo', 'sales'],
      },
      run,
    )
    expect(normalized).not.toBeNull()
    expect(normalized?.relevantAdvisorIds).toEqual(['cto', 'sales'])
    expect(normalized?.relevantAdvisorIds).not.toContain('ghost-cfo')
  })
})

describe('situation opening eval fixtures', () => {
  const nexoraIdeal = {
    messages: [
      'Folgende Situation: Wir haben gerade ein ziemlich wichtiges Thema mit TransLog. Der Kunde macht knapp ein Fünftel unseres wiederkehrenden Umsatzes aus. In sieben Monaten steht die Vertragsverlängerung an.',
      'TransLog möchte von uns eine speziell auf sie zugeschnittene Routenplanung. Wenn wir das bauen, dürfte das unsere Chancen verbessern, sie als Kunden zu halten. Dafür würde allerdings ein großer Teil unseres Entwicklungsteams gebunden.',
      'Gleichzeitig verlieren wir gerade neue Kunden, weil uns wichtige KI-Funktionen fehlen. Tina kann dir einschätzen, was das technisch bedeutet, Damian kennt die Kundenseite.',
    ],
    decisionPrompt: 'Priorisieren wir TransLog – oder bauen wir stärker für den breiteren Markt?',
    relevantAdvisorIds: ['cto', 'sales', 'cfo'],
  }

  const nordkernIdeal = {
    messages: [
      'Folgende Situation: In unseren Werken zeichnet sich gerade ein Problem ab. Der Absatz ist stark gestiegen, aber die Marge fällt.',
      'Die Werke laufen nahe am Limit. Lidl bringt viel Umsatz, aber wenig Ertrag — und Automatisierung würde Engpässe lösen, kostet aber spürbar Geld.',
      'Carlo kann dir die Zahlenlage schärfen, bevor wir festlegen, wohin Kapazität und Investitionen gehen.',
    ],
    decisionPrompt: 'Gehen wir zuerst an Kundenmix, Kapazität oder Investition?',
    relevantAdvisorIds: ['cfo'],
  }

  const caseStudyBad = {
    messages: [
      'Kurzes Briefing zur Eröffnungslage: Die eigentliche Entscheidung besteht darin, den zentralen Zielkonflikt zu lösen.',
      'Zusammenfassend sind folgende Faktoren zu berücksichtigen. Ich lege das in 30 Sekunden unter Quest ab.',
    ],
    decisionPrompt: 'Für die Entscheidungsfindung solltest du Option A oder B wählen.',
    relevantAdvisorIds: [],
  }

  it('scores a strong Nexora-style opening as ok', () => {
    const evalResult = evaluateSituationOpeningQuality(nexoraIdeal)
    expect(evalResult.feelsConversational).toBe(true)
    expect(evalResult.progressive).toBe(true)
    expect(evalResult.invitesAction).toBe(true)
    expect(evalResult.noGameUiLanguage).toBe(true)
    expect(evalResult.noConsultantSpeak).toBe(true)
    expect(evalResult.ok).toBe(true)
  })

  it('scores a strong Nordkern-style opening as ok', () => {
    const evalResult = evaluateSituationOpeningQuality(nordkernIdeal)
    expect(evalResult.ok).toBe(true)
    expect(evalResult.invitesAction).toBe(true)
  })

  it('rejects case-study / quest language openings', () => {
    const evalResult = evaluateSituationOpeningQuality(caseStudyBad)
    expect(evalResult.noLegacyOpeningHeader).toBe(false)
    expect(evalResult.noGameUiLanguage).toBe(false)
    expect(evalResult.noConsultantSpeak).toBe(false)
    expect(evalResult.ok).toBe(false)
  })

  it('fallback for both scenarios passes opening quality gate', () => {
    for (const id of ['nexora-saas', 'nordkern-foods'] as const) {
      const opening = buildSituationOpeningFallback(createRun(id, `eval-${id}`))
      const evalResult = evaluateSituationOpeningQuality(opening)
      expect(evalResult.noGameUiLanguage).toBe(true)
      expect(evalResult.noLegacyOpeningHeader).toBe(true)
      expect(evalResult.progressive).toBe(true)
      expect(evalResult.invitesAction).toBe(true)
    }
  })
})
