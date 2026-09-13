/** Home — active Decision Room entry (mockup Decision Room lite on Home). */
import { getScenario, type RunState } from '../../domain'
import { Button, Card, MetricTile, SectionTitle, Tag } from '../../shared/ui'
import { formatMoney } from '../../shared/format'

export function HomeView({
  run,
  onGoDecision,
  onGoTeam,
  onGoAnalyses,
}: {
  run: RunState
  onGoDecision: () => void
  onGoTeam: () => void
  onGoAnalyses: () => void
}) {
  const scenario = getScenario(run.scenarioId)
  const daysLeft = Math.max(0, run.deadlineDay - run.day)
  const latest = run.ledger.at(-1)

  return (
    <div className="screen-stack">
      <section className="priority-banner">
        <Tag tone="negative">Hohe Priorität</Tag>
        <span>{daysLeft} Tage verbleibend</span>
      </section>

      <section className="home-hero">
        <span className="eyebrow">Decision Room</span>
        <h1>{scenario.decisionTitle}</h1>
        <p>{scenario.decisionContext}</p>
        <div className="contract-chip">
          <span>Aktueller Fokus</span>
          <strong>{formatMoney(run.metrics.revenueAnnualCents)} Umsatz / ARR</strong>
        </div>
      </section>

      <Card className="action-stack">
        <button type="button" className="action-row" onClick={onGoTeam}>
          <div>
            <strong>Mit dem Team sprechen</strong>
            <span>Advisors befragen</span>
          </div>
          <span className="action-row__chevron" aria-hidden="true">›</span>
        </button>
        <button type="button" className="action-row" onClick={onGoAnalyses}>
          <div>
            <strong>Weitere Informationen anfordern</strong>
            <span>Analysen freischalten</span>
          </div>
          <span className="action-row__chevron" aria-hidden="true">›</span>
        </button>
        <button type="button" className="action-row" onClick={onGoDecision}>
          <div>
            <strong>Entscheidung treffen</strong>
            <span>Plan formulieren · 3 Schritte</span>
          </div>
          <span className="action-row__chevron" aria-hidden="true">›</span>
        </button>
      </Card>

      <div className="metric-tile-grid">
        <MetricTile label="Cash" value={formatMoney(run.metrics.cashCents)} />
        <MetricTile label="Umsatz / ARR" value={formatMoney(run.metrics.revenueAnnualCents)} />
        <MetricTile label="EBITDA" value={formatMoney(run.metrics.ebitdaAnnualCents)} />
      </div>

      <Card>
        <SectionTitle title="Letzte Entwicklung" meta={`Tag ${latest?.day ?? run.day}`} />
        <h3>{latest?.title ?? 'Run gestartet'}</h3>
        <p>{latest?.body ?? scenario.headline}</p>
        <Button onClick={onGoDecision}>Decision Room öffnen</Button>
      </Card>
    </div>
  )
}
