/**
 * Auswertung + Ergebnis — mockup screens 9 + 10 (Decision Quality + 12 Monate später).
 */
import { useMemo, useState } from 'react'
import { getNextPendingEventDay, type DecisionRecord, type RunState } from '../../domain'
import type { DebriefResult } from '../../infrastructure/debrief'
import { formatDeltaPercent, formatMoney } from '../../shared/format'
import { Button, Card, ProgressBar, QualityGauge, SectionTitle, Tag } from '../../shared/ui'

export function LedgerView({
  run,
  latestDecision,
  debrief,
  busy,
  onAdvance,
  onDebrief,
}: {
  run: RunState
  latestDecision: DecisionRecord | null
  debrief: DebriefResult | null
  busy: boolean
  onAdvance: () => Promise<void>
  onDebrief: (decision: DecisionRecord) => Promise<void>
}) {
  const [pane, setPane] = useState<'quality' | 'result' | 'ledger'>('quality')
  const nextDay = getNextPendingEventDay(run)
  const baseline = latestDecision?.afterImmediate ?? run.metrics
  const unexpected = run.ledger.find((event) => event.type === 'delayed_effect' && event.tone !== 'positive')

  const deltas = useMemo(() => {
    if (!latestDecision) return []
    const before = latestDecision.before
    const after = latestDecision.afterImmediate
    return [
      { label: 'Umsatz / ARR', value: formatDeltaPercent((after.revenueAnnualCents - before.revenueAnnualCents) / Math.max(1, Math.abs(before.revenueAnnualCents))), tone: after.revenueAnnualCents >= before.revenueAnnualCents ? 'positive' : 'negative' as const },
      { label: 'EBITDA', value: formatDeltaPercent((after.ebitdaAnnualCents - before.ebitdaAnnualCents) / Math.max(1, Math.abs(before.ebitdaAnnualCents) || 1)), tone: after.ebitdaAnnualCents >= before.ebitdaAnnualCents ? 'positive' : 'negative' as const },
      { label: 'Cash', value: formatDeltaPercent((after.cashCents - before.cashCents) / Math.max(1, Math.abs(before.cashCents))), tone: after.cashCents >= before.cashCents ? 'positive' : 'negative' as const },
      { label: 'Organisation', value: formatDeltaPercent((after.moraleBps - before.moraleBps) / 10_000), tone: after.moraleBps >= before.moraleBps ? 'positive' : 'negative' as const },
      { label: 'Marktposition', value: formatDeltaPercent((after.marketPositionBps - before.marketPositionBps) / 10_000), tone: after.marketPositionBps >= before.marketPositionBps ? 'positive' : 'negative' as const },
    ]
  }, [latestDecision])

  return (
    <div className="screen-stack">
      <div className="screen-heading">
        <span className="eyebrow">Verlauf</span>
        <h1>Auswertung & Folgen</h1>
        <p>Prozessqualität und tatsächlicher Ausgang bleiben bewusst getrennt.</p>
      </div>

      <div className="segmented" role="tablist" aria-label="Verlaufsansicht">
        <button type="button" className={pane === 'quality' ? 'active' : ''} onClick={() => setPane('quality')}>Auswertung</button>
        <button type="button" className={pane === 'result' ? 'active' : ''} onClick={() => setPane('result')}>Ergebnis</button>
        <button type="button" className={pane === 'ledger' ? 'active' : ''} onClick={() => setPane('ledger')}>Ledger</button>
      </div>

      {pane === 'quality' ? (
        latestDecision ? (
          <DecisionQualityCard decision={latestDecision} onDetails={() => setPane('ledger')} />
        ) : (
          <Card><p>Noch keine Entscheidung committed. Im Decision Room kannst du den ersten Commit setzen.</p></Card>
        )
      ) : null}

      {pane === 'result' ? (
        <>
          <Card className="result-card">
            <SectionTitle title="12 Monate später" meta="Sofortwirkung + Vorspulen" />
            {latestDecision ? (
              <div className="delta-list">
                {deltas.map((item) => (
                  <div key={item.label} className={`delta-row delta-row--${item.tone}`}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p>Noch keine Wirkung — zuerst eine Entscheidung committen.</p>
            )}
            <p className="muted">Stand jetzt: Cash {formatMoney(baseline.cashCents)} · ARR {formatMoney(baseline.revenueAnnualCents)}</p>
          </Card>

          {unexpected ? (
            <Card className="unexpected-card">
              <Tag tone="warning">Unerwartetes Ereignis</Tag>
              <h3>{unexpected.title}</h3>
              <p>{unexpected.body}</p>
            </Card>
          ) : null}

          {nextDay !== null ? (
            <Card className="next-event-card">
              <div>
                <span className="eyebrow">Nächste verzögerte Folge</span>
                <h3>Tag {nextDay}</h3>
                <p>Vorspulen löst fällige Ereignisse mit demselben Run-Seed reproduzierbar auf.</p>
              </div>
              <Button disabled={busy} onClick={() => void onAdvance()}>Bis Tag {nextDay} vorspulen</Button>
            </Card>
          ) : null}
        </>
      ) : null}

      {pane === 'ledger' ? (
        <Card>
          <SectionTitle title="Ledger" meta={`${run.ledger.length} Ereignisse`} />
          <div className="ledger">
            {run.ledger.slice().reverse().map((event) => (
              <div className={`ledger-item ledger-item--${event.tone}`} key={event.id}>
                <span className="ledger-dot" />
                <div>
                  <small>Tag {event.day} · {event.type.replaceAll('_', ' ')}</small>
                  <strong>{event.title}</strong>
                  <p>{event.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {latestDecision ? (
        <Card>
          <SectionTitle title="Real-World-Debrief" meta="optional" />
          {debrief ? (
            <>
              <p>{debrief.summary}</p>
              <div className="source-list">
                {debrief.sources.map((source) => (
                  <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                    <strong>{source.title}</strong>
                    <span>{source.snippet}</span>
                  </a>
                ))}
              </div>
            </>
          ) : (
            <Button variant="secondary" disabled={busy} onClick={() => void onDebrief(latestDecision)}>
              Vergleichbare reale Fälle recherchieren
            </Button>
          )}
        </Card>
      ) : null}
    </div>
  )
}

function DecisionQualityCard({ decision, onDetails }: { decision: DecisionRecord; onDetails: () => void }) {
  const entries = useMemo(
    () =>
      [
        ['Framing', decision.quality.framing],
        ['Information', decision.quality.information],
        ['Alternativen', decision.quality.alternatives],
        ['Ziele', decision.quality.objectives],
        ['Reasoning', decision.quality.reasoning],
        ['Umsetzung', decision.quality.execution],
      ] as const,
    [decision],
  )

  return (
    <Card className="quality-card">
      <div className="quality-hero">
        <QualityGauge value={decision.quality.total} />
        <div>
          <Tag tone="accent">Decision Quality</Tag>
          <h2>Auswertung</h2>
          <p>Wie gut war der Prozess mit dem damaligen Informationsstand?</p>
        </div>
      </div>
      <div className="quality-grid">
        {entries.map(([label, value]) => (
          <div key={label}>
            <div><span>{label}</span><strong>{value}</strong></div>
            <ProgressBar value={value} />
          </div>
        ))}
      </div>
      <Button block variant="secondary" onClick={onDetails}>Details ansehen</Button>
    </Card>
  )
}
