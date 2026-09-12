import { useMemo, useState } from 'react'
import { Button, Card, ProgressBar, SectionTitle, Tag } from '../shared/ui'

const scenarios = [
  { id: 'nexora', company: 'Nexora', industry: 'SaaS', stage: 'Scale-up', title: 'Großkunde oder Plattform?', brief: 'Ein wichtiger Kunde fordert eine Sonderlösung, während der Markt eine gemeinsame Produktplattform erwartet.' },
  { id: 'nordkern', company: 'Nordkern Foods', industry: 'Produktion', stage: 'Mittelstand', title: 'Wachstum ohne operative Überlastung', brief: 'Hohe Auslastung trifft auf schwächere Profitabilität und mehrere strategische Investitionsoptionen.' },
  { id: 'klarwerk', company: 'Klarwerk', industry: 'Professional Services', stage: 'Small Business', title: 'Vom Gründerteam zur Organisation', brief: 'Das Unternehmen wächst schneller als seine Führungsstruktur und muss Prioritäten bei Team und Kunden setzen.' },
] as const

type Scenario = (typeof scenarios)[number]

interface LedgerItem {
  day: number
  title: string
  body: string
  score: number
}

export function App() {
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [decision, setDecision] = useState('')
  const [rationale, setRationale] = useState('')
  const [day, setDay] = useState(1)
  const [ledger, setLedger] = useState<LedgerItem[]>([])

  const quality = useMemo(() => {
    const text = `${decision} ${rationale}`.toLowerCase()
    const signals = ['risiko', 'alternative', 'daten', 'kunde', 'team', 'umsetzung', 'ziel', 'zeit']
    return Math.min(96, 42 + signals.filter((signal) => text.includes(signal)).length * 6 + Math.min(12, rationale.trim().split(/\s+/).filter(Boolean).length / 4))
  }, [decision, rationale])

  if (!scenario) {
    return (
      <main className="scenario-screen">
        <div className="scenario-hero">
          <div className="brand-mark">BT</div>
          <span className="eyebrow">Business Type</span>
          <h1>Entscheiden wie ein CEO.</h1>
          <p>Unterschiedliche Unternehmen, unvollständige Informationen und echte Trade-offs. Gute Entscheidungen werden getrennt von glücklichen Outcomes betrachtet.</p>
        </div>
        <div className="scenario-grid">
          {scenarios.map((item) => (
            <Card key={item.id} className="scenario-card">
              <div className="scenario-card__top"><span>{item.industry}</span><Tag>{item.stage}</Tag></div>
              <h2>{item.company}</h2>
              <h3>{item.title}</h3>
              <p>{item.brief}</p>
              <div className="scenario-card__actions"><Button onClick={() => setScenario(item)}>Szenario starten</Button></div>
            </Card>
          ))}
        </div>
      </main>
    )
  }

  function commitDecision() {
    if (!decision.trim()) return
    const score = Math.round(quality)
    setLedger((current) => [{ day, title: decision.trim(), body: rationale.trim() || 'Keine zusätzliche Begründung angegeben.', score }, ...current])
    setDay((current) => current + 14)
    setDecision('')
    setRationale('')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div><span className="eyebrow">{scenario.industry} · Tag {day}</span><strong>{scenario.company}</strong></div>
        <button className="icon-button" onClick={() => setScenario(null)} aria-label="Szenario schließen">×</button>
      </header>
      <main className="app-content">
        <div className="screen-stack">
          <section className="home-hero">
            <span className="eyebrow">Aktive Situation</span>
            <h1>{scenario.title}</h1>
            <p>{scenario.brief}</p>
          </section>

          <Card className="composer-card">
            <SectionTitle title="Deine Entscheidung" meta="Freitext" />
            <label><span>Was soll das Unternehmen tun?</span><textarea value={decision} onChange={(event) => setDecision(event.target.value)} placeholder="Beschreibe deine Entscheidung…" /></label>
            <label><span>Warum?</span><textarea value={rationale} onChange={(event) => setRationale(event.target.value)} placeholder="Ziele, Daten, Risiken, Alternativen und Umsetzung…" /></label>
            <div className="quality-grid">
              <div><div><span>Decision Quality Preview</span><strong>{Math.round(quality)}</strong></div><ProgressBar value={quality} /></div>
            </div>
            <div className="button-row"><Button disabled={!decision.trim()} onClick={commitDecision}>Entscheidung festlegen</Button></div>
          </Card>

          <Card>
            <SectionTitle title="Decision Ledger" meta={`${ledger.length} Entscheidungen`} />
            {ledger.length === 0 ? <p>Noch keine Entscheidung committed.</p> : (
              <div className="ledger">
                {ledger.map((item, index) => (
                  <div className="ledger-item ledger-item--positive" key={`${item.day}-${index}`}>
                    <span className="ledger-dot" />
                    <div><small>Tag {item.day} · Quality {item.score}</small><strong>{item.title}</strong><p>{item.body}</p></div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  )
}
