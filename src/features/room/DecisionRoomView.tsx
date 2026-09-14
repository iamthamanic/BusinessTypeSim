/**
 * Decision Room — hub modes + War Room spine matching chat-spine mockups.
 * Location: src/features/room/DecisionRoomView.tsx
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import {
  daysUntilDeadline,
  getPlayerCampaignView,
  getPlayerScenario,
  getPublishedCampaignForScenario,
  type RunState,
} from '../../domain'
import { advisorPersona, resolveAdvisorMention } from '../../shared/advisorPersona'
import { formatMoney, formatPercent } from '../../shared/format'
import { metricHelp } from '../../shared/metricHelp'
import { InfoTip, Tag } from '../../shared/ui'
import type { AdvisorThread } from '../team/TeamView'
import { QuestCountdown } from './QuestCountdown'
import { StreamingAdvisorText } from './StreamingAdvisorText'
import { useRoomVoice } from './useRoomVoice'

type HubMode = 'data' | 'quest' | 'people'

const HUB_SHARE_MIN = 0.18
const HUB_SHARE_MAX = 0.58
const HUB_SHARE_DEFAULT = 0.38
const HUB_SHARE_STORAGE_KEY = 'bt.room.hubShare'

function clampHubShare(value: number): number {
  return Math.min(HUB_SHARE_MAX, Math.max(HUB_SHARE_MIN, value))
}

function readStoredHubShare(): number {
  try {
    const raw = sessionStorage.getItem(HUB_SHARE_STORAGE_KEY)
    if (!raw) return HUB_SHARE_DEFAULT
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? clampHubShare(parsed) : HUB_SHARE_DEFAULT
  } catch {
    return HUB_SHARE_DEFAULT
  }
}

function formatClock(at?: string): string {
  if (!at) return ''
  const date = new Date(at)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function activeMentionQuery(value: string): string | null {
  const match = value.match(/(^|[\s])@([\p{L}\p{N}_. -]*)$/u)
  if (!match) return null
  return match[2] ?? ''
}

export function DecisionRoomView({
  run,
  threads,
  decisionText,
  busy,
  online,
  questsRevealed = true,
  onAsk,
  onDecisionText,
  onOpenDecide,
  onMessageAnimated,
}: {
  run: RunState
  threads: AdvisorThread[]
  decisionText: string
  busy: boolean
  online: boolean
  /** When false, Quest tab stays empty until opening brief delay elapses. */
  questsRevealed?: boolean
  onAsk: (advisorId: string, question: string) => Promise<void>
  onDecisionText: (value: string) => void
  onOpenDecide: () => void
  /** Clear animate flag after typewriter finishes (opening brief, replies). */
  onMessageAnimated?: (advisorId: string, messageIndex: number) => void
}) {
  const scenario = getPlayerScenario(run.scenarioId, run.scenarioVersion)
  const campaign = getPublishedCampaignForScenario(run.scenarioId)
  const campaignView = getPlayerCampaignView(run, campaign)
  const daysLeft = daysUntilDeadline(run)
  const deadlineMissed = run.ledger.some((event) => event.id === 'deadline_missed')
  const [hubMode, setHubMode] = useState<HubMode | null>('quest')
  const [hubShare, setHubShare] = useState(readStoredHubShare)
  const [activeId, setActiveId] = useState(
    scenario.advisors.find((item) => item.id === 'adalbert')?.id ?? scenario.advisors[0]?.id ?? '',
  )
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const roomRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{ startY: number; startShare: number } | null>(null)
  const advisor = scenario.advisors.find((item) => item.id === activeId) ?? scenario.advisors[0]
  const thread = threads.find((candidate) => candidate.advisorId === activeId)
  const latestAnalysis = run.completedAnalyses.at(-1)
  const pendingAnalyses = run.pendingAnalyses
  const voice = useRoomVoice((text) => setDraft(text))
  const mentionQuery = activeMentionQuery(draft)
  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) return []
    const q = mentionQuery.toLowerCase()
    return scenario.advisors
      .map((person) => ({ person, persona: advisorPersona(person.role) }))
      .filter(({ persona }) => !q || persona.name.toLowerCase().includes(q))
  }, [mentionQuery, scenario.advisors])
  const hasThread = Boolean(thread?.messages.length)
  const hasExtras = Boolean(latestAnalysis || decisionText.trim())
  const [questEnter, setQuestEnter] = useState(false)
  const questsWereRevealed = useRef(questsRevealed)

  useEffect(() => {
    try {
      sessionStorage.setItem(HUB_SHARE_STORAGE_KEY, String(hubShare))
    } catch {
      /* ignore quota / private mode */
    }
  }, [hubShare])

  useEffect(() => {
    questsWereRevealed.current = false
  }, [run.runId])

  useEffect(() => {
    if (!questsRevealed) {
      questsWereRevealed.current = false
      setQuestEnter(false)
      return
    }
    if (questsWereRevealed.current) return
    questsWereRevealed.current = true
    setQuestEnter(true)
    const timer = window.setTimeout(() => setQuestEnter(false), 900)
    return () => window.clearTimeout(timer)
  }, [questsRevealed])

  if (!advisor) return null

  const situationDaysLeft =
    campaignView.active?.deadlineDay !== undefined
      ? campaignView.active.deadlineDay - run.day
      : daysLeft
  const decisionDaysLeft = Math.min(daysLeft, situationDaysLeft)
  const questEnterClass = questEnter ? ' is-enter' : ''

  function selectHub(mode: HubMode) {
    setHubMode((current) => (current === mode ? null : mode))
  }

  function onSplitPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { startY: event.clientY, startShare: hubShare }
  }

  function onSplitPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    const room = roomRef.current
    if (!drag || !room) return
    const height = room.getBoundingClientRect().height
    if (height <= 0) return
    const deltaShare = (event.clientY - drag.startY) / height
    setHubShare(clampHubShare(drag.startShare + deltaShare))
  }

  function onSplitPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    if (dragRef.current) dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function onSplitKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHubShare((current) => clampHubShare(current - 0.04))
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHubShare((current) => clampHubShare(current + 0.04))
    } else if (event.key === 'Home') {
      event.preventDefault()
      setHubShare(HUB_SHARE_MIN)
    } else if (event.key === 'End') {
      event.preventDefault()
      setHubShare(HUB_SHARE_MAX)
    }
  }

  function selectPerson(personId: string) {
    setActiveId(personId)
    setHubMode('people')
    inputRef.current?.focus()
  }

  function insertMention(personId: string) {
    const person = scenario.advisors.find((item) => item.id === personId)
    if (!person) return
    const persona = advisorPersona(person.role)
    const next = draft.replace(/(^|[\s])@([\p{L}\p{N}_. -]*)$/u, `$1@${persona.name} `)
    setDraft(next)
    setActiveId(personId)
    inputRef.current?.focus()
  }

  async function send() {
    const text = draft.trim()
    if (!text || !advisor) return
    const mentionedId = resolveAdvisorMention(text, scenario.advisors)
    const targetId = mentionedId ?? advisor.id
    setDraft('')
    setActiveId(targetId)
    if (!decisionText.trim()) onDecisionText(text)
    await onAsk(targetId, text)
  }

  function toggleVoice() {
    if (voice.recording) voice.stop()
    else void voice.start(draft)
  }

  return (
    <div
      ref={roomRef}
      className="decision-room decision-room--war"
      data-testid="decision-room"
      style={{
        gridTemplateRows: `minmax(0, ${hubShare}fr) auto minmax(0, ${1 - hubShare}fr)`,
      }}
    >
      <section
        className="room-hub"
        aria-label="Lage-Hub"
        data-testid="room-hub"
        data-hub-mode={hubMode ?? 'logo'}
      >
        <div className="room-hub__modes" role="tablist" aria-label="Hub-Modi">
          {(
            [
              { id: 'data', label: 'Data' },
              { id: 'quest', label: 'Quest' },
              { id: 'people', label: 'People' },
            ] as const
          ).map((mode) => {
            const selected = hubMode === mode.id
            return (
              <button
                type="button"
                role="tab"
                key={mode.id}
                id={`room-hub-tab-${mode.id}`}
                className={`room-hub__mode${selected ? ' is-active' : ''}`}
                aria-selected={selected}
                data-testid={`room-hub-mode-${mode.id}`}
                onClick={() => selectHub(mode.id)}
              >
                {mode.label}
              </button>
            )
          })}
        </div>

        <div
          className="room-hub__panel"
          role="tabpanel"
          aria-labelledby={hubMode ? `room-hub-tab-${hubMode}` : undefined}
          data-testid="room-hub-panel"
        >
          {hubMode === null ? (
            <div className="room-hub__logo" data-testid="room-hub-logo">
              <span className="room-hub__company">{scenario.companyName}</span>
            </div>
          ) : null}

          {hubMode === 'data' ? (
            <div className="room-hub__data" data-testid="room-hub-data">
              <div className="room-briefing__metrics" aria-label="Kernkennzahlen">
                <div className="room-metric">
                  <span className="metric-label-row">
                    Cash
                    <InfoTip text={metricHelp('cash')} label="Cash erklären" />
                  </span>
                  <strong>{formatMoney(run.metrics.cashCents)}</strong>
                </div>
                <div className="room-metric">
                  <span className="metric-label-row">
                    EBITDA
                    <InfoTip text={metricHelp('ebitda')} label="EBITDA erklären" />
                  </span>
                  <strong>{formatMoney(run.metrics.ebitdaAnnualCents)}</strong>
                </div>
                <div className="room-metric">
                  <span className="metric-label-row">
                    Headcount
                    <InfoTip text={metricHelp('headcount')} label="Headcount erklären" />
                  </span>
                  <strong>{run.metrics.headcount}</strong>
                </div>
                <div className="room-metric">
                  <span className="metric-label-row">
                    Resilienz
                    <InfoTip text={metricHelp('resilience')} label="Resilienz erklären" />
                  </span>
                  <strong>{formatPercent(run.metrics.resilienceBps)}</strong>
                </div>
              </div>
            </div>
          ) : null}

          {hubMode === 'quest' ? (
            <div className="room-hub__quests" data-testid="room-hub-quests" aria-label="Aufgaben">
              {!questsRevealed ? (
                <p className="room-hub__empty" data-testid="room-hub-quests-pending">
                  Noch keine Aufgaben — Adalbert brief dich gerade im Chat.
                </p>
              ) : (
                <ul className="room-quest-list">
                  <li
                    className={`room-quest${questEnterClass}`}
                    style={questEnter ? { animationDelay: '0ms' } : undefined}
                    data-testid="campaign-active-situation"
                  >
                    <span data-testid="home-deadline-banner">
                      <span data-testid="deadline-banner">
                        <Tag tone={deadlineMissed || decisionDaysLeft <= 0 ? 'negative' : 'accent'}>
                          Quest
                        </Tag>
                      </span>
                    </span>
                    <div>
                      <strong>
                        {campaignView.active?.title
                          ?? (deadlineMissed
                            ? 'Soft Deadline verpasst'
                            : decisionDaysLeft <= 0
                              ? 'Entscheidung fällig'
                              : scenario.decisionTitle)}
                      </strong>
                      <p>
                        {campaignView.active?.context
                          ?? 'Soft Deadline steuert Folgen — kein künstliches Game Over.'}
                      </p>
                      <QuestCountdown
                        gameDaysLeft={decisionDaysLeft}
                        missed={deadlineMissed}
                      />
                    </div>
                    <button type="button" className="room-quest__action" onClick={onOpenDecide}>
                      Entscheiden
                    </button>
                  </li>
                  {pendingAnalyses.map((item, index) => {
                    const catalog = scenario.analyses.find((entry) => entry.id === item.analysisId)
                    return (
                      <li
                        className={`room-quest${questEnterClass}`}
                        style={questEnter ? { animationDelay: `${(index + 1) * 70}ms` } : undefined}
                        key={`${item.analysisId}-${item.requestedAtDay}`}
                      >
                        <Tag tone="accent">Quest</Tag>
                        <div>
                          <strong>{catalog?.title ?? 'Analyse läuft'}</strong>
                          <p>Verfügbar ab Tag {item.availableAtDay}</p>
                        </div>
                      </li>
                    )
                  })}
                  {decisionText.trim() ? (
                    <li
                      className={`room-quest${questEnterClass}`}
                      style={
                        questEnter
                          ? { animationDelay: `${(pendingAnalyses.length + 1) * 70}ms` }
                          : undefined
                      }
                    >
                      <Tag tone="accent">Quest</Tag>
                      <div>
                        <strong>Offener Entscheidungsentwurf</strong>
                        <p>{decisionText.trim()}</p>
                      </div>
                      <button type="button" className="room-quest__action" onClick={onOpenDecide}>
                        Fortsetzen
                      </button>
                    </li>
                  ) : null}
                </ul>
              )}
            </div>
          ) : null}

          {hubMode === 'people' ? (
            <div className="room-hub__people" data-testid="room-hub-people" aria-label="Management">
              <ul className="room-people-list">
                {scenario.advisors.map((person) => {
                  const selected = person.id === advisor.id
                  const persona = advisorPersona(person.role)
                  return (
                    <li key={person.id}>
                      <button
                        type="button"
                        className={`room-person${selected ? ' is-active' : ''}`}
                        data-testid={`room-person-${person.id}`}
                        onClick={() => selectPerson(person.id)}
                      >
                        <img
                          className="room-person__avatar"
                          src={persona.portraitSrc}
                          alt=""
                          width={40}
                          height={40}
                          aria-hidden="true"
                        />
                        <span className="room-person__meta">
                          <strong>
                            {person.role} · {persona.name}
                          </strong>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      <button
        type="button"
        className="room-split"
        data-testid="room-split"
        aria-label="War Room-Höhe anpassen"
        title="Ziehen, um den War Room zu vergrößern oder zu verkleinern"
        onPointerDown={onSplitPointerDown}
        onPointerMove={onSplitPointerMove}
        onPointerUp={onSplitPointerUp}
        onPointerCancel={onSplitPointerUp}
        onKeyDown={onSplitKeyDown}
        onDoubleClick={() => setHubShare(HUB_SHARE_DEFAULT)}
      >
        <span className="room-split__grip" aria-hidden="true" />
      </button>

      <section className="room-war" aria-label="War Room">
        <div className="room-war__log room-war__log--spine" data-testid="room-war-log">
          {!hasThread && !hasExtras ? (
            <div className="room-war__empty" data-testid="room-war-empty">
              <p>
                Frage nach Informationen mit <kbd>@</kbd> — erwähne Mitarbeiter, um Anfragen direkt an die
                entsprechende Abteilung zu stellen.
              </p>
            </div>
          ) : null}

          {thread?.messages.map((message, index) => {
            const persona = advisorPersona(advisor.role)
            const who =
              message.role === 'advisor' ? `${persona.name} · ${advisor.role}` : 'Sie · CEO'
            return (
              <div className={`room-msg room-msg--spine room-msg--${message.role}`} key={`${message.role}-${index}`}>
                {message.role === 'advisor' ? (
                  <img
                    className="room-msg__avatar"
                    src={persona.portraitSrc}
                    alt=""
                    width={34}
                    height={34}
                    aria-hidden="true"
                  />
                ) : (
                  <span className="room-msg__avatar" aria-hidden="true">
                    S
                  </span>
                )}
                <div className="room-msg__body">
                  <div className="room-msg__meta">
                    <span className="room-msg__who">{who}</span>
                    {message.at ? <time className="room-msg__time">{formatClock(message.at)}</time> : null}
                  </div>
                  {message.role === 'advisor' ? (
                    <StreamingAdvisorText
                      text={message.text}
                      animate={Boolean(message.animate)}
                      onComplete={() => onMessageAnimated?.(advisor.id, index)}
                    />
                  ) : (
                    <p>{message.text}</p>
                  )}
                </div>
              </div>
            )
          })}

          {latestAnalysis ? (
            <div className="room-msg room-msg--spine room-msg--evidence" data-testid="room-evidence-chip">
              <span className="room-msg__avatar" aria-hidden="true">
                Ev
              </span>
              <div className="room-msg__body">
                <div className="room-msg__meta">
                  <span className="room-msg__who">Evidence</span>
                </div>
                <strong>{latestAnalysis.resultTitle}</strong>
                <p>{latestAnalysis.resultBody}</p>
              </div>
            </div>
          ) : null}

          {decisionText.trim() ? (
            <div className="room-msg room-msg--spine room-msg--user room-msg--draft">
              <span className="room-msg__avatar" aria-hidden="true">
                S
              </span>
              <div className="room-msg__body">
                <div className="room-msg__meta">
                  <span className="room-msg__who">Entwurf</span>
                </div>
                <p>{decisionText.trim()}</p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="room-war__composer">
          {voice.error ? (
            <p className="room-war__voice-error" role="alert">
              {voice.error}
              <button type="button" onClick={voice.clearError}>
                OK
              </button>
            </p>
          ) : null}
          {mentionSuggestions.length > 0 ? (
            <ul className="room-mention-list" role="listbox" aria-label="Mitarbeiter erwähnen">
              {mentionSuggestions.map(({ person, persona }) => (
                <li key={person.id}>
                  <button
                    type="button"
                    role="option"
                    className="room-mention"
                    onMouseDown={(event) => {
                      event.preventDefault()
                      insertMention(person.id)
                    }}
                  >
                    <img src={persona.portraitSrc} alt="" width={28} height={28} />
                    <span>
                      <strong>{persona.name}</strong>
                      <small>{person.role}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="room-war__input">
            <input
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="@Mitarbeiter erwähnen oder Anweisung schreiben…"
              disabled={busy || !online || voice.recording}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && draft.trim()) void send()
              }}
            />
            <button
              type="button"
              className="room-war__clip"
              aria-label="Anhang (demnächst)"
              disabled
              title="Anhänge folgen später"
            >
              <ClipIcon />
            </button>
            <button
              type="button"
              className={`room-war__mic${voice.recording ? ' is-recording' : ''}`}
              aria-label={voice.recording ? 'Aufnahme stoppen' : 'Audio aufnehmen'}
              aria-pressed={voice.recording}
              disabled={busy || !online}
              data-testid="room-voice-mic"
              onClick={toggleVoice}
            >
              <MicIcon />
            </button>
            <button
              type="button"
              className="room-war__send"
              disabled={busy || !online || !draft.trim() || voice.recording}
              onClick={() => void send()}
              aria-label="Senden"
            >
              <SendIcon />
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

function ClipIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 12.5V8a5 5 0 0 0-10 0v9a3 3 0 0 0 6 0V9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m4 12 16-7-6 16-2.5-6.5L4 12Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
}
