/**
 * Scenario selection — full-text search + filter menu (Branche / Firmengröße).
 * Location: src/features/scenario/ScenarioPicker.tsx
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listPlayableScenarios, type ScenarioId } from '../../domain'
import { AuthPanel, type AuthScreen } from '../auth/AuthPanel'
import { BrandMark } from '../../shared/BrandMark'
import { CompanyMark, companyCoverSrc } from '../../shared/CompanyMark'
import { IconLogout, IconSettings } from '../../shared/icons'
import { scenarioSlug } from '../../shared/scenarioRoutes'
import { formatScenarioProgress, progressPercentFromRun } from '../../shared/scenarioProgress'
import { Button, Tag } from '../../shared/ui'
import { listCloudRunProgress } from '../../infrastructure/cloud-game'
import { loadLocalRun } from '../../infrastructure/local-run'

type RunMode = 'local' | 'cloud'
type IndustryFilter = 'all' | 'saas' | 'production' | 'services' | 'retail' | 'health'
type SizeFilter = 'all' | 'Small Business' | 'Growth' | 'Scale-up' | 'Mittelstand'

const INDUSTRY_OPTIONS: Array<{ id: IndustryFilter; label: string }> = [
  { id: 'all', label: 'Alle Branchen' },
  { id: 'saas', label: 'SaaS / Plattform' },
  { id: 'production', label: 'Produktion / Energie' },
  { id: 'services', label: 'Dienstleistung' },
  { id: 'health', label: 'Health' },
  { id: 'retail', label: 'Retail' },
]

const SIZE_OPTIONS: Array<{ id: SizeFilter; label: string }> = [
  { id: 'all', label: 'Alle Größen' },
  { id: 'Small Business', label: 'Small Business' },
  { id: 'Growth', label: 'Growth' },
  { id: 'Scale-up', label: 'Scale-up' },
  { id: 'Mittelstand', label: 'Mittelstand' },
]

function industryBucket(scenarioId: ScenarioId): IndustryFilter {
  if (scenarioId === 'nexora-saas' || scenarioId === 'marktwerk-marketplace') return 'saas'
  if (scenarioId === 'nordkern-foods' || scenarioId === 'stromfeld-energy') return 'production'
  if (scenarioId === 'heliora-clinic') return 'health'
  if (scenarioId === 'urbanfit-retail') return 'retail'
  return 'services'
}

function matchesQuery(
  scenario: ReturnType<typeof listPlayableScenarios>[number],
  query: string,
): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    scenario.companyName,
    scenario.industry,
    scenario.stage,
    scenario.headline,
    scenario.scaleLabel,
    scenario.description,
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}

export function ScenarioPicker({
  busy,
  sessionEmail,
  cloudConfigured,
  authRequired = false,
  initialSelected = null,
  notice = null,
  onDismissNotice,
  onStart,
  onAuthChange,
  onLogout,
  onResetAllScenarios,
  authScreen = 'login',
  authToken = null,
}: {
  busy: boolean
  sessionEmail: string | null
  cloudConfigured: boolean
  /** When true, catalog is only for signed-in players (no anonymous demo). */
  authRequired?: boolean
  initialSelected?: ScenarioId | null
  notice?: string | null
  onDismissNotice?: () => void
  onStart: (scenarioId: ScenarioId, mode: RunMode) => Promise<void>
  onAuthChange: (email: string | null) => void
  onLogout: () => Promise<void>
  /** Wipe local + cloud progress; parent should clear any active run shell. */
  onResetAllScenarios?: () => Promise<void>
  authScreen?: AuthScreen
  authToken?: string | null
}) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [industry, setIndustry] = useState<IndustryFilter>('all')
  const [size, setSize] = useState<SizeFilter>('all')
  const [menuOpen, setMenuOpen] = useState(false)
  const [selected, setSelected] = useState<ScenarioId | null>(initialSelected)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'sessions' | 'scenario'>('sessions')
  const [progressByScenario, setProgressByScenario] = useState<Partial<Record<ScenarioId, number>>>({})
  const [resetBusy, setResetBusy] = useState(false)
  const [resetMessage, setResetMessage] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const filtersActive = industry !== 'all' || size !== 'all'
  const allowLocalDemo = !authRequired
  const canStartCloud = Boolean(sessionEmail && cloudConfigured)
  const canStart = canStartCloud || allowLocalDemo

  const visible = useMemo(
    () =>
      listPlayableScenarios().filter((scenario) => {
        if (!matchesQuery(scenario, query)) return false
        if (industry !== 'all' && industryBucket(scenario.id) !== industry) return false
        if (size !== 'all' && scenario.stage !== size) return false
        return true
      }),
    [query, industry, size],
  )

  useEffect(() => {
    setSelected(initialSelected)
  }, [initialSelected])

  useEffect(() => {
    let cancelled = false
    async function loadProgress() {
      const next: Partial<Record<ScenarioId, number>> = {}
      const local = loadLocalRun()
      if (local) {
        next[local.scenarioId] = progressPercentFromRun(local)
      }
      if (sessionEmail && cloudConfigured) {
        try {
          const cloud = await listCloudRunProgress()
          for (const item of cloud) {
            next[item.scenarioId] = item.percent
          }
        } catch {
          // Keep local snapshot if cloud list fails.
        }
      }
      if (!cancelled) setProgressByScenario(next)
    }
    void loadProgress()
    return () => {
      cancelled = true
    }
  }, [sessionEmail, cloudConfigured])

  useEffect(() => {
    if (!menuOpen) return
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  function selectScenario(scenarioId: ScenarioId) {
    setSelected(scenarioId)
    navigate(`/szenario/${scenarioSlug(scenarioId)}`)
  }

  return (
    <div className="scenario-shell">
      <header className="topbar topbar--menu">
        <div className="topbar__brand">
          <BrandMark size={28} />
          <strong>Business Type Sim</strong>
        </div>
        <div className="topbar__actions">
          {sessionEmail ? (
            <>
              <button
                type="button"
                className="icon-button"
                aria-label="Einstellungen"
                data-testid="scenario-menu-settings"
                disabled={busy}
                onClick={() => {
                  setSettingsTab('sessions')
                  setResetMessage(null)
                  setSettingsOpen(true)
                }}
              >
                <IconSettings />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label="Abmelden"
                data-testid="scenario-menu-logout"
                disabled={busy}
                onClick={() => {
                  void onLogout().then(() => onAuthChange(null))
                }}
              >
                <IconLogout />
              </button>
            </>
          ) : null}
        </div>
      </header>

      {settingsOpen && sessionEmail ? (
        <div className="scenario-settings" role="dialog" aria-modal="true" aria-label="Einstellungen">
          <div className="scenario-settings__panel">
            <div className="scenario-settings__head">
              <h2>Einstellungen</h2>
              <button
                type="button"
                className="icon-button"
                aria-label="Schließen"
                onClick={() => setSettingsOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="scenario-settings__tabs" role="tablist" aria-label="Einstellungsbereiche">
              <button
                type="button"
                role="tab"
                id="settings-tab-sessions"
                aria-selected={settingsTab === 'sessions'}
                aria-controls="settings-panel-sessions"
                className={settingsTab === 'sessions' ? 'is-active' : ''}
                data-testid="settings-tab-sessions"
                onClick={() => setSettingsTab('sessions')}
              >
                Sitzungen
              </button>
              <button
                type="button"
                role="tab"
                id="settings-tab-scenario"
                aria-selected={settingsTab === 'scenario'}
                aria-controls="settings-panel-scenario"
                className={settingsTab === 'scenario' ? 'is-active' : ''}
                data-testid="settings-tab-scenario"
                onClick={() => setSettingsTab('scenario')}
              >
                Szenario
              </button>
            </div>

            {settingsTab === 'sessions' ? (
              <div
                className="scenario-settings__body"
                role="tabpanel"
                id="settings-panel-sessions"
                aria-labelledby="settings-tab-sessions"
              >
                <AuthPanel
                  sessionEmail={sessionEmail}
                  cloudConfigured={cloudConfigured}
                  initialScreen="sessions"
                  onAuthChange={(email) => {
                    onAuthChange(email)
                    if (!email) setSettingsOpen(false)
                  }}
                  onLogout={onLogout}
                  localDemoHint={false}
                />
              </div>
            ) : (
              <div
                className="scenario-settings__body"
                role="tabpanel"
                id="settings-panel-scenario"
                aria-labelledby="settings-tab-scenario"
              >
                <section className="scenario-settings__reset" aria-label="Fortschritt">
                  <div className="scenario-settings__reset-copy">
                    <h3>Fortschritt</h3>
                    <p>
                      Alle Szenarien lokal und in der Cloud zurücksetzen — als hättest du sie noch nie
                      gestartet.
                    </p>
                    {resetMessage ? (
                      <p className="scenario-settings__reset-msg" role="status">
                        {resetMessage}
                      </p>
                    ) : null}
                  </div>
                  {onResetAllScenarios ? (
                    <Button
                      variant="danger"
                      data-testid="reset-all-scenarios"
                      disabled={busy || resetBusy}
                      onClick={() => {
                        const ok = window.confirm(
                          'Wirklich alle Szenarien zurücksetzen? Fortschritt und Cloud-Runs werden gelöscht.',
                        )
                        if (!ok) return
                        setResetBusy(true)
                        setResetMessage(null)
                        void onResetAllScenarios()
                          .then(() => {
                            setProgressByScenario({})
                            setResetMessage('Alle Szenarien wurden zurückgesetzt.')
                          })
                          .catch((error: unknown) => {
                            setResetMessage(
                              error instanceof Error
                                ? error.message
                                : 'Zurücksetzen fehlgeschlagen.',
                            )
                          })
                          .finally(() => setResetBusy(false))
                      }}
                    >
                      {resetBusy ? 'Wird zurückgesetzt…' : 'Alle Szenarien zurücksetzen'}
                    </Button>
                  ) : (
                    <p className="scenario-settings__reset-msg">Zurücksetzen ist gerade nicht verfügbar.</p>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className="scenario-screen scenario-screen--menu">
      <header className="scenario-heading">
        <span className="eyebrow">Szenario Auswahl</span>
        <h1>Wähle dein Unternehmen</h1>
      </header>

      {notice ? (
        <div className="notice" role="status">
          {notice}
          {onDismissNotice ? (
            <button type="button" onClick={onDismissNotice}>Schließen</button>
          ) : null}
        </div>
      ) : null}

      <div className="scenario-toolbar">
        <label className="scenario-search">
          <span className="sr-only">Unternehmen suchen</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Unternehmen suchen…"
            data-testid="scenario-search"
            autoComplete="off"
          />
        </label>

        <div className="scenario-filter" ref={menuRef}>
          <button
            type="button"
            className={`scenario-filter__trigger${filtersActive ? ' is-active' : ''}${menuOpen ? ' is-open' : ''}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Filter öffnen"
            data-testid="scenario-filter-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MoreIcon />
          </button>

          {menuOpen ? (
            <div className="scenario-filter__menu" role="menu" aria-label="Szenario-Filter">
              <div className="scenario-filter__group">
                <span className="scenario-filter__label">Branche</span>
                {INDUSTRY_OPTIONS.map((option) => (
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={industry === option.id}
                    className={industry === option.id ? 'is-selected' : ''}
                    key={option.id}
                    onClick={() => setIndustry(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="scenario-filter__group">
                <span className="scenario-filter__label">Firmengröße</span>
                {SIZE_OPTIONS.map((option) => (
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={size === option.id}
                    className={size === option.id ? 'is-selected' : ''}
                    key={option.id}
                    onClick={() => setSize(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {filtersActive ? (
                <button
                  type="button"
                  className="scenario-filter__reset"
                  onClick={() => {
                    setIndustry('all')
                    setSize('all')
                  }}
                >
                  Filter zurücksetzen
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="scenario-list">
        {visible.length === 0 ? (
          <p className="scenario-empty" data-testid="scenario-empty">
            Keine Unternehmen gefunden. Suche oder Filter anpassen.
          </p>
        ) : null}
        {visible.map((scenario) => {
          const isSelected = selected === scenario.id
          return (
            <article
              key={scenario.id}
              className={`scenario-pick${isSelected ? ' scenario-pick--selected' : ''}`}
            >
              <span
                className="scenario-pick__cover"
                style={{ backgroundImage: `url(${companyCoverSrc(scenario.id)})` }}
                aria-hidden="true"
              />
              <span className="scenario-pick__scrim" aria-hidden="true" />
              <div
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`Szenario ${scenario.companyName} auswählen`}
                className="scenario-pick__hit"
                onClick={() => selectScenario(scenario.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    selectScenario(scenario.id)
                  }
                }}
              >
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
                <>
                  <div
                    className="scenario-pick__pitch"
                    data-testid={`scenario-pitch-${scenario.id}`}
                  >
                    <span className="scenario-pick__pitch-label">Die Firma</span>
                    <p>{scenario.companyPitch}</p>
                  </div>
                  <div className="scenario-pick__actions">
                    <span className="scenario-pick__progress" data-testid={`scenario-progress-${scenario.id}`}>
                      {formatScenarioProgress(progressByScenario[scenario.id] ?? null)}
                    </span>
                    {canStart ? (
                      <Button
                        disabled={busy}
                        onClick={() => void onStart(scenario.id, canStartCloud ? 'cloud' : 'local')}
                      >
                        Szenario starten
                      </Button>
                    ) : null}
                  </div>
                </>
              ) : null}
            </article>
          )
        })}
      </div>

      {!sessionEmail ? (
        <AuthPanel
          sessionEmail={sessionEmail}
          cloudConfigured={cloudConfigured}
          initialScreen={authScreen}
          initialToken={authToken}
          onAuthChange={onAuthChange}
          onLogout={onLogout}
          localDemoHint={!authRequired}
        />
      ) : null}
      </div>
    </div>
  )
}

function MoreIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  )
}
