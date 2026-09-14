/**
 * Opening brief helpers — pending seed + apply message.
 * Location: tests/opening-brief.test.ts
 */
import { describe, expect, it } from 'vitest'
import { createRun, HOUSE_ASSISTANT_ID } from '../shared/domain/index.ts'
import {
  applyOpeningBriefMessage,
  buildOpeningBriefText,
  seedPendingOpeningBrief,
} from '../src/features/room/openingBrief.ts'

describe('opening brief thread helpers', () => {
  it('seeds pending empty Adalbert message then applies LLM text', () => {
    const run = createRun('nexora-saas', 'open-1')
    // Force non-e2e path by not setting localStorage flags (node vitest: no localStorage)
    const pending = seedPendingOpeningBrief([], run)
    const thread = pending.find((item) => item.advisorId === HOUSE_ASSISTANT_ID)
    expect(thread?.messages[0]?.text).toBe('')
    expect(thread?.messages[0]?.animate).toBe(true)

    const filled = applyOpeningBriefMessage(
      pending,
      'Folgende Situation: Unser Kunde braucht eine Entscheidung zur Kapazität.',
    )
    const message = filled.find((item) => item.advisorId === HOUSE_ASSISTANT_ID)?.messages[0]
    expect(message?.text).toContain('Folgende Situation')
    expect(message?.text.toLowerCase()).not.toContain('quest')
  })

  it('legacy buildOpeningBriefText is fallback without quest language', () => {
    const text = buildOpeningBriefText(createRun('nordkern-foods', 'open-2'))
    expect(text.toLowerCase()).not.toContain('quest')
    expect(text.toLowerCase()).not.toMatch(/30\s*sekunden/)
    expect(text.toLowerCase()).not.toContain('kurzes briefing zur eröffnungslage')
  })
})
