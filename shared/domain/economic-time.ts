/** Compatibility shim — implementation lives in economic-tick.ts */
export {
  ECONOMIC_TICK_SCHEMA_VERSION,
  DAILY_PAYROLL_CENTS_PER_HEAD,
  PROJECT_PROGRESS_BPS_PER_DAY,
  HIRING_PIPELINE_CAPACITY_BPS_PER_DAY,
  DEADLINE_MISSED_LEDGER_ID,
  DEADLINE_CUSTOMER_EVENT_ID,
  DEADLINE_OFFER_EVENT_ID,
  dailyCashDeltaFromEbitda,
  dailyRevenueRecognitionCents,
  dailyPayrollBurnCents,
  hasDeadlineConsequence,
  analysisCompletesAfterDeadline,
  daysUntilDeadline,
  applyEconomicDay,
  softDeadlineConsequence,
  type EconomicDayResult,
} from './economic-tick.ts'
