/**
 * Opening helpers — pending seed + progressive sequence apply.
 * Location: tests/opening-brief.test.ts
 */
import { describe, expect, it } from 'vitest'
import {
  buildSituationOpeningFallback,
  createRun,
  HOUSE_ASSISTANT_ID,
  openingSequenceTexts,
} from '../shared/domain/index.ts'
import {
  appendOpeningAdvisorMessage,
  applyOpeningSequence,
  buildOpeningBriefText,
  remainingOpeningTexts,
  seedPendingOpeningBrief,
} from '../src/features/room/openingBrief.ts'

describe('opening brief thread helpers', () => {
  it('seeds pending empty Adalbert message then applies multi-beat opening', () => {
    const run = createRun('nexora-saas', 'open-1')
    const pending = seedPendingOpeningBrief([], run)
    const thread = pending.find((item) => item.advisorId === HOUSE_ASSISTANT_ID)
    expect(thread?.messages[0]?.text).toBe('')
    expect(thread?.messages[0]?.animate).toBe(true)

    const opening = {
      messages: [
        'Folgende Situation: Unser Kunde braucht Aufmerksamkeit bei der Vertragsverlängerung.',
        'Gleichzeitig fehlt uns Kapazität für den breiteren Markt.',
      ],
      decisionPrompt: 'Priorisieren wir den Großkunden — oder den Markt?',
      relevantAdvisorIds: ['cto', 'sales'] as string[],
    }
    const filled = applyOpeningSequence(pending, opening, new Date().toISOString(), true)
    const messages = filled.find((item) => item.advisorId === HOUSE_ASSISTANT_ID)?.messages ?? []
    expect(messages).toHaveLength(1)
    expect(messages[0]?.text).toContain('Folgende Situation')
    expect(messages[0]?.text.toLowerCase()).not.toContain('quest')
    expect(remainingOpeningTexts(opening)).toHaveLength(2)

    const next = appendOpeningAdvisorMessage(filled, remainingOpeningTexts(opening)[0] ?? '', undefined, true)
    expect(next.find((item) => item.advisorId === HOUSE_ASSISTANT_ID)?.messages).toHaveLength(2)
  })

  it('instant path applies full opening without quest language', () => {
    const run = createRun('nordkern-foods', 'open-2')
    const opening = buildSituationOpeningFallback(run)
    const applied = applyOpeningSequence([], opening, new Date().toISOString(), false)
    const messages = applied.find((item) => item.advisorId === HOUSE_ASSISTANT_ID)?.messages ?? []
    expect(messages.length).toBe(openingSequenceTexts(opening).length)
    const text = buildOpeningBriefText(run)
    expect(text.toLowerCase()).not.toContain('quest')
    expect(text.toLowerCase()).not.toMatch(/30\s*sekunden/)
    expect(text.toLowerCase()).not.toContain('kurzes briefing zur eröffnungslage')
  })
})
