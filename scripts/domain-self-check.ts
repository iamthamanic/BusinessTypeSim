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
assert(run.completedAnalyses.length === 1, 'analysis completion')

const playerText = 'Wir automatisieren zuerst Thüringen als Pilot und verhandeln Lidl auf eine Mindestmarge. Kapazität priorisieren wir für Premiumprodukte.'
const rationale = 'Damit verbessern wir Marge und Kapazität schrittweise. Risiko sind Cash, Umsetzung und Lidl-Reaktion; deshalb keine Massenentlassung, sondern Fluktuation.'
const proposal = interpretDecisionLocally(run, playerText, rationale)
assert(proposal.actions.length >= 2, 'multi-action interpretation')
const beforeCash = run.metrics.cashCents
run = commitDecision(run, playerText, rationale, proposal)
assert(run.decisions.length === 1, 'decision commit')
assert((run.decisions[0]?.quality.total ?? 0) > 50, 'decision quality score')
assert(run.metrics.cashCents < beforeCash, 'capital effect')
const dueDay = getNextPendingEventDay(run)
assert(dueDay !== null, 'delayed event scheduled')
run = advanceTime(run, Math.max(1, (dueDay ?? run.day) - run.day))
assert(run.scheduledEvents.some((event) => event.resolved), 'delayed event resolved')
assert(run.ledger.some((event) => event.type === 'delayed_effect'), 'ledger records delayed effect')
console.log('domain-self-check: PASS')
