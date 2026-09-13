/**
 * App shell — orchestration for onboarding, scenario start, run navigation.
 * Location: src/app/App.tsx
 */
import { useEffect, useState, type ReactNode } from 'react'
import {
  advanceTime,
  commitDecision,
  createRun,
  getNextPendingEventDay,
  getScenario,
  requestAnalysis,
  type ActionProposal,
  type DecisionRecord,
  type RunState,
  type ScenarioId,
} from '../domain'
import { CompanyView } from '../features/company/CompanyView'
import { DecisionView, type DecisionPhase } from '../features/decision/DecisionView'
import { HomeView } from '../features/home/HomeView'
import { LedgerView } from '../features/ledger/LedgerView'
import { OnboardingScreen } from '../features/onboarding/OnboardingScreen'
import { ScenarioPicker } from '../features/scenario/ScenarioPicker'
import { TeamView, type AdvisorThread } from '../features/team/TeamView'
import { askAdvisor, interpretDecision } from '../infrastructure/ai'
import {
  advanceCloudTime,
  commitCloudDecision,
  createCloudRun,
  requestCloudAnalysis,
} from '../infrastructure/cloud-game'
import { fetchDebrief, type DebriefResult } from '../infrastructure/debrief'
import { clearLocalRun, loadLocalRun, saveLocalRun } from '../infrastructure/local-run'
import { cloudConfigured, getSession, signOut } from '../infrastructure/cloud'
import { BrandMark } from '../shared/BrandMark'
import { IconCompany, IconDecision, IconHome, IconLedger, IconTeam } from '../shared/icons'
import { Button, Card, Tag } from '../shared/ui'

type View = 'home' | 'company' | 'decision' | 'team' | 'ledger'
type RunMode = 'local' | 'cloud'

const ONBOARDING_KEY = 'bt.onboarding.seen'

function randomSeed(): string {
  const bytes = crypto.getRandomValues(new Uint32Array(2))
  return `${bytes[0]?.toString(36)}-${bytes[1]?.toString(36)}`
}

export function App() {
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem(ONBOARDING_KEY) === '1')
  const [run, setRun] = useState<RunState | null>(() => loadLocalRun())
  const [view, setView] = useState<View>('home')
  const [runMode, setRunMode] = useState<RunMode>('local')
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [proposal, setProposal] = useState<ActionProposal | null>(null)
  const [decisionText, setDecisionText] = useState('')
  const [rationale, setRationale] = useState('')
  const [decisionPhase, setDecisionPhase] = useState<DecisionPhase>('room')
  const [threads, setThreads] = useState<AdvisorThread[]>([])
  const [debrief, setDebrief] = useState<DebriefResult | null>(null)

  useEffect(() => {
    void getSession().then((session) => setSessionEmail(session?.email ?? null))
  }, [])

  useEffect(() => {
    if (run && runMode === 'local') saveLocalRun(run)
  }, [run, runMode])

  const scenario = run ? getScenario(run.scenarioId) : null
  const latestDecision = run?.decisions.at(-1) ?? null

  async function startScenario(scenarioId: ScenarioId, mode: RunMode) {
    setBusy(true)
    setNotice(null)
    setProposal(null)
    setDecisionText('')
    setRationale('')
    setDebrief(null)
    setDecisionPhase('room')
    try {
      const seed = randomSeed()
      const next = mode === 'cloud' ? await createCloudRun(scenarioId, seed) : createRun(scenarioId, seed)
      setRunMode(mode)
      setRun(next)
      setView('home')
      if (mode === 'local') saveLocalRun(next)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Run konnte nicht gestartet werden.')
    } finally {
      setBusy(false)
    }
  }

  function resetRun() {
    clearLocalRun()
    setRun(null)
    setProposal(null)
    setDebrief(null)
    setDecisionPhase('room')
    setView('home')
  }

  async function performAnalysis(analysisId: string) {
    if (!run) return
    setBusy(true)
    setNotice(null)
    try {
      const next = runMode === 'cloud'
        ? await requestCloudAnalysis(run.runId, run.revision, analysisId)
        : requestAnalysis(run, analysisId)
      setRun(next)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Analyse fehlgeschlagen.')
    } finally {
      setBusy(false)
    }
  }

  async function prepareDecision() {
    if (!run || !decisionText.trim()) return
    setBusy(true)
    setNotice(null)
    try {
      const nextProposal = await interpretDecision(run, decisionText.trim(), rationale.trim(), runMode === 'cloud')
      setProposal(nextProposal)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Entscheidung konnte nicht interpretiert werden.')
    } finally {
      setBusy(false)
    }
  }

  async function confirmDecision() {
    if (!run || !proposal) return
    setBusy(true)
    setNotice(null)
    try {
      const next = runMode === 'cloud'
        ? await commitCloudDecision(run.runId, run.revision, decisionText.trim(), rationale.trim(), proposal)
        : commitDecision(run, decisionText.trim(), rationale.trim(), proposal)
      setRun(next)
      setProposal(null)
      setDecisionPhase('room')
      setView('ledger')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Entscheidung konnte nicht committed werden.')
      setDecisionPhase('review')
    } finally {
      setBusy(false)
    }
  }

  async function advanceToNextEvent() {
    if (!run) return
    const nextDay = getNextPendingEventDay(run)
    if (nextDay === null) {
      setNotice('Aktuell ist kein verzögertes Ereignis geplant.')
      return
    }
    const days = Math.max(1, nextDay - run.day)
    setBusy(true)
    try {
      const next = runMode === 'cloud'
        ? await advanceCloudTime(run.runId, run.revision, days)
        : advanceTime(run, days)
      setRun(next)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Zeit konnte nicht fortgeschrieben werden.')
    } finally {
      setBusy(false)
    }
  }

  async function submitAdvisorQuestion(advisorId: string, question: string) {
    if (!run || !question.trim()) return
    const text = question.trim()
    setThreads((current) => upsertThread(current, advisorId, { role: 'user', text }))
    try {
      const answer = await askAdvisor(run, advisorId, text, runMode === 'cloud')
      setThreads((current) => upsertThread(current, advisorId, { role: 'advisor', text: answer }))
    } catch (error) {
      setThreads((current) => upsertThread(current, advisorId, {
        role: 'advisor',
        text: error instanceof Error ? error.message : 'Antwort nicht verfügbar.',
      }))
    }
  }

  async function loadDebrief(decision: DecisionRecord) {
    if (!run || runMode !== 'cloud') {
      setNotice('Reale Vergleichsfälle sind im Cloud-Modus verfügbar.')
      return
    }
    setBusy(true)
    try {
      setDebrief(await fetchDebrief(run.runId, decision.id))
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Debrief nicht verfügbar.')
    } finally {
      setBusy(false)
    }
  }

  if (!onboarded) {
    return (
      <OnboardingScreen
        onContinue={() => {
          localStorage.setItem(ONBOARDING_KEY, '1')
          setOnboarded(true)
        }}
      />
    )
  }

  if (!run || !scenario) {
    return (
      <ScenarioPicker
        busy={busy}
        sessionEmail={sessionEmail}
        cloudConfigured={cloudConfigured}
        onStart={startScenario}
        onAuthChange={setSessionEmail}
        onLogout={signOut}
      />
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar__brand">
          <BrandMark size={36} />
          <div>
            <span className="eyebrow">{scenario.industry} · Tag {run.day}</span>
            <strong>{scenario.companyName}</strong>
          </div>
        </div>
        <div className="topbar__actions">
          <Tag tone={runMode === 'cloud' ? 'positive' : 'neutral'}>{runMode === 'cloud' ? 'Cloud' : 'Demo lokal'}</Tag>
          <button className="icon-button" onClick={resetRun} aria-label="Run beenden">×</button>
        </div>
      </header>

      <main className="app-content">
        {notice ? (
          <div className="notice" role="status">
            {notice}
            <button type="button" onClick={() => setNotice(null)}>Schließen</button>
          </div>
        ) : null}

        {run.status === 'failed' ? (
          <Card className="failure-card">
            <Tag tone="negative">Run beendet</Tag>
            <h1>Liquidität ist aufgebraucht.</h1>
            <p>Der Run endet wirtschaftlich. Im Verlauf kannst du nachvollziehen, welche Entscheidungen und Ereignisse dazu beigetragen haben.</p>
            <Button onClick={resetRun}>Neues Szenario</Button>
          </Card>
        ) : null}

        {view === 'home' ? (
          <HomeView
            run={run}
            onGoDecision={() => { setDecisionPhase('compose'); setView('decision') }}
            onGoTeam={() => setView('team')}
            onGoAnalyses={() => { setDecisionPhase('analyses'); setView('decision') }}
          />
        ) : null}
        {view === 'company' ? <CompanyView run={run} /> : null}
        {view === 'decision' ? (
          <DecisionView
            run={run}
            decisionText={decisionText}
            rationale={rationale}
            proposal={proposal}
            busy={busy}
            phase={decisionPhase}
            onPhase={setDecisionPhase}
            onDecisionText={setDecisionText}
            onRationale={setRationale}
            onAnalysis={performAnalysis}
            onPrepare={prepareDecision}
            onConfirm={confirmDecision}
            onResetProposal={() => setProposal(null)}
            onOpenTeam={() => setView('team')}
          />
        ) : null}
        {view === 'team' ? <TeamView run={run} threads={threads} onAsk={submitAdvisorQuestion} /> : null}
        {view === 'ledger' ? (
          <LedgerView
            run={run}
            latestDecision={latestDecision}
            debrief={debrief}
            busy={busy}
            onAdvance={advanceToNextEvent}
            onDebrief={loadDebrief}
          />
        ) : null}
      </main>

      <nav className="bottom-nav" aria-label="Hauptnavigation">
        <NavButton active={view === 'home'} label="Home" icon={<IconHome active={view === 'home'} />} onClick={() => setView('home')} />
        <NavButton active={view === 'company'} label="Unternehmen" icon={<IconCompany active={view === 'company'} />} onClick={() => setView('company')} />
        <NavButton active={view === 'decision'} label="Entscheidung" icon={<IconDecision active={view === 'decision'} />} onClick={() => { setDecisionPhase('room'); setView('decision') }} />
        <NavButton active={view === 'team'} label="Advisors" icon={<IconTeam active={view === 'team'} />} onClick={() => setView('team')} />
        <NavButton active={view === 'ledger'} label="Mehr" icon={<IconLedger active={view === 'ledger'} />} onClick={() => setView('ledger')} />
      </nav>
    </div>
  )
}

function NavButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean
  label: string
  icon: ReactNode
  onClick: () => void
}) {
  return (
    <button type="button" className={active ? 'active' : ''} onClick={onClick}>
      {icon}
      <small>{label}</small>
    </button>
  )
}

function upsertThread(
  threads: AdvisorThread[],
  advisorId: string,
  message: AdvisorThread['messages'][number],
): AdvisorThread[] {
  const existing = threads.find((thread) => thread.advisorId === advisorId)
  if (!existing) return [...threads, { advisorId, messages: [message] }]
  return threads.map((thread) =>
    thread.advisorId === advisorId ? { ...thread, messages: [...thread.messages, message] } : thread,
  )
}
