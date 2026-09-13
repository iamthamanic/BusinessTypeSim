/** Company overview — mockup screen 3: KPI tiles, sparkline, key metrics. */
import { useMemo, useState } from 'react'
import { getScenario, type RunState } from '../../domain'
import { buildTrendSeries, estimateRunwayMonths, formatMoney, formatPercent } from '../../shared/format'
import { Card, MetricTile, SectionTitle, Sparkline, Tag } from '../../shared/ui'

type Tab = 'overview' | 'finance' | 'customers' | 'team'

export function CompanyView({ run }: { run: RunState }) {
  const scenario = getScenario(run.scenarioId)
  const [tab, setTab] = useState<Tab>('overview')
  const trend = useMemo(
    () => buildTrendSeries(run.seed, run.metrics.revenueAnnualCents),
    [run.seed, run.metrics.revenueAnnualCents],
  )
  const runway = estimateRunwayMonths(run.metrics.cashCents, run.metrics.ebitdaAnnualCents)
  const growth = trend.length >= 2
    ? Math.round(((trend[trend.length - 1]! - trend[0]!) / Math.max(1, trend[0]!)) * 100)
    : 0

  return (
    <div className="screen-stack">
      <div className="screen-heading">
        <span className="eyebrow">Unternehmensübersicht</span>
        <div className="title-row">
          <h1>{scenario.companyName}</h1>
          <Tag tone="positive">{scenario.stage}</Tag>
        </div>
        <p>{scenario.scaleLabel}</p>
      </div>

      <div className="segmented" role="tablist" aria-label="Unternehmensbereiche">
        {(
          [
            ['overview', 'Übersicht'],
            ['finance', 'Finanzen'],
            ['customers', 'Kunden'],
            ['team', 'Team'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className="metric-tile-grid metric-tile-grid--2">
        <MetricTile label="Cash" value={formatMoney(run.metrics.cashCents)} />
        <MetricTile label="Umsatz / ARR" value={formatMoney(run.metrics.revenueAnnualCents)} hint={growth >= 0 ? `▲ ${growth} % Trend` : `▼ ${Math.abs(growth)} % Trend`} tone={growth >= 0 ? 'positive' : 'negative'} />
        <MetricTile label="Runway" value={`${runway} Monate`} hint="Schätzung aus Cash & Burn" />
        <MetricTile label="Mitarbeitende" value={String(run.metrics.headcount)} />
      </div>

      {(tab === 'overview' || tab === 'finance') && (
        <Card className="chart-card">
          <SectionTitle title="Umsatz / ARR" meta="Q1 → Jetzt" />
          <Sparkline values={trend} positive={growth >= 0} />
          <div className="chart-legend">
            <span>Q1</span><span>Q2</span><span>Q3</span><span>Jetzt</span>
          </div>
        </Card>
      )}

      {(tab === 'overview' || tab === 'finance') && (
        <Card>
          <SectionTitle title="Wichtigste Kennzahlen" />
          <div className="kv-list">
            <div><span>EBITDA</span><strong className="tone-pos">{formatMoney(run.metrics.ebitdaAnnualCents)}</strong></div>
            <div><span>Organisation</span><strong>{formatPercent(run.metrics.moraleBps)}</strong></div>
            <div><span>Resilienz</span><strong>{formatPercent(run.metrics.resilienceBps)}</strong></div>
            <div><span>Marktposition</span><strong className="tone-pos">{formatPercent(run.metrics.marketPositionBps)}</strong></div>
          </div>
        </Card>
      )}

      {tab === 'customers' ? (
        <Card>
          <SectionTitle title="Kunden & Markt" />
          <div className="kv-list">
            <div><span>Kundenkonzentration</span><strong>{formatPercent(run.metrics.customerConcentrationBps)}</strong></div>
            <div><span>Marktposition</span><strong>{formatPercent(run.metrics.marketPositionBps)}</strong></div>
          </div>
          <ul className="fact-list">{scenario.knownFacts.slice(0, 3).map((fact) => <li key={fact}>{fact}</li>)}</ul>
        </Card>
      ) : null}

      {tab === 'team' ? (
        <Card>
          <SectionTitle title="Organisation" />
          <div className="kv-list">
            <div><span>Headcount</span><strong>{run.metrics.headcount}</strong></div>
            <div><span>Kapazitätsdruck</span><strong>{formatPercent(run.metrics.capacityUtilizationBps)}</strong></div>
            <div><span>Morale</span><strong>{formatPercent(run.metrics.moraleBps)}</strong></div>
          </div>
          <div className="chip-row">{scenario.advisors.map((advisor) => <Tag key={advisor.id}>{advisor.role}</Tag>)}</div>
        </Card>
      ) : null}

      {tab === 'overview' ? (
        <Card>
          <SectionTitle title="Was sicher bekannt ist" />
          <ul className="fact-list">{scenario.knownFacts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
        </Card>
      ) : null}
    </div>
  )
}
