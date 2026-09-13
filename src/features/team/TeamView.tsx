/** Advisors chat — mockup screen 5. */
import { useState } from 'react'
import { getPlayerScenario, type RunState } from '../../domain'
import { Button, Card, Tag } from '../../shared/ui'

export interface AdvisorThread {
  advisorId: string
  messages: Array<{ role: 'user' | 'advisor'; text: string }>
}

export function TeamView({
  run,
  threads,
  onAsk,
}: {
  run: RunState
  threads: AdvisorThread[]
  onAsk: (advisorId: string, question: string) => Promise<void>
}) {
  const scenario = getPlayerScenario(run.scenarioId, run.scenarioVersion)
  const [activeId, setActiveId] = useState(scenario.advisors[0]?.id ?? '')
  const [question, setQuestion] = useState('')
  const active = scenario.advisors.find((advisor) => advisor.id === activeId) ?? scenario.advisors[0]
  const thread = threads.find((candidate) => candidate.advisorId === activeId)
  if (!active) return null
  const advisor = active

  async function send() {
    const text = question
    setQuestion('')
    await onAsk(advisor.id, text)
  }

  const latestAnalysis = run.completedAnalyses.at(-1)

  return (
    <div className="screen-stack">
      <div className="screen-heading">
        <span className="eyebrow">Advisors</span>
        <h1>Dein Team befragen</h1>
        <p>Rollen sehen unterschiedliche Teile der Firma und können andere Ziele verfolgen.</p>
      </div>

      <div className="advisor-tabs">
        {scenario.advisors.map((item) => (
          <button
            type="button"
            className={item.id === advisor.id ? 'active' : ''}
            key={item.id}
            onClick={() => setActiveId(item.id)}
          >
            <strong>{item.role}</strong>
            <span>{item.name}</span>
          </button>
        ))}
      </div>

      <Card className="advisor-card">
        <div className="advisor-header">
          <div className="avatar">{advisor.name.split(' ').map((part) => part[0]).join('')}</div>
          <div>
            <h2>{advisor.name}</h2>
            <p>{advisor.role} · {advisor.stance}</p>
          </div>
        </div>

        <div className="chat-log">
          {thread?.messages.length ? (
            thread.messages.map((message, index) => (
              <div className={`message message--${message.role}`} key={`${message.role}-${index}`}>{message.text}</div>
            ))
          ) : (
            <div className="message message--advisor">
              Welche Annahme in deiner aktuellen Entscheidung soll ich für dich challengen?
            </div>
          )}

          {latestAnalysis ? (
            <div className="chat-insight">
              <Tag tone="accent">Evidence</Tag>
              <strong>{latestAnalysis.resultTitle}</strong>
              <p>{latestAnalysis.resultBody}</p>
              <small>Sicherheit: {latestAnalysis.confidence}</small>
            </div>
          ) : null}
        </div>

        <div className="chat-input">
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={`${advisor.role} fragen …`}
            onKeyDown={(event) => { if (event.key === 'Enter' && question.trim()) void send() }}
          />
          <Button disabled={!question.trim()} onClick={() => void send()} aria-label="Senden">↑</Button>
        </div>
      </Card>
    </div>
  )
}
