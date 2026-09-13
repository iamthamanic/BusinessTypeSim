/** Home — active Decision Room entry (mockup Decision Room lite on Home). */
import { daysUntilDeadline, getScenarioAtVersion, type RunState } from '../../domain'
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
  const scenario = getScenarioAtVersion(run.scenarioId, run.scenarioVersion)
  const daysLeft = daysUntilDeadline(run)
  const latest = run.ledger.at(-1)
  const deadlineMissed = run.ledger.some((event) => event.id === 'deadline_missed')

  return (
    <div className="screen-stack">
      <section className={`priority-banner${daysLeft <= 0 ? ' priority-banner--overdue' : ''}`} data-testid="home-deadline-banner">
        <Tag tone={deadlineMissed || daysLeft <= 0 ? 'negative' : 'warning'}>
          {deadlineMissed ? 'Frist verpasst' : daysLeft <= 0 ? 'Frist erreicht' : 'Hohe Priorität'}
        </Tag>
        <div className="deadline" aria-live="polite">
          <span>{Math.max(0, daysLeft)}</span>
          <div>
            <strong>{daysLeft < 0 ? 'Tage überfällig' : 'Tage verbleibend'}</strong>
            <small>{deadlineMissed ? 'Konsequenzen im Verlauf sichtbar' : `Entscheidung bis Tag ${run.deadlineDay}`}</small>
          </div>
        </div>
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
          <div><strong>Mit dem Team sprechen</strong><span>Advisors befragen</span></div>
          <span className="action-row__chevron" aria-hidden="true">›</span>
        </button>
        <button type="button" className="action-row" onClick={onGoAnalyses}>
          <div><strong>Weitere Informationen anfordern</strong><span>Analysen freischalten</span></div>
          <span className="action-row__chevron" aria-hidden="true">›</span>
        </button>
        <button type="button" className="action-row" onClick={onGoDecision}>
          <div><strong>Entscheidung treffen</strong><span>Plan formulieren · 3 Schritte</span></div>
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
        <div className="button-row">
          <Button onClick={onGoDecision}>Decision Room öffnen</Button>
        </div>
      </Card>
    </div>
  )
}
