/**
 * Player-facing campaign clock + active/upcoming situations.
 * Location: src/features/campaign/CampaignSituationPanel.tsx
 * Omits hidden triggers; uses getPlayerCampaignView only.
 */
import {
  getPlayerCampaignView,
  getPublishedCampaignForScenario,
  type RunState,
} from '../../domain'
import { Card, SectionTitle, Tag } from '../../shared/ui'

export function CampaignSituationPanel({ run }: { run: RunState }) {
  const definition = getPublishedCampaignForScenario(run.scenarioId)
  const view = getPlayerCampaignView(run, definition)
  const monthLabel = `Monat ${Math.min(view.clockMonth + 1, view.durationMonths)} / ${view.durationMonths}`

  return (
    <Card className="campaign-panel" data-testid="campaign-panel">
      <SectionTitle title="Campaign" meta={view.ended ? 'beendet' : 'laufend'} />
      <p className="campaign-panel__clock" data-testid="campaign-clock">
        {monthLabel} · Tag {view.clockDay}
      </p>
      {view.active ? (
        <div className="campaign-panel__active" data-testid="campaign-active-situation">
          <Tag tone="warning">Aktiv</Tag>
          <h3>{view.active.title}</h3>
          <p>{view.active.context}</p>
          {view.active.deadlineDay !== undefined ? (
            <small>Entscheidungsfenster bis Tag {view.active.deadlineDay}</small>
          ) : null}
        </div>
      ) : (
        <p className="campaign-panel__empty" data-testid="campaign-active-empty">
          Keine aktive Situation — Zeit voranschreiten oder nächste Lage abwarten.
        </p>
      )}
      {view.upcoming.length > 0 ? (
        <div className="campaign-panel__upcoming" data-testid="campaign-upcoming">
          <strong>Kommende Lagen</strong>
          <ul>
            {view.upcoming.map((item) => (
              <li key={item.instanceId}>
                <span>{item.title}</span>
                <small>ab Tag {item.eligibleAtDay}</small>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  )
}
