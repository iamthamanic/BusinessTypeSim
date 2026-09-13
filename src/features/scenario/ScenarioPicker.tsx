/** Scenario selection — mockup screen 2: filters + company cards with brand icons. */
import { useMemo, useState } from 'react'
import { listPlayableScenarios, type ScenarioId } from '../../domain'
import { AuthPanel, type AuthScreen } from '../auth/AuthPanel'
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
  authScreen = 'login',
  authToken = null,
}: {
  busy: boolean
  sessionEmail: string | null
  cloudConfigured: boolean
  onStart: (scenarioId: ScenarioId, mode: RunMode) => Promise<void>
  onAuthChange: (email: string | null) => void
  onLogout: () => Promise<void>
  authScreen?: AuthScreen
  authToken?: string | null
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<ScenarioId | null>(null)

  const visible = useMemo(
    () => listPlayableScenarios().filter((scenario) => filter === 'all' || filterFor(scenario.id) === filter),
    [filter],
  )

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
            <article
              key={scenario.id}
              className={`scenario-pick${isSelected ? ' scenario-pick--selected' : ''}`}
            >
              <div
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`Szenario ${scenario.companyName} auswählen`}
                className="scenario-pick__hit"
                onClick={() => setSelected(scenario.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setSelected(scenario.id)
                  }
                }}
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
                </div>
              </div>
              {isSelected ? (
                <div className="scenario-pick__actions">
                  <Button disabled={busy} onClick={() => void onStart(scenario.id, 'local')}>Demo starten</Button>
                  {sessionEmail ? (
                    <Button variant="secondary" disabled={busy} onClick={() => void onStart(scenario.id, 'cloud')}>
                      Cloud-Run
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </article>
          )
        })}
      </div>

      <AuthPanel
        sessionEmail={sessionEmail}
        cloudConfigured={cloudConfigured}
        initialScreen={authScreen}
        initialToken={authToken}
        onAuthChange={onAuthChange}
        onLogout={onLogout}
      />
    </div>
  )
}
