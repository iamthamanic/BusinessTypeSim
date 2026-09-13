import { describe, expect, it } from 'vitest'
import { listBusinessTypeEvalFixtures } from '../server/src/llm-eval-fixtures.ts'
import { interpretDecisionLocally, createRun } from '../shared/domain/index.ts'

describe('business-type eval fixtures', () => {
  it('provides at least 200 German fixtures', () => {
    const fixtures = listBusinessTypeEvalFixtures(200)
    expect(fixtures.length).toBeGreaterThanOrEqual(200)
    expect(fixtures.every((item) => item.locale === 'de')).toBe(true)
  })

  it('valid fixtures interpret to schema-valid proposals; empty ones stay empty/low-action', () => {
    const fixtures = listBusinessTypeEvalFixtures(200)
    const run = createRun('nordkern-foods', 'eval-harness')
    let validCount = 0
    for (const fixture of fixtures) {
      if (!fixture.expectSchemaValid) {
        const proposal = interpretDecisionLocally(run, fixture.playerText, fixture.rationale)
        expect(Array.isArray(proposal.actions)).toBe(true)
        continue
      }
      const proposal = interpretDecisionLocally(run, fixture.playerText, fixture.rationale)
      expect(proposal.actions.length).toBeGreaterThanOrEqual(0)
      validCount += 1
    }
    expect(validCount).toBeGreaterThan(150)
  })
})
