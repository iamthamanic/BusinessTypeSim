/** Scenario selection — mockup screen 2: filters + company cards with brand icons. */
import { useMemo, useState } from 'react'
import { scenarios, type ScenarioId } from '../../domain'
import { login, register } from '../../infrastructure/cloud'
import { BrandMark } from '../../shared/BrandMark'
import { CompanyMark, companyCoverSrc } from '../../shared/CompanyMark'
import { Button, Tag } from '../../shared/ui'

type RunMode = 'local' | 'cloud'
type Filter = 'all' | 'saas' | 'production' | 'services' | 'retail' | 'health'

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'Alle' },
  { id: 'saas', label: 'SaaS / Plattform' },
  { id: 'production', label: 'Produktion / Energie' },
  { id: 'services', label: 'Dienstleistung' },
  { id: 'health', label: 'Health' },
  { id: 'retail', label: 'Retail' },
]

function filterFor(scenarioId: ScenarioId): Filter {
  if (scenarioId === 'nexora-saas' || scenarioId === 'marktwerk-marketplace') return 'saas'
  if (scenarioId === 'nordkern-foods' || scenarioId === 'stromfeld-energy') return 'production'
  if (scenarioId === 'heliora-clinic') return 'health'
  if (scenarioId === 'urbanfit-retail') return 'retail'
  return 'services'
}

export function ScenarioPicker({
  busy,
  sessionEmail,
  cloudConfigured,
  onStart,
  onAuthChange,
  onLogout,
}: {
  busy: boolean
  sessionEmail: string | null
  cloudConfigured: boolean
  onStart: (scenarioId: ScenarioId, mode: RunMode) => Promise<void>
  onAuthChange: (email: string | null) => void
  onLogout: () => Promise<void>
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMessage, setAuthMessage] = useState<string | null>(null)
  const [authBusy, setAuthBusy] = useState(false)
  const [selected, setSelected] = useState<ScenarioId | null>(null)

  const visible = useMemo(
    () => scenarios.filter((scenario) => filter === 'all' || filterFor(scenario.id) === filter),
    [filter],
  )

  async function handleAuth(mode: 'login' | 'register') {
    setAuthBusy(true)
    setAuthMessage(null)
    const result = mode === 'login'
      ? await login(email.trim(), password)
      : await register(email.trim(), password)
    setAuthBusy(false)
    if (result.error) {
      setAuthMessage(result.error)
      return
    }
    onAuthChange(email.trim().toLowerCase())
    setAuthMessage(mode === 'login' ? 'Angemeldet.' : 'Konto angelegt und angemeldet.')
  }

  return (
    <div className="scenario-screen">
      <header className="scenario-heading">
        <BrandMark size={36} />
        <span className="eyebrow">Szenario Auswahl</span>
        <h1>Wähle dein Unternehmen</h1>
        <p>Branche, Stage und Kernkomplexität — ohne alle Kennzahlen vorab zu spoilern.</p>
      </header>

      <div className="filter-pills" role="tablist" aria-label="Branche">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={filter === item.id}
            className={filter === item.id ? 'active' : ''}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="scenario-list">
        {visible.map((scenario) => {
          const isSelected = selected === scenario.id
          return (
            <button
              type="button"
              key={scenario.id}
              className={`scenario-pick${isSelected ? ' scenario-pick--selected' : ''}`}
              onClick={() => setSelected(scenario.id)}
            >
              <span
                className="scenario-pick__cover"
                style={{ backgroundImage: `url(${companyCoverSrc(scenario.id)})` }}
                aria-hidden="true"
              />
              <span className="scenario-pick__scrim" aria-hidden="true" />
              <div className="scenario-pick__content">
                <div className="scenario-pick__row">
                  <CompanyMark id={scenario.id} />
                  <div className="scenario-pick__body">
                    <div className="scenario-pick__top">
                      <strong>{scenario.companyName}</strong>
                      <Tag tone="accent">{scenario.stage}</Tag>
                    </div>
                    <span className="scenario-pick__industry">{scenario.industry}</span>
                    <p>{scenario.headline}</p>
                    <small>{scenario.scaleLabel}</small>
                  </div>
                </div>
                {isSelected ? (
                  <div className="scenario-pick__actions" onClick={(event) => event.stopPropagation()}>
                    <Button disabled={busy} onClick={() => void onStart(scenario.id, 'local')}>Demo starten</Button>
                    {sessionEmail ? (
                      <Button variant="secondary" disabled={busy} onClick={() => void onStart(scenario.id, 'cloud')}>
                        Cloud-Run
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </button>
          )
        })}
      </div>

      <section className="auth-card card">
        <div>
          <span className="eyebrow">Cloud optional</span>
          <h2>{sessionEmail ? 'Angemeldet' : 'Runs synchronisieren & AI nutzen'}</h2>
          <p>
            {cloudConfigured
              ? 'Cloud-Runs nutzen deinen Self-Host-API-Stack (Postgres + JWT), autoritative Simulation und Ollama Cloud.'
              : 'Cloud-API ist nicht konfiguriert (VITE_API_URL). Der lokale Demo-Modus bleibt vollständig spielbar.'}
          </p>
        </div>
        {sessionEmail ? (
          <div className="auth-row auth-row--session">
            <strong>{sessionEmail}</strong>
            <Button variant="ghost" onClick={() => { void onLogout().then(() => onAuthChange(null)) }}>Abmelden</Button>
          </div>
        ) : cloudConfigured ? (
          <div className="auth-form">
            <div className="auth-row">
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="E-Mail" aria-label="E-Mail" autoComplete="username" />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                placeholder="Passwort (min. 8)"
                aria-label="Passwort"
                autoComplete="current-password"
              />
            </div>
            <div className="auth-row auth-row--actions">
              <Button disabled={authBusy || !email.trim() || password.length < 8} onClick={() => void handleAuth('login')}>
                Anmelden
              </Button>
              <Button
                variant="secondary"
                disabled={authBusy || !email.trim() || password.length < 8}
                onClick={() => void handleAuth('register')}
              >
                Registrieren
              </Button>
            </div>
          </div>
        ) : null}
        {authMessage ? <small>{authMessage}</small> : null}
      </section>
    </div>
  )
}
