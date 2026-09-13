/**
 * Semantic Decision Quality — process scores from structured evidence, not keyword stuffing.
 * Location: shared/domain/decision-quality.ts
 */
import { z } from 'zod'
import { evaluateConstraints } from './constraints.ts'
import { getScenarioAtVersion } from './scenarios.ts'
import type {
  ActionProposal,
  DecisionContextSnapshot,
  DecisionQuality,
  DecisionQualityEvidence,
  RunState,
  ScenarioDefinition,
} from './types.ts'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function geometricMean(values: number[]): number {
  const sanitized = values.map((value) => clamp(value, 1, 100))
  const logAverage = sanitized.reduce((sum, value) => sum + Math.log(value), 0) / sanitized.length
  return Math.round(Math.exp(logAverage))
}

function containsAny(text: string, keywords: string[]): string[] {
  const normalized = text.toLowerCase()
  return keywords.filter((keyword) => normalized.includes(keyword.toLowerCase()))
}

function countMatches(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0
}

function uniqueContentTokens(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .split(/[^a-zäöüß0-9]+/i)
        .filter((token) => token.length >= 4),
    ),
  )
}

/** Concepts that appear inside a causal / contrastive / sequenced clause — not bare hits. */
function anchoredConcepts(text: string, concepts: string[]): string[] {
  const clauses = text
    .toLowerCase()
    .split(/[.!?;:\n]+/)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 0)

  const structural =
    /\b(weil|deshalb|damit|dadurch|sodass|folglich|statt|alternativ|oder|zuerst|danach|wenn|falls|risiko|trade-?off|ziel|pilot|phase)\b/i

  const found = new Set<string>()
  for (const clause of clauses) {
    if (!structural.test(clause)) continue
    for (const concept of concepts) {
      if (clause.includes(concept.toLowerCase())) found.add(concept)
    }
  }
  return Array.from(found)
}

function contrastiveAlternativeCount(text: string): number {
  const patterns = [
    /\bstatt\b/gi,
    /\balternativ(?:e|en)?\b/gi,
    /\bentweder\b.*\boder\b/gi,
    /\bpilot\b.*\b(statt|oder|vs\.?)\b/gi,
    /\bparallel\b/gi,
    /\boption(?:en)?\b/gi,
  ]
  return patterns.reduce((sum, pattern) => sum + countMatches(text, pattern), 0)
}

export const decisionQualityEvidenceSchema = z.object({
  framingSignals: z.array(z.string().max(200)).max(12),
  informationSignals: z.array(z.string().max(200)).max(12),
  alternativeSignals: z.array(z.string().max(200)).max(12),
  objectiveSignals: z.array(z.string().max(200)).max(12),
  reasoningSignals: z.array(z.string().max(200)).max(12),
  executionSignals: z.array(z.string().max(200)).max(12),
  keywordStuffingPenalty: z.number().int().min(0).max(40),
})

export const decisionContextSnapshotSchema = z.object({
  day: z.number().int().min(0),
  deadlineDay: z.number().int().min(0),
  completedAnalysisIds: z.array(z.string().max(120)).max(64),
  pendingAnalysisIds: z.array(z.string().max(120)).max(64),
  revealedEntityIds: z.array(z.string().max(120)).max(256),
  constraintBlockers: z.array(z.string().max(80)).max(32),
  constraintWarnings: z.array(z.string().max(80)).max(32),
  actionKinds: z.array(z.string().max(80)).max(8),
  playerTextLength: z.number().int().min(0),
  rationaleLength: z.number().int().min(0),
  evidence: decisionQualityEvidenceSchema,
})

export function parseDecisionQualityEvidence(raw: unknown): DecisionQualityEvidence {
  return decisionQualityEvidenceSchema.parse(raw)
}

export function emptyDecisionQualityEvidence(): DecisionQualityEvidence {
  return {
    framingSignals: [],
    informationSignals: [],
    alternativeSignals: [],
    objectiveSignals: [],
    reasoningSignals: [],
    executionSignals: [],
    keywordStuffingPenalty: 0,
  }
}

export function emptyDecisionContextSnapshot(
  day = 0,
  deadlineDay = 0,
): DecisionContextSnapshot {
  return {
    day,
    deadlineDay,
    completedAnalysisIds: [],
    pendingAnalysisIds: [],
    revealedEntityIds: [],
    constraintBlockers: [],
    constraintWarnings: [],
    actionKinds: [],
    playerTextLength: 0,
    rationaleLength: 0,
    evidence: emptyDecisionQualityEvidence(),
  }
}

function computeStuffingPenalty(input: {
  combined: string
  rubricKeywordHits: number
  causalLinks: number
  conditionals: number
  sequencing: number
  contrastives: number
}): number {
  const structure =
    input.causalLinks + input.conditionals + input.sequencing + input.contrastives
  const tokens = uniqueContentTokens(input.combined)
  const words = input.combined.split(/\s+/).filter(Boolean).length
  const uniqueRatio = words === 0 ? 0 : tokens.length / words

  let penalty = 0
  if (input.rubricKeywordHits >= 5 && structure <= 1) penalty += 22
  else if (input.rubricKeywordHits >= 4 && structure <= 2) penalty += 14
  if (uniqueRatio > 0 && uniqueRatio < 0.35 && words >= 20) penalty += 10
  if (tokens.length < 8 && words > 25) penalty += 8
  return clamp(penalty, 0, 40)
}

/** Extract structured semantic evidence (deterministic local mode, no LLM scores). */
export function extractDecisionEvidence(
  run: RunState,
  proposal: ActionProposal,
  playerText: string,
  rationale: string,
): DecisionQualityEvidence {
  const scenario = getScenarioAtVersion(run.scenarioId, run.scenarioVersion)
  const combined = `${playerText}\n${rationale}`.trim()
  const rubric = scenario.scoreRubric

  const causalLinks = countMatches(
    combined,
    /\b(weil|deshalb|damit|dadurch|sodass|folglich|um\s+\w+\s+zu)\b/gi,
  )
  const conditionals = countMatches(
    combined,
    /\b(wenn|falls|nur\s+bei|sofern|ansonsten|sonst)\b/gi,
  )
  const sequencing = countMatches(
    combined,
    /\b(zuerst|danach|anschließend|phase|pilot|schrittweise|wochen?|monate?)\b/gi,
  )
  const contrastives = contrastiveAlternativeCount(combined)

  const framingAnchors = anchoredConcepts(combined, rubric.framingKeywords)
  const objectiveAnchors = anchoredConcepts(combined, rubric.objectiveKeywords)
  const riskAnchors = anchoredConcepts(combined, rubric.riskKeywords)
  const bareRubricHits = new Set([
    ...containsAny(combined, rubric.framingKeywords),
    ...containsAny(combined, rubric.objectiveKeywords),
    ...containsAny(combined, rubric.riskKeywords),
  ]).size

  const relevantUnlocked = rubric.relevantAnalysisIds.filter((id) =>
    run.completedAnalyses.some((item) => item.analysisId === id),
  )
  const referencedAnalyses = proposal.evidenceRefs.filter((id) =>
    run.completedAnalyses.some((item) => item.analysisId === id),
  )

  const constraints = evaluateConstraints(run, proposal)
  const measurableParams = proposal.actions.some(
    (action) =>
      action.params.timingDays !== undefined ||
      action.params.amountCents !== undefined ||
      action.params.headcountDelta !== undefined ||
      action.params.priceChangeBps !== undefined,
  )
  const gatedParams = proposal.actions.some(
    (action) => Boolean(action.params.conditions || action.params.fallback),
  )

  const framingSignals = [
    ...framingAnchors.map((item) => `Situationsanker im Kontext: ${item}`),
    ...(riskAnchors.length > 0 ? ['Risiken im situativen Zusammenhang benannt'] : []),
    ...(combined.length >= 140 ? ['Entscheidung mit ausreichendem Kontext'] : []),
  ].slice(0, 8)

  const informationSignals = [
    ...relevantUnlocked.map((id) => `Relevante Analyse zum Commit freigeschaltet: ${id}`),
    ...referencedAnalyses.slice(0, 4).map((id) => `Analyse als Evidence referenziert: ${id}`),
  ].slice(0, 8)

  const alternativeSignals = [
    ...(contrastives > 0 ? ['Kontrastive Alternativenstruktur erkannt'] : []),
    ...(proposal.extractedAlternatives.length > 0
      ? proposal.extractedAlternatives.slice(0, 3).map((item) => `Alternative: ${item}`)
      : []),
    ...(proposal.actions.length > 1 ? ['Mehrere Actions als kohärentes Paket'] : []),
  ].slice(0, 8)

  const objectiveSignals = [
    ...objectiveAnchors.map((item) => `Ziel im Begründungszusammenhang: ${item}`),
    ...proposal.extractedObjectives.slice(0, 4).map((item) => `Extrahiertes Ziel: ${item}`),
    ...(gatedParams ? ['Bedingungen oder Fallback parametrisiert'] : []),
  ].slice(0, 8)

  const reasoningSignals = [
    ...(causalLinks >= 1 ? ['Kausale Verknüpfung vorhanden'] : []),
    ...(causalLinks >= 2 ? ['Mehrere kausale Verbindungen'] : []),
    ...(conditionals > 0 ? ['Bedingte Logik / Contingency'] : []),
    ...(proposal.assumptions.length > 0 ? ['Annahmen explizit benannt'] : []),
    ...(riskAnchors.length > 0 ? ['Trade-off / Risiko in Reasoning verankert'] : []),
  ].slice(0, 8)

  const executionSignals = [
    ...(sequencing > 0 ? ['Sequenz oder Timing genannt'] : []),
    ...(measurableParams ? ['Messbare Action-Parameter gesetzt'] : []),
    ...(proposal.actions.length > 0 && proposal.actions.length <= 4
      ? ['Umsetzbares Action-Paket (≤4)']
      : []),
    ...(constraints.warnings.length > 0 ? ['Constraint-Warnungen im Paket sichtbar'] : []),
  ].slice(0, 8)

  const keywordStuffingPenalty = computeStuffingPenalty({
    combined,
    rubricKeywordHits: bareRubricHits,
    causalLinks,
    conditionals,
    sequencing,
    contrastives,
  })

  return parseDecisionQualityEvidence({
    framingSignals,
    informationSignals,
    alternativeSignals,
    objectiveSignals,
    reasoningSignals,
    executionSignals,
    keywordStuffingPenalty,
  })
}

export function buildDecisionContextSnapshot(
  run: RunState,
  proposal: ActionProposal,
  playerText: string,
  rationale: string,
  evidence: DecisionQualityEvidence,
): DecisionContextSnapshot {
  const constraints = evaluateConstraints(run, proposal)
  return decisionContextSnapshotSchema.parse({
    day: run.day,
    deadlineDay: run.deadlineDay,
    completedAnalysisIds: run.completedAnalyses.map((item) => item.analysisId),
    pendingAnalysisIds: run.pendingAnalyses.map((item) => item.analysisId),
    revealedEntityIds: [...run.playerKnowledge.revealedEntityIds],
    constraintBlockers: constraints.blockers.map((item) => item.code),
    constraintWarnings: constraints.warnings.map((item) => item.code),
    actionKinds: proposal.actions.map((action) => action.kind),
    playerTextLength: playerText.length,
    rationaleLength: rationale.length,
    evidence,
  })
}

/**
 * Deterministic rubrics from validated evidence + commit-time run facts.
 * Keyword lists alone never dominate; stuffing applies an explicit penalty.
 */
export function scoreDecisionFromEvidence(
  scenario: ScenarioDefinition,
  run: RunState,
  proposal: ActionProposal,
  evidence: DecisionQualityEvidence,
): DecisionQuality {
  const stuffing = evidence.keywordStuffingPenalty
  const relevantAnalyses = scenario.scoreRubric.relevantAnalysisIds.filter((id) =>
    run.completedAnalyses.some((item) => item.analysisId === id),
  ).length

  const framing = clamp(
    28 +
      Math.min(evidence.framingSignals.length, 4) * 11 +
      (evidence.framingSignals.some((signal) => signal.includes('Situationsanker')) ? 8 : 0) -
      stuffing,
    18,
    100,
  )
  const information = clamp(
    26 + relevantAnalyses * 16 + Math.min(evidence.informationSignals.length, 4) * 5 - Math.floor(stuffing / 2),
    18,
    100,
  )
  const alternatives = clamp(
    26 +
      Math.min(evidence.alternativeSignals.length, 4) * 12 +
      (proposal.actions.length > 1 ? 10 : 0) -
      stuffing,
    18,
    100,
  )
  const objectives = clamp(
    28 + Math.min(evidence.objectiveSignals.length, 4) * 11 - stuffing,
    18,
    100,
  )
  const reasoning = clamp(
    26 + Math.min(evidence.reasoningSignals.length, 5) * 12 - stuffing,
    18,
    100,
  )
  const execution = clamp(
    30 +
      Math.min(evidence.executionSignals.length, 4) * 11 +
      (proposal.actions.length > 0 && proposal.actions.length <= 4 ? 6 : 0) -
      Math.floor(stuffing / 2),
    18,
    100,
  )
  const total = geometricMean([framing, information, alternatives, objectives, reasoning, execution])

  return {
    framing,
    information,
    alternatives,
    objectives,
    reasoning,
    execution,
    total,
    evidence,
  }
}

export function scoreDecisionSemantic(
  run: RunState,
  proposal: ActionProposal,
  playerText: string,
  rationale: string,
): { quality: DecisionQuality; context: DecisionContextSnapshot } {
  const scenario = getScenarioAtVersion(run.scenarioId, run.scenarioVersion)
  const evidence = extractDecisionEvidence(run, proposal, playerText, rationale)
  const quality = scoreDecisionFromEvidence(scenario, run, proposal, evidence)
  const context = buildDecisionContextSnapshot(run, proposal, playerText, rationale, evidence)
  return { quality, context }
}
