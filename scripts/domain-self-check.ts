import {
  advanceTime,
  commitDecision,
  createRun,
  getNextPendingEventDay,
  interpretDecisionLocally,
  requestAnalysis,
} from '../shared/domain/index.ts'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Self-check failed: ${message}`)
}

let run = createRun('nordkern-foods', 'self-check')
assert(run.metrics.revenueAnnualCents === 14_800_000_000, 'starting revenue')
run = requestAnalysis(run, 'food-profitability')
assert(run.pendingAnalyses.length === 1, 'analysis pending')
assert(run.completedAnalyses.length === 0, 'analysis not yet complete')
const dueAnalysis = getNextPendingEventDay(run)
assert(dueAnalysis !== null, 'pending analysis day')
run = advanceTime(run, Math.max(1, (dueAnalysis ?? run.day) - run.day))
assert(run.completedAnalyses.length === 1, 'analysis completion after advance')
assert(run.pendingAnalyses.length === 0, 'pending cleared')

const playerText = 'Wir automatisieren zuerst Thüringen als Pilot und verhandeln Lidl auf eine Mindestmarge. Kapazität priorisieren wir für Premiumprodukte.'
const rationale = 'Damit verbessern wir Marge und Kapazität schrittweise. Risiko sind Cash, Umsetzung und Lidl-Reaktion; deshalb keine Massenentlassung, sondern Fluktuation.'
const proposal = interpretDecisionLocally(run, playerText, rationale)
assert(proposal.actions.length >= 2, 'multi-action interpretation')
const beforeCash = run.metrics.cashCents
const idem = 'self-check-commit-key-001'
run = commitDecision(run, playerText, rationale, proposal, idem)
assert(run.decisions.length === 1, 'decision commit')
const afterFirst = run
run = commitDecision(run, playerText, rationale, proposal, idem)
assert(run.revision === afterFirst.revision, 'idempotent commit')
assert(run.decisions.length === 1, 'no double decision')
assert((run.decisions[0]?.quality.total ?? 0) > 50, 'decision quality score')
assert(run.metrics.cashCents < beforeCash, 'capital effect')
const dueDay = getNextPendingEventDay(run)
assert(dueDay !== null, 'delayed event scheduled')
run = advanceTime(run, Math.max(1, (dueDay ?? run.day) - run.day))
assert(run.scheduledEvents.some((event) => event.resolved), 'delayed event resolved')
assert(run.ledger.some((event) => event.type === 'delayed_effect'), 'ledger records delayed effect')
console.log('domain-self-check: PASS')
