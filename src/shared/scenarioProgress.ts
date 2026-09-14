/**
 * Scenario run progress % for picker cards (campaign clock).
 * Location: src/shared/scenarioProgress.ts
 */
import type { ScenarioId } from '../domain'

export type ScenarioProgressSnapshot = {
  scenarioId: ScenarioId
  percent: number
  status: 'active' | 'completed' | 'failed'
}

const DAYS_PER_CAMPAIGN_MONTH = 30

export function progressPercentFromRun(input: {
  day: number
  status: 'active' | 'completed' | 'failed'
  campaign: { durationMonths: number; clockMonth: number; ended: boolean }
}): number {
  if (input.status === 'completed' || input.campaign.ended) return 100
  const durationMonths = Math.max(1, input.campaign.durationMonths)
  const totalDays = durationMonths * DAYS_PER_CAMPAIGN_MONTH
  const byDay = Math.round((Math.max(0, input.day) / totalDays) * 100)
  const byMonth = Math.round((Math.max(0, input.campaign.clockMonth) / durationMonths) * 100)
  return Math.min(100, Math.max(byDay, byMonth))
}

export function formatScenarioProgress(percent: number | null): string {
  if (percent === null) return 'Noch nicht begonnen'
  return `${percent}% fortgeschritten`
}
