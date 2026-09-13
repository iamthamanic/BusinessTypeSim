import { describe, expect, it } from 'vitest'
import {
  advanceTime,
  commitDecision,
  createRun,
  decisionQualityEvidenceSchema,
  interpretDecisionLocally,
  requestAnalysis,
  scoreDecision,
  scoreDecisionSemantic,
} from '../shared/domain/index.ts'

describe('semantic decision quality', () => {
  it('keyword stuffing without structure does not yield a high total', () => {
    const run = createRun('nordkern-foods', 'dq-stuffing')
    const buzz =
      'Marge Risiko Cash Kapazität Automatisierung Lidl Ziel KPI Trade-off Pilot Phase Monat ' +
      'Marge Risiko Cash Kapazität Automatisierung Lidl Ziel KPI Trade-off Pilot Phase Monat'
    const proposal = interpretDecisionLocally(run, buzz, buzz)
    const quality = scoreDecision(run, proposal, buzz, buzz)
    expect(quality.evidence.keywordStuffingPenalty).toBeGreaterThan(0)
    expect(quality.total).toBeLessThan(70)
  })

  it('structured alternative strategy can score without stuffing buzzwords', () => {
    const run = createRun('nordkern-foods', 'dq-structured')
    const text =
      'Zuerst verhandeln wir mit Lidl eine Mindestmarge, weil die Konzentration zu hoch ist. ' +
      'Parallel starten wir einen 90-Tage-Pilot in Thüringen. Falls der Pilot scheitert, stoppen wir die Capex und behalten Cash.'
    const rationale =
      'Ziel ist Resilienz und Marge. Annahme: Automatisierung braucht Cash-Puffer. Alternative: nur Renegotiation ohne Capex.'
    const proposal = interpretDecisionLocally(run, text, rationale)
    const quality = scoreDecision(run, proposal, text, rationale)
    expect(quality.evidence.keywordStuffingPenalty).toBe(0)
    expect(quality.reasoning).toBeGreaterThan(50)
    expect(quality.execution).toBeGreaterThan(45)
    expect(quality.total).toBeGreaterThan(45)
  })

  it('is deterministic for identical inputs', () => {
    const run = createRun('nordkern-foods', 'dq-det')
    const text = 'Zuerst Pilot, weil Kapazität eng ist. Danach verhandeln wir Lidl.'
    const rationale = 'Ziel: Marge. Falls Pilot scheitert, stoppen wir Capex.'
    const proposal = interpretDecisionLocally(run, text, rationale)
    const a = scoreDecision(run, proposal, text, rationale)
    const b = scoreDecision(run, proposal, text, rationale)
    expect(a).toEqual(b)
  })

  it('freezes DecisionContextSnapshot at commit and ignores later analysis unlocks', () => {
    let run = createRun('nordkern-foods', 'dq-freeze')
    const text =
      'Wir starten einen Pilot und verhandeln danach, weil Cash und Kapazität zuerst stabil sein müssen.'
    const rationale = 'Ziel: Risiko begrenzen. Falls Pilot scheitert, Fallback ohne Rollout.'
    const proposal = interpretDecisionLocally(run, text, rationale)
    run = commitDecision(run, text, rationale, proposal, 'dq-freeze-key')
    const decision = run.decisions[0]!
    expect(decision.contextSnapshot.completedAnalysisIds).toEqual([])
    expect(decision.contextSnapshot.actionKinds.length).toBeGreaterThan(0)
    expect(decisionQualityEvidenceSchema.safeParse(decision.quality.evidence).success).toBe(true)
    const scoreAtCommit = decision.quality.total

    run = requestAnalysis(run, 'food-profitability')
    const availableAt = run.pendingAnalyses[0]!.availableAtDay
    run = advanceTime(run, availableAt - run.day)
    expect(run.completedAnalyses.length).toBeGreaterThan(0)
    expect(run.decisions[0]!.quality.total).toBe(scoreAtCommit)
    expect(run.decisions[0]!.contextSnapshot.completedAnalysisIds).toEqual([])
  })

  it('short empty rationale stays low and schema-valid', () => {
    const run = createRun('nexora-saas', 'dq-short')
    const text = 'Ok.'
    const rationale = ''
    const proposal = interpretDecisionLocally(run, text, rationale)
    const { quality, context } = scoreDecisionSemantic(run, proposal, text, rationale)
    expect(quality.total).toBeLessThan(55)
    expect(context.playerTextLength).toBe(text.length)
    expect(decisionQualityEvidenceSchema.safeParse(quality.evidence).success).toBe(true)
  })
})
