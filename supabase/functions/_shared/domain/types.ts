export type ScenarioId = string
export type AnalysisId = string
export type ActionKind = string
export type MetricTone = 'positive' | 'negative' | 'neutral' | 'warning'

export interface CompanyMetrics {
  headcount: number
  capacityUtilizationBps: number
  moraleBps: number
  resilienceBps: number
  marketPositionBps: number
}
