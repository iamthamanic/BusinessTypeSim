/**
 * Situation briefing unit tests + eval fixtures (Nexora, Nordkern).
 * Location: tests/situation-briefing.test.ts
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  buildSituationBriefingFallback,
  buildSituationBriefingInput,
  createRun,
  evaluateSituationBriefingQuality,
  sanitizeSituationBriefing,
  situationBriefingModuleIsGeneric,
} from '../shared/domain/index.ts'

const here = dirname(fileURLToPath(import.meta.url))
const briefingSource = readFileSync(
  join(here, '../shared/domain/situation-briefing.ts'),
  'utf8',
)

describe('situation briefing context', () => {
  it('builds player-visible input without scenarioId special cases in module', () => {
    expect(situationBriefingModuleIsGeneric(briefingSource)).toBe(true)
    expect(briefingSource).not.toMatch(/if\s*\(\s*scenarioId/)
  })

  it('includes player-visible situation fields for Nexora and Nordkern via same API', () => {
    const nexora = createRun('nexora-saas', 'brief-nexora')
    const nordkern = createRun('nordkern-foods', 'brief-nordkern')
    const nexoraInput = buildSituationBriefingInput(nexora)
    const nordkernInput = buildSituationBriefingInput(nordkern)
    expect(nexoraInput).not.toBeNull()
    expect(nordkernInput).not.toBeNull()
    expect(nexoraInput?.situationContext.length).toBeGreaterThan(20)
    expect(nordkernInput?.situationContext.length).toBeGreaterThan(20)
    expect(nexoraInput?.companyName).toBeTruthy()
    expect(nordkernInput?.companyName).toBeTruthy()
    // No hidden trigger vocabulary in the assembled JSON payload.
    const serialized = JSON.stringify(nexoraInput)
    expect(serialized.toLowerCase()).not.toContain('hidden')
    expect(serialized.toLowerCase()).not.toContain('trigger_id')
  })

  it('fallback never mentions Quest or 30 seconds', () => {
    const run = createRun('nexora-saas', 'brief-fallback')
    const text = buildSituationBriefingFallback(run)
    expect(text.toLowerCase()).not.toContain('quest')
    expect(text.toLowerCase()).not.toMatch(/30\s*sekunden/)
    expect(text.toLowerCase()).not.toContain('kurzes briefing zur eröffnungslage')
    expect(text.startsWith('Folgende Situation:')).toBe(true)
  })

  it('sanitize strips game/UI language', () => {
    const dirty =
      'Folgende Situation: Der Kunde wartet.\n\n'
      + 'Ich lege das in 30 Sekunden unter Quest ab.\n\n'
      + 'Kurzes Briefing zur Eröffnungslage\n\n'
      + 'Du musst entscheiden, wo Kapazität hingeht.'
    const clean = sanitizeSituationBriefing(dirty)
    expect(clean.toLowerCase()).not.toContain('quest')
    expect(clean.toLowerCase()).not.toMatch(/30\s*sekunden/)
    expect(clean.toLowerCase()).not.toContain('kurzes briefing')
    expect(clean).toContain('Folgende Situation')
  })
})

describe('situation briefing eval fixtures', () => {
  const nexoraIdeal = [
    'Folgende Situation: Unser Kunde TransLog steht in sieben Monaten vor der Vertragsverlängerung.',
    'Der Kunde ist für uns besonders wichtig, weil rund 18 % unseres wiederkehrenden Jahresumsatzes von ihm kommen.',
    'TransLog möchte zusätzliche Funktionen für die automatische Routenplanung.',
    'Gleichzeitig verlieren wir bei kleineren und mittleren Kunden Aufträge, weil KI-Funktionen zur Tourenplanung fehlen.',
    'Du musst entscheiden, wo wir unsere begrenzte Entwicklungskapazität einsetzen.',
  ].join(' ')

  const nordkernIdeal = [
    'Folgende Situation: In unseren Werken zeichnet sich ein Kapazitätsproblem ab.',
    'Der Absatz ist stark gestiegen, aber die Marge sinkt.',
    'Lidl ist ein wichtiger Kunde mit hohem Umsatzanteil, aber schwacher Marge.',
    'Gleichzeitig könnten Investitionen in Automatisierung Engpässe lösen, kosten aber viel Geld.',
    'Du musst abwägen zwischen Kundenmix, Kapazität und Investition.',
  ].join(' ')

  it('scores a strong Nexora-style briefing as ok', () => {
    const evalResult = evaluateSituationBriefingQuality(nexoraIdeal)
    expect(evalResult.noQuestMention).toBe(true)
    expect(evalResult.noThirtySecondMention).toBe(true)
    expect(evalResult.noLegacyOpeningHeader).toBe(true)
    expect(evalResult.noGameUiLanguage).toBe(true)
    expect(evalResult.explainsSituation).toBe(true)
    expect(evalResult.explainsRelevance).toBe(true)
    expect(evalResult.ok).toBe(true)
  })

  it('scores a strong Nordkern-style briefing as ok', () => {
    const evalResult = evaluateSituationBriefingQuality(nordkernIdeal)
    expect(evalResult.ok).toBe(true)
    expect(evalResult.explainsConflict || evalResult.explainsRelevance).toBe(true)
  })

  it('rejects legacy opening dump', () => {
    const legacy =
      'Kurzes Briefing zur Eröffnungslage:\n\nTransLog Renewal\n\n'
      + 'Ich halte das erst hier im Chat. In etwa 30 Sekunden lege ich es dir unter Quest ab.'
    const evalResult = evaluateSituationBriefingQuality(legacy)
    expect(evalResult.noLegacyOpeningHeader).toBe(false)
    expect(evalResult.noQuestMention).toBe(false)
    expect(evalResult.noThirtySecondMention).toBe(false)
    expect(evalResult.ok).toBe(false)
  })

  it('fallback for both scenarios passes UI-language checks', () => {
    for (const id of ['nexora-saas', 'nordkern-foods'] as const) {
      const text = buildSituationBriefingFallback(createRun(id, `eval-${id}`))
      const evalResult = evaluateSituationBriefingQuality(text)
      expect(evalResult.noQuestMention).toBe(true)
      expect(evalResult.noThirtySecondMention).toBe(true)
      expect(evalResult.noLegacyOpeningHeader).toBe(true)
    }
  })
})
