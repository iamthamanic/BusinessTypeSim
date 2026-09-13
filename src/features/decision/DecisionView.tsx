/**
 * Decision Room + analyses + multi-step decision + simulation.
 * Mockup screens 4, 6, 7, 8.
 */
import { useEffect, useState } from 'react'
import { getPlayerScenario, type ActionProposal, type RunState } from '../../domain'
import { Button, Card, SectionTitle, Tag } from '../../shared/ui'

export type DecisionPhase = 'room' | 'analyses' | 'compose' | 'rationale' | 'review' | 'simulating'

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="stepper" aria-label={`Schritt ${step} von 3`}>
      {[1, 2, 3].map((n) => (
        <div key={n} className={`stepper__item${n === step ? ' active' : ''}${n < step ? ' done' : ''}`}>
          <span>{n}</span>
          <small>{n === 1 ? 'Plan' : n === 2 ? 'Begründung' : 'Review'}</small>
        </div>
      ))}
    </div>
  )
}

function AnalysisIcon({ index }: { index: number }) {
  const paths = [
    'M4 18V10M10 18V6M16 18v-8M22 18V4',
    'M12 21a8 8 0 1 0-8-8',
    'M4 7h16M4 12h10M4 17h14',
    'M5 19V5h6l2 3h6v11H5Z',
    'M12 3v18M5 9l7-4 7 4M5 15l7 4 7-4',
  ]
  return (
    <span className="analysis-icon" aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d={paths[index % paths.length]} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

export function DecisionView({
  run,
  decisionText,
  rationale,
  proposal,
  busy,
  phase,
  commitBlockedReason,
  onPhase,
  onDecisionText,
  onRationale,
  onAnalysis,
  onPrepare,
  onConfirm,
  onResetProposal,
  onOpenTeam,
}: {
  run: RunState
  decisionText: string
  rationale: string
  proposal: ActionProposal | null
  busy: boolean
  phase: DecisionPhase
  commitBlockedReason?: string | null
  onPhase: (phase: DecisionPhase) => void
  onDecisionText: (value: string) => void
  onRationale: (value: string) => void
  onAnalysis: (analysisId: string) => Promise<void>
  onPrepare: () => Promise<void>
  onConfirm: () => Promise<void>
  onResetProposal: () => void
  onOpenTeam: () => void
}) {
  const scenario = getPlayerScenario(run.scenarioId)
  const daysLeft = Math.max(0, run.deadlineDay - run.day)

  if (phase === 'simulating') return <SimulationScreen busy={busy} />

  if (phase === 'analyses') {
    return (
      <div className="screen-stack">
        <div className="screen-heading">
          <button type="button" className="text-back" onClick={() => onPhase('room')}>‹ Decision Room</button>
          <span className="eyebrow">Informationsbeschaffung</span>
          <h1>Analysen anfordern</h1>
          <p>Analysen benötigen Simulationszeit. Das Ergebnis erscheint erst an dem Fälligkeitstag.</p>
        </div>
        <Card className="analysis-menu">
          {scenario.analyses.map((analysis, index) => {
            const complete = run.completedAnalyses.find((item) => item.analysisId === analysis.id)
            const pending = run.pendingAnalyses.find((item) => item.analysisId === analysis.id)
            return (
              <div className={`analysis-menu__row${complete ? ' is-done' : ''}${pending ? ' is-pending' : ''}`} key={analysis.id}>
                <AnalysisIcon index={index} />
                <div>
                  <strong>{analysis.title}</strong>
                  <p>{complete ? complete.resultBody : analysis.description}</p>
                  <small>
                    {complete
                      ? `Sicherheit: ${complete.confidence}`
                      : pending
                        ? `Läuft · Ergebnis an Tag ${pending.availableAtDay}`
                        : `${analysis.durationDays} Simulations-Tage`}
                  </small>
                </div>
                {complete ? (
                  <Tag tone="positive">Fertig</Tag>
                ) : pending ? (
                  <Tag tone="warning">Pending</Tag>
                ) : (
                  <Button variant="secondary" disabled={busy} onClick={() => void onAnalysis(analysis.id)}>Anfordern</Button>
                )}
              </div>
            )
          })}
        </Card>
        <Button block variant="soft" onClick={() => onPhase('room')}>Zurück zum Decision Room</Button>
      </div>
    )
  }

  if (phase === 'compose' || phase === 'rationale' || phase === 'review') {
    const step = phase === 'compose' ? 1 : phase === 'rationale' ? 2 : 3
    return (
      <div className="screen-stack">
        <div className="screen-heading">
          <button type="button" className="text-back" onClick={() => onPhase(phase === 'compose' ? 'room' : phase === 'rationale' ? 'compose' : 'rationale')}>
            ‹ Zurück
          </button>
          <span className="eyebrow">Entscheidung treffen</span>
          <h1>{phase === 'compose' ? 'Was ist dein Plan?' : phase === 'rationale' ? 'Warum dieser Plan?' : 'Prüfen & committen'}</h1>
        </div>
        <Stepper step={step} />

        {phase === 'compose' ? (
          <Card className="composer-card">
            <label>
              <span>Freitext</span>
              <textarea
                value={decisionText}
                onChange={(event) => { onDecisionText(event.target.value); onResetProposal() }}
                rows={8}
                placeholder="Zum Beispiel: Wir entwickeln eine gemeinsame AI-Roadmap mit dem Großkunden und halten Mid-Market parallel …"
              />
            </label>
            <Button block disabled={!decisionText.trim()} onClick={() => onPhase('rationale')}>Weiter →</Button>
          </Card>
        ) : null}

        {phase === 'rationale' ? (
          <Card className="composer-card">
            <label>
              <span>Begründung & Annahmen</span>
              <textarea
                value={rationale}
                onChange={(event) => { onRationale(event.target.value); onResetProposal() }}
                rows={8}
                placeholder="Welche Ziele, Risiken, Alternativen und Annahmen sind entscheidend?"
              />
            </label>
            <Button
              block
              disabled={busy || !decisionText.trim()}
              onClick={() => { void onPrepare().then(() => onPhase('review')) }}
            >
              {busy ? 'Prüfe …' : 'Weiter zur Prüfung →'}
            </Button>
          </Card>
        ) : null}

        {phase === 'review' ? (
          <Card className="proposal-card">
            <SectionTitle title="So haben wir dich verstanden" meta="Vor Commit korrigierbar" />
            {proposal ? (
              <>
                <div className="proposal-actions">
                  {proposal.actions.map((action) => (
                    <div key={action.id}><Tag tone="positive">Action</Tag><strong>{action.label}</strong></div>
                  ))}
                </div>
                {proposal.ambiguities.length ? <div className="warning-box"><strong>Offen:</strong> {proposal.ambiguities.join(' ')}</div> : null}
                <div className="proposal-meta">
                  <span>Ziele: {proposal.extractedObjectives.join(', ') || 'nicht explizit erkannt'}</span>
                  <span>Risiken: {proposal.extractedRisks.join(', ') || 'nicht explizit erkannt'}</span>
                  <span>Evidence: {proposal.evidenceRefs.length} Analyse(n)</span>
                </div>
              </>
            ) : (
              <p>Keine strukturierte Interpretation — du kannst zurück und neu formulieren.</p>
            )}
            <div className="button-row">
              <Button variant="secondary" onClick={() => onPhase('compose')}>Überarbeiten</Button>
              <Button
                disabled={busy || !proposal || Boolean(commitBlockedReason)}
                onClick={() => { onPhase('simulating'); void onConfirm() }}
              >
                Committen & simulieren
              </Button>
            </div>
            {commitBlockedReason ? <p className="offline-hint" role="status">{commitBlockedReason}</p> : null}
          </Card>
        ) : null}
      </div>
    )
  }

  return (
    <div className="screen-stack">
      <section className="priority-banner">
        <Tag tone="negative">Hohe Priorität</Tag>
        <span>{daysLeft} Tage verbleibend</span>
      </section>
      <div className="screen-heading">
        <span className="eyebrow">Decision Room</span>
        <h1>{scenario.decisionTitle}</h1>
        <p>{scenario.decisionContext}</p>
      </div>
      <Card className="key-decision-card">
        <span className="eyebrow">Key Decision</span>
        <h2>Entscheidung unter Unsicherheit</h2>
        <p>Sprich mit dem Team, beschaffe Informationen oder formuliere jetzt deine Entscheidung.</p>
      </Card>
      <Card className="action-stack">
        <button type="button" className="action-row" onClick={onOpenTeam}>
          <div><strong>Mit dem Team sprechen</strong><span>Advisors befragen</span></div>
          <span className="action-row__chevron" aria-hidden="true">›</span>
        </button>
        <button type="button" className="action-row" onClick={() => onPhase('analyses')}>
          <div><strong>Weitere Informationen anfordern</strong><span>{run.completedAnalyses.length}/{scenario.analyses.length} freigeschaltet{run.pendingAnalyses.length ? ` · ${run.pendingAnalyses.length} pending` : ''}</span></div>
          <span className="action-row__chevron" aria-hidden="true">›</span>
        </button>
        <button type="button" className="action-row" onClick={() => onPhase('analyses')}>
          <div><strong>Eigene Analyse durchführen</strong><span>Evidence sammeln</span></div>
          <span className="action-row__chevron" aria-hidden="true">›</span>
        </button>
        <button type="button" className="action-row" onClick={() => onPhase('compose')}>
          <div><strong>Entscheidung treffen</strong><span>Plan · Begründung · Review</span></div>
          <span className="action-row__chevron" aria-hidden="true">›</span>
        </button>
      </Card>
    </div>
  )
}

function SimulationScreen({ busy }: { busy: boolean }) {
  const steps = [
    'Entscheidung wird analysiert',
    'Auswirkungen werden berechnet',
    'Markt reagiert',
    'Organisation passt sich an',
  ]
  const [done, setDone] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setDone((current) => Math.min(steps.length, current + 1))
    }, 480)
    return () => window.clearInterval(id)
  }, [steps.length])

  return (
    <div className="simulation-screen">
      <div className="simulation-stack" aria-hidden="true">
        <span /><span /><span /><span />
      </div>
      <h1>Die Zukunft entfaltet sich</h1>
      <p>Die Simulation wertet deine Entscheidung seeded und reproduzierbar aus.</p>
      <ul className="simulation-checklist">
        {steps.map((step, index) => (
          <li key={step} className={index < done ? 'done' : ''}>
            <span className="check">{index < done ? '✓' : ''}</span>
            {step}
          </li>
        ))}
      </ul>
      <small className="muted">{busy ? 'Berechne …' : 'Abschluss …'}</small>
    </div>
  )
}
