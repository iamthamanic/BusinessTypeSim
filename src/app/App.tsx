/**
 * App shell — orchestration for onboarding, scenario start, run navigation.
 * Location: src/app/App.tsx
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import {
  advanceTime,
  commitDecision,
  createRun,
  getNextPendingEventDay,
  getPlayerScenario,
  requestAnalysis,
  type ActionProposal,
  type DecisionRecord,
  type RunState,
  type ScenarioId,
  HOUSE_ASSISTANT_ID,
} from '../domain'
import { CompanyView } from '../features/company/CompanyView'
import { DecisionView, type DecisionPhase } from '../features/decision/DecisionView'
import { LedgerView } from '../features/ledger/LedgerView'
import { OnboardingScreen } from '../features/onboarding/OnboardingScreen'
import { DecisionRoomView } from '../features/room/DecisionRoomView'
import { ScenarioPicker } from '../features/scenario/ScenarioPicker'
import { type AdvisorThread } from '../features/team/TeamView'
import { askAdvisor, interpretDecision } from '../infrastructure/ai'
import { clearCloudDraft, isBrowserOnline, loadCloudDraft, saveCloudDraft } from '../infrastructure/cloud-draft'
import { resetAllScenarioProgress } from '../infrastructure/reset-scenarios'
import {
  advanceCloudTime,
  commitCloudDecision,
  createCloudRun,
  requestCloudAnalysis,
} from '../infrastructure/cloud-game'
import { fetchDebrief, type DebriefResult } from '../infrastructure/debrief'
import { clearLocalRun, loadLocalRun, saveLocalRun } from '../infrastructure/local-run'
import { cloudConfigured, getSession, signOut } from '../infrastructure/cloud'
import { requiresAuthSession } from '../infrastructure/auth-gate'
import { AuthPanel, type AuthScreen } from '../features/auth/AuthPanel'
import { BrandMark } from '../shared/BrandMark'
import { CompanyMark, companyCoverSrc, companyShortLabel } from '../shared/CompanyMark'
import { IconBack, IconCockpit, IconCompany, IconLedger } from '../shared/icons'
import { scenarioIdFromSlug, scenarioSlug } from '../shared/scenarioRoutes'
import { Button, Card, Tag } from '../shared/ui'
import { RoomInfoSheet } from '../features/room/RoomInfoSheet'
import {
  areQuestsRevealed,
  e2eSkipOpeningDelay,
  ensureOpeningBriefThread,
  markOpeningStreamDone,
  readQuestRevealAt,
  scheduleQuestReveal,
} from '../features/room/openingBrief'

const NOTICE_DE: Record<string, string> = {
  AUTH_REQUIRED: 'Anmeldung abgelaufen oder ungültig — bitte erneut einloggen.',
  BEARER_TOKENS_MISSING: 'Sitzung unvollständig — bitte erneut anmelden.',
  SESSION_REVOKED: 'Sitzung ungültig — bitte neu anmelden.',
  RATE_LIMITED: 'Zu viele Versuche — bitte später erneut.',
}

function humanNotice(message: string): string {
  return NOTICE_DE[message] ?? message
}

function messageClock(): string {
  return new Date().toISOString()
}

type View = 'raum' | 'company' | 'ledger'
type RunMode = 'local' | 'cloud'

const ONBOARDING_KEY = 'bt.onboarding.seen'

function authDeepLink(): { screen: AuthScreen; token: string | null } {
  try {
    const params = new URLSearchParams(window.location.search)
    const verify = params.get('verify')
    if (verify) return { screen: 'verify', token: verify }
    const reset = params.get('reset')
    if (reset) return { screen: 'reset-confirm', token: reset }
  } catch {
    // ignore
  }
  return { screen: 'login', token: null }
}

function randomSeed(): string {
  const bytes = crypto.getRandomValues(new Uint32Array(2))
  return `${bytes[0]?.toString(36)}-${bytes[1]?.toString(36)}`
}

function newIdempotencyKey(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function App() {
  const navigate = useNavigate()
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem(ONBOARDING_KEY) === '1')
  const authRequired = requiresAuthSession(cloudConfigured)
  const [run, setRun] = useState<RunState | null>(() => (authRequired ? null : loadLocalRun()))
  const [view, setView] = useState<View>('raum')
  const [runMode, setRunMode] = useState<RunMode>('local')
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(!cloudConfigured)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [proposal, setProposal] = useState<ActionProposal | null>(null)
  const [decisionText, setDecisionText] = useState('')
  const [rationale, setRationale] = useState('')
  const [decisionPhase, setDecisionPhase] = useState<DecisionPhase>('room')
  const [roomInfoOpen, setRoomInfoOpen] = useState(false)
  const [threads, setThreads] = useState<AdvisorThread[]>([])
  const [questsRevealed, setQuestsRevealed] = useState(true)
  const [debrief, setDebrief] = useState<DebriefResult | null>(null)
  const [online, setOnline] = useState(() => isBrowserOnline())
  const [commitKey, setCommitKey] = useState(() => newIdempotencyKey())
  const [authLink] = useState(() => authDeepLink())

  useEffect(() => {
    void getSession()
      .then((session) => setSessionEmail(session?.email ?? null))
      .finally(() => setSessionReady(true))
  }, [])

  useEffect(() => {
    if (!sessionReady || !authRequired) return
    if (sessionEmail) return
    clearLocalRun()
    setRun(null)
    setRunMode('local')
    setThreads([])
    setProposal(null)
    setDebrief(null)
    setDecisionPhase('room')
    setView('raum')
    setRoomInfoOpen(false)
    navigate('/login', { replace: true })
  }, [sessionReady, authRequired, sessionEmail, navigate])

  useEffect(() => {
    if (run && runMode === 'local') saveLocalRun(run)
  }, [run, runMode])

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  useEffect(() => {
    if (!run || runMode !== 'cloud') return
    saveCloudDraft({
      runId: run.runId,
      decisionText,
      rationale,
      proposal,
      updatedAt: new Date().toISOString(),
    })
  }, [run, runMode, decisionText, rationale, proposal])

  useEffect(() => {
    if (!run || runMode !== 'cloud') return
    const draft = loadCloudDraft(run.runId)
    if (!draft) return
    setDecisionText(draft.decisionText)
    setRationale(draft.rationale)
    setProposal(draft.proposal)
  }, [run?.runId, runMode])

  /** Playwright-only: force cloud UI semantics (offline commit gate) without a live API. */
  useEffect(() => {
    if (!run) return
    if (localStorage.getItem('bt.e2e.force-cloud-ui') !== '1') return
    setRunMode('cloud')
  }, [run?.runId])

  /** Opening brief in chat + delayed Quest reveal. */
  useEffect(() => {
    if (!run) {
      setQuestsRevealed(true)
      return
    }
    setThreads((current) => ensureOpeningBriefThread(current, run))
    const revealAt = readQuestRevealAt(run.runId)
    if (revealAt === null) {
      setQuestsRevealed(true)
      return
    }
    const revealed = Date.now() >= revealAt
    setQuestsRevealed(revealed)
    if (revealed) return
    const timer = window.setTimeout(() => setQuestsRevealed(true), Math.max(0, revealAt - Date.now()))
    return () => window.clearTimeout(timer)
  }, [run?.runId])

  const scenario = run ? getPlayerScenario(run.scenarioId, run.scenarioVersion) : null
  const latestDecision = run?.decisions.at(-1) ?? null
  const commitBlockedReason =
    runMode === 'cloud' && !online
      ? 'Offline: Entwurf ist gespeichert. Commit erst möglich, wenn die Verbindung wieder online ist.'
      : null

  async function startScenario(scenarioId: ScenarioId, mode: RunMode) {
    setBusy(true)
    setNotice(null)
    setProposal(null)
    setDecisionText('')
    setRationale('')
    setDebrief(null)
    setDecisionPhase('room')
    setCommitKey(newIdempotencyKey())
    try {
      const seed = randomSeed()
      const next = mode === 'cloud' ? await createCloudRun(scenarioId, seed) : createRun(scenarioId, seed)
      scheduleQuestReveal(next.runId)
      setThreads(ensureOpeningBriefThread([], next))
      setQuestsRevealed(areQuestsRevealed(next.runId))
      setRunMode(mode)
      setRun(next)
      setView('raum')
      if (mode === 'local') saveLocalRun(next)
      navigate(`/szenario/${scenarioSlug(scenarioId)}`, { replace: true })
    } catch (error) {
      setNotice(humanNotice(error instanceof Error ? error.message : 'Run konnte nicht gestartet werden.'))
    } finally {
      setBusy(false)
    }
  }

  function resetRun() {
    if (run && runMode === 'cloud') clearCloudDraft(run.runId)
    clearLocalRun()
    setRun(null)
    setProposal(null)
    setDebrief(null)
    setDecisionPhase('room')
    setView('raum')
    navigate('/szenariomenu', { replace: true })
  }

  async function handleResetAllScenarios() {
    setBusy(true)
    setNotice(null)
    try {
      await resetAllScenarioProgress({
        cloudConfigured,
        signedIn: Boolean(sessionEmail),
      })
      setRun(null)
      setThreads([])
      setProposal(null)
      setDecisionText('')
      setRationale('')
      setDebrief(null)
      setDecisionPhase('room')
      setQuestsRevealed(true)
      setView('raum')
      navigate('/szenariomenu', { replace: true })
    } finally {
      setBusy(false)
    }
  }

  function goBack() {
    if (view === 'raum' && decisionPhase !== 'room') {
      setDecisionPhase('room')
      return
    }
    resetRun()
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
      setNotice(
        next.pendingAnalyses.some((item) => item.analysisId === analysisId)
          ? 'Analyse gestartet — Ergebnis erscheint nach Fortschreiben der Zeit.'
          : null,
      )
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
    if (runMode === 'cloud' && !isBrowserOnline()) {
      setNotice('Offline: Commit ist erst wieder online möglich. Dein Entwurf bleibt gespeichert.')
      setDecisionPhase('review')
      return
    }
    setBusy(true)
    setNotice(null)
    const key = commitKey
    try {
      const next = runMode === 'cloud'
        ? await commitCloudDecision(run.runId, run.revision, decisionText.trim(), rationale.trim(), proposal, key)
        : commitDecision(run, decisionText.trim(), rationale.trim(), proposal, key)
      setRun(next)
      setProposal(null)
      setDecisionText('')
      setRationale('')
      setCommitKey(newIdempotencyKey())
      if (runMode === 'cloud') clearCloudDraft(run.runId)
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
      setNotice('Aktuell ist kein verzögertes Ereignis oder keine pending Analyse geplant.')
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
    setThreads((current) =>
      upsertThread(current, advisorId, { role: 'user', text, at: messageClock() }),
    )
    try {
      const answer = await askAdvisor(run, advisorId, text, runMode === 'cloud')
      setThreads((current) =>
        upsertThread(current, advisorId, {
          role: 'advisor',
          text: answer,
          at: messageClock(),
          animate: !e2eSkipOpeningDelay(),
        }),
      )
    } catch (error) {
      setThreads((current) =>
        upsertThread(current, advisorId, {
          role: 'advisor',
          text: error instanceof Error ? error.message : 'Antwort nicht verfügbar.',
          at: messageClock(),
        }),
      )
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

  if (!sessionReady && cloudConfigured) {
    return (
      <div className="scenario-screen" data-testid="session-loading">
        <header className="scenario-heading">
          <BrandMark size={36} />
          <span className="eyebrow">Business Type</span>
          <h1>Sitzung wird geprüft…</h1>
        </header>
      </div>
    )
  }

  const signedIn = Boolean(sessionEmail) || !authRequired
  const defaultAfterAuth = run && scenario
    ? `/szenario/${scenarioSlug(scenario.id)}`
    : '/szenariomenu'

  function renderLogin() {
    if (signedIn) return <Navigate to={defaultAfterAuth} replace />
    return (
      <div className="scenario-screen scenario-screen--auth" data-testid="auth-gate">
        <header className="scenario-heading scenario-heading--brand">
          <BrandMark size={36} />
          <span className="eyebrow">Business Type Sim</span>
        </header>
        <AuthPanel
          sessionEmail={null}
          cloudConfigured={cloudConfigured}
          initialScreen={authLink.screen}
          initialToken={authLink.token}
          onAuthChange={(email) => {
            setSessionEmail(email)
            if (email) navigate('/szenariomenu', { replace: true })
          }}
          onLogout={signOut}
          localDemoHint={false}
        />
      </div>
    )
  }

  function requireAccess(node: ReactNode) {
    if (!signedIn) return <Navigate to="/login" replace />
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
    return node
  }

  function renderScenarioMenu(selectedId: ScenarioId | null) {
    return requireAccess(
      <ScenarioPicker
        busy={busy}
        sessionEmail={sessionEmail}
        cloudConfigured={cloudConfigured}
        authRequired={authRequired}
        initialSelected={selectedId}
        notice={notice}
        onDismissNotice={() => setNotice(null)}
        onStart={startScenario}
        onAuthChange={setSessionEmail}
        onLogout={signOut}
        onResetAllScenarios={handleResetAllScenarios}
        authScreen={authLink.screen}
        authToken={authLink.token}
      />,
    )
  }

  function renderRunShell() {
    if (!run || !scenario) return <Navigate to="/szenariomenu" replace />

    const roomLayout = view === 'raum' && decisionPhase === 'room'
    const runCoverStyle = {
      ['--run-cover' as string]: `url(${companyCoverSrc(scenario.id)})`,
    } as CSSProperties

    return (
      <div
        className={`app-shell app-shell--run${roomLayout ? ' app-shell--room' : ''}`}
        style={runCoverStyle}
        data-scenario={scenario.id}
      >
        <header className="topbar topbar--room">
          <div className="topbar__room-brand">
            <button
              type="button"
              className="icon-button icon-button--back"
              aria-label={view === 'raum' && decisionPhase !== 'room' ? 'Zurück zum Cockpit' : 'Zurück zur Szenarioauswahl'}
              data-testid="room-topbar-back"
              onClick={goBack}
            >
              <IconBack />
            </button>
            <CompanyMark id={scenario.id} size={22} className="topbar__room-mark" />
            <strong className="topbar__room-title">{companyShortLabel(scenario.id)}</strong>
          </div>
          <div className="topbar__actions">
            <span className="topbar__day">Tag {run.day}</span>
            <button
              type="button"
              className="icon-button icon-button--info"
              aria-label="Info"
              data-testid="room-topbar-info"
              onClick={() => setRoomInfoOpen(true)}
            >
              i
            </button>
          </div>
        </header>

        <main className={`app-content${roomLayout ? ' app-content--room' : ''}`}>
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

          {view === 'raum' && decisionPhase === 'room' ? (
            <DecisionRoomView
              run={run}
              threads={threads}
              decisionText={decisionText}
              busy={busy}
              online={online}
              questsRevealed={questsRevealed}
              onAsk={submitAdvisorQuestion}
              onDecisionText={(value) => {
                setDecisionText(value)
                setProposal(null)
              }}
              onOpenDecide={() => setDecisionPhase('compose')}
              onMessageAnimated={(advisorId, messageIndex) => {
                if (advisorId === HOUSE_ASSISTANT_ID) markOpeningStreamDone(run.runId)
                setThreads((current) =>
                  current.map((thread) => {
                    if (thread.advisorId !== advisorId) return thread
                    return {
                      ...thread,
                      messages: thread.messages.map((message, index) =>
                        index === messageIndex ? { ...message, animate: false } : message,
                      ),
                    }
                  }),
                )
              }}
            />
          ) : null}
          {view === 'raum' && decisionPhase !== 'room' ? (
            <DecisionView
              run={run}
              decisionText={decisionText}
              rationale={rationale}
              proposal={proposal}
              busy={busy}
              phase={decisionPhase}
              online={online}
              interpretError={decisionPhase === 'review' && !proposal && notice ? notice : null}
              commitBlockedReason={commitBlockedReason}
              onPhase={setDecisionPhase}
              onDecisionText={setDecisionText}
              onRationale={setRationale}
              onAnalysis={performAnalysis}
              onPrepare={prepareDecision}
              onConfirm={confirmDecision}
              onResetProposal={() => setProposal(null)}
              onProposalChange={setProposal}
              onOpenTeam={() => setDecisionPhase('room')}
            />
          ) : null}
          {view === 'company' ? <CompanyView run={run} /> : null}
          {view === 'ledger' ? (
            <LedgerView
              run={run}
              latestDecision={latestDecision}
              debrief={debrief}
              busy={busy}
              online={online}
              onAdvance={advanceToNextEvent}
              onDebrief={loadDebrief}
            />
          ) : null}
        </main>

        <nav className="bottom-nav" aria-label="Hauptnavigation">
          <NavButton
            active={view === 'raum'}
            label="Cockpit"
            icon={<IconCockpit active={view === 'raum'} />}
            onClick={() => {
              setDecisionPhase('room')
              setView('raum')
            }}
          />
          <NavButton
            active={view === 'company'}
            label="Firma"
            icon={<IconCompany active={view === 'company'} />}
            onClick={() => setView('company')}
          />
          <NavButton
            active={view === 'ledger'}
            label="Verlauf"
            icon={<IconLedger active={view === 'ledger'} />}
            onClick={() => setView('ledger')}
          />
        </nav>

        {roomInfoOpen ? (
          <RoomInfoSheet
            companyName={scenario.companyName}
            headline={scenario.headline}
            decisionContext={scenario.decisionContext}
            onClose={() => setRoomInfoOpen(false)}
            onOpenAnalyses={() => {
              setView('raum')
              setDecisionPhase('analyses')
            }}
            onOpenDecide={() => {
              setView('raum')
              setDecisionPhase('compose')
            }}
            onEndRun={resetRun}
          />
        ) : null}
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={renderLogin()} />
      <Route path="/szenariomenu" element={renderScenarioMenu(null)} />
      <Route
        path="/szenario/:slug"
        element={
          <ScenarioRoute
            run={run}
            renderMenu={renderScenarioMenu}
            renderRun={renderRunShell}
            requireAccess={requireAccess}
          />
        }
      />
      <Route
        path="/"
        element={<Navigate to={signedIn ? defaultAfterAuth : '/login'} replace />}
      />
      <Route
        path="*"
        element={<Navigate to={signedIn ? defaultAfterAuth : '/login'} replace />}
      />
    </Routes>
  )
}

function ScenarioRoute({
  run,
  renderMenu,
  renderRun,
  requireAccess,
}: {
  run: RunState | null
  renderMenu: (selectedId: ScenarioId | null) => ReactNode
  renderRun: () => ReactNode
  requireAccess: (node: ReactNode) => ReactNode
}) {
  const { slug } = useParams<{ slug: string }>()
  const scenarioId = scenarioIdFromSlug(slug)
  if (!scenarioId) {
    return requireAccess(<Navigate to="/szenariomenu" replace />)
  }
  if (run && run.scenarioId === scenarioId) {
    return requireAccess(renderRun())
  }
  return renderMenu(scenarioId)
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
