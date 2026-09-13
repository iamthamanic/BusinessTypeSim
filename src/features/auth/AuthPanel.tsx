/**
 * Auth panel — register, verify, login, reset, sessions, delete (German, mobile-first).
 * Location: src/features/auth/AuthPanel.tsx
 */
import { useEffect, useState } from 'react'
import {
  confirmPasswordReset,
  deleteAccount,
  listSessions,
  login,
  logoutAll,
  register,
  requestPasswordReset,
  revokeSession,
  verifyEmail,
} from '../../infrastructure/cloud'
import { isBrowserOnline } from '../../infrastructure/cloud-draft'
import { Button } from '../../shared/ui'

export type AuthScreen =
  | 'login'
  | 'register'
  | 'verify'
  | 'reset-request'
  | 'reset-confirm'
  | 'sessions'
  | 'delete'

const ERROR_DE: Record<string, string> = {
  INVALID_INPUT: 'Eingabe ungültig.',
  EMAIL_TAKEN: 'Diese E-Mail ist bereits registriert.',
  INVALID_CREDENTIALS: 'E-Mail oder Passwort falsch.',
  EMAIL_NOT_VERIFIED: 'Bitte zuerst die E-Mail bestätigen.',
  TOKEN_INVALID_OR_EXPIRED: 'Link abgelaufen oder bereits verwendet.',
  RATE_LIMITED: 'Zu viele Versuche — bitte später erneut.',
  SESSION_REVOKED: 'Sitzung ungültig — bitte neu anmelden.',
  AUTH_REQUIRED: 'Anmeldung erforderlich.',
  REGISTER_FAILED: 'Registrierung fehlgeschlagen.',
  LOGIN_FAILED: 'Anmeldung fehlgeschlagen.',
  VERIFY_FAILED: 'Bestätigung fehlgeschlagen.',
  RESET_REQUEST_FAILED: 'Reset-Anfrage fehlgeschlagen.',
  RESET_CONFIRM_FAILED: 'Passwort konnte nicht gesetzt werden.',
  DELETE_FAILED: 'Konto konnte nicht gelöscht werden.',
  SESSIONS_FAILED: 'Sitzungen konnten nicht geladen werden.',
  REVOKE_FAILED: 'Sitzung konnte nicht beendet werden.',
}

function mapError(code: string | undefined): string {
  if (!code) return 'Unbekannter Fehler.'
  return ERROR_DE[code] ?? code
}

export function AuthPanel({
  sessionEmail,
  cloudConfigured,
  initialScreen = 'login',
  initialToken = null,
  onAuthChange,
  onLogout,
}: {
  sessionEmail: string | null
  cloudConfigured: boolean
  initialScreen?: AuthScreen
  initialToken?: string | null
  onAuthChange: (email: string | null) => void
  onLogout: () => Promise<void>
}) {
  const [screen, setScreen] = useState<AuthScreen>(initialScreen)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState(initialToken ?? '')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [online, setOnline] = useState(() => isBrowserOnline())
  const [sessions, setSessions] = useState<Array<{
    id: string
    createdAt: string
    revokedAt: string | null
    userAgent: string | null
  }>>([])

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
    if (initialToken) {
      setToken(initialToken)
      if (initialScreen === 'verify' || initialScreen === 'reset-confirm') setScreen(initialScreen)
    }
  }, [initialToken, initialScreen])

  useEffect(() => {
    if (sessionEmail && screen === 'sessions') {
      void refreshSessions()
    }
  }, [sessionEmail, screen])

  async function refreshSessions() {
    setBusy(true)
    setError(null)
    const result = await listSessions()
    setBusy(false)
    if (result.error) {
      setError(mapError(result.error))
      return
    }
    setSessions(result.sessions)
  }

  async function run(action: () => Promise<{ error?: string; message?: string } | void>) {
    if (!online) {
      setError('Offline — Auth-Aktionen brauchen eine Verbindung.')
      return
    }
    setBusy(true)
    setError(null)
    setMessage(null)
    const result = await action()
    setBusy(false)
    if (result && 'error' in result && result.error) {
      setError(mapError(result.error))
      return
    }
    if (result && 'message' in result && result.message) {
      setMessage(
        result.message === 'VERIFY_EMAIL_SENT'
          ? 'Konto angelegt. Bitte E-Mail bestätigen (Dev: Capture-Token).'
          : result.message,
      )
    }
  }

  if (!cloudConfigured) {
    return (
      <section className="auth-panel card" aria-live="polite">
        <span className="eyebrow">Cloud optional</span>
        <h2>Cloud-API nicht konfiguriert</h2>
        <p>Setze <code>VITE_API_URL</code>, um Anmeldung und Sync zu nutzen. Lokale Demos bleiben spielbar.</p>
      </section>
    )
  }

  if (sessionEmail && (screen === 'login' || screen === 'register')) {
    return (
      <section className="auth-panel card" data-testid="auth-session">
        <span className="eyebrow">Cloud-Konto</span>
        <h2>Angemeldet</h2>
        <p className="auth-panel__email">{sessionEmail}</p>
        {!online ? <p className="auth-panel__status auth-panel__status--warn" role="status">Offline</p> : null}
        <div className="auth-panel__actions">
          <Button variant="secondary" disabled={busy} onClick={() => setScreen('sessions')}>
            Sitzungen
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => setScreen('delete')}>
            Konto löschen
          </Button>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => {
              void onLogout().then(() => onAuthChange(null))
            }}
          >
            Abmelden
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="auth-panel card" data-testid="auth-panel" aria-busy={busy}>
      <span className="eyebrow">Cloud-Konto</span>
      <h2>{titleFor(screen)}</h2>
      {!online ? (
        <p className="auth-panel__status auth-panel__status--warn" role="status">
          Offline — Formulare sind deaktiviert.
        </p>
      ) : null}
      {error ? (
        <p className="auth-panel__status auth-panel__status--error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="auth-panel__status auth-panel__status--ok" role="status">
          {message}
        </p>
      ) : null}

      {(screen === 'login' || screen === 'register') && (
        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault()
            void run(async () => {
              if (screen === 'login') {
                const result = await login(email.trim(), password)
                if (!result.error) onAuthChange(email.trim().toLowerCase())
                return result
              }
              const result = await register(email.trim(), password)
              if (!result.error) setScreen('verify')
              return result
            })
          }}
        >
          <label>
            <span>E-Mail</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="username"
              required
              disabled={busy || !online}
            />
          </label>
          <label>
            <span>Passwort (min. 8)</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete={screen === 'login' ? 'current-password' : 'new-password'}
              minLength={8}
              required
              disabled={busy || !online}
            />
          </label>
          <div className="auth-panel__actions">
            <Button type="submit" disabled={busy || !online || email.trim().length === 0 || password.length < 8}>
              {busy ? 'Bitte warten…' : screen === 'login' ? 'Anmelden' : 'Registrieren'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setError(null)
                setMessage(null)
                setScreen(screen === 'login' ? 'register' : 'login')
              }}
            >
              {screen === 'login' ? 'Konto erstellen' : 'Zur Anmeldung'}
            </Button>
          </div>
          <button
            type="button"
            className="auth-link"
            disabled={busy}
            onClick={() => setScreen('reset-request')}
          >
            Passwort vergessen?
          </button>
          <button type="button" className="auth-link" disabled={busy} onClick={() => setScreen('verify')}>
            E-Mail-Code eingeben
          </button>
        </form>
      )}

      {screen === 'verify' && (
        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault()
            void run(async () => {
              const result = await verifyEmail(token.trim())
              if (!result.error && result.email) {
                onAuthChange(result.email)
                setScreen('login')
              }
              return result
            })
          }}
        >
          <label>
            <span>Bestätigungs-Token</span>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={busy || !online}
              required
              minLength={16}
              aria-label="Bestätigungs-Token"
            />
          </label>
          <div className="auth-panel__actions">
            <Button type="submit" disabled={busy || !online || token.trim().length < 16}>
              {busy ? 'Prüfe…' : 'E-Mail bestätigen'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setScreen('login')}>Zurück</Button>
          </div>
        </form>
      )}

      {screen === 'reset-request' && (
        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault()
            void run(async () => {
              const result = await requestPasswordReset(email.trim())
              if (!result.error) {
                setMessage('Falls ein Konto existiert, wurde ein Reset-Link vorbereitet.')
                setScreen('reset-confirm')
              }
              return result
            })
          }}
        >
          <label>
            <span>E-Mail</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              disabled={busy || !online}
            />
          </label>
          <div className="auth-panel__actions">
            <Button type="submit" disabled={busy || !online || !email.trim()}>
              Reset anfordern
            </Button>
            <Button type="button" variant="ghost" onClick={() => setScreen('login')}>Zurück</Button>
          </div>
        </form>
      )}

      {screen === 'reset-confirm' && (
        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault()
            void run(async () => {
              const result = await confirmPasswordReset(token.trim(), password)
              if (!result.error) {
                setMessage('Passwort aktualisiert. Bitte anmelden.')
                setScreen('login')
                onAuthChange(null)
              }
              return result
            })
          }}
        >
          <label>
            <span>Reset-Token</span>
            <input value={token} onChange={(e) => setToken(e.target.value)} required disabled={busy || !online} />
          </label>
          <label>
            <span>Neues Passwort</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              minLength={8}
              required
              disabled={busy || !online}
              autoComplete="new-password"
            />
          </label>
          <div className="auth-panel__actions">
            <Button type="submit" disabled={busy || !online || token.trim().length < 16 || password.length < 8}>
              Passwort setzen
            </Button>
            <Button type="button" variant="ghost" onClick={() => setScreen('login')}>Zur Anmeldung</Button>
          </div>
        </form>
      )}

      {screen === 'sessions' && sessionEmail && (
        <div className="auth-sessions">
          <p>Aktive und kürzliche Sitzungen. Widerrufene Tokens sind nicht wiederverwendbar.</p>
          <div className="auth-panel__actions">
            <Button disabled={busy || !online} onClick={() => void refreshSessions()}>Aktualisieren</Button>
            <Button
              variant="secondary"
              disabled={busy || !online}
              onClick={() => {
                void run(async () => {
                  await logoutAll()
                  onAuthChange(null)
                  setMessage('Alle Geräte abgemeldet.')
                })
              }}
            >
              Alle abmelden
            </Button>
            <Button variant="ghost" onClick={() => setScreen('login')}>Zurück</Button>
          </div>
          {sessions.length === 0 ? (
            <p className="auth-panel__empty">Keine Sitzungen geladen.</p>
          ) : (
            <ul className="auth-session-list">
              {sessions.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{new Date(item.createdAt).toLocaleString('de-DE')}</strong>
                    <small>{item.userAgent ?? 'Unbekanntes Gerät'}</small>
                    {item.revokedAt ? <small className="auth-panel__status--error">Widerrufen</small> : null}
                  </div>
                  {!item.revokedAt ? (
                    <Button
                      variant="ghost"
                      disabled={busy || !online}
                      onClick={() => {
                        void run(async () => revokeSession(item.id).then(async (r) => {
                          if (!r.error) await refreshSessions()
                          return r
                        }))
                      }}
                    >
                      Beenden
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {screen === 'delete' && sessionEmail && (
        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault()
            void run(async () => {
              const result = await deleteAccount(password)
              if (!result.error) {
                onAuthChange(null)
                setMessage('Konto gelöscht.')
                setScreen('login')
              }
              return result
            })
          }}
        >
          <p>Löscht dein Konto und alle Cloud-Runs unwiderruflich.</p>
          <label>
            <span>Passwort zur Bestätigung</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              minLength={8}
              disabled={busy || !online}
              autoComplete="current-password"
            />
          </label>
          <div className="auth-panel__actions">
            <Button type="submit" variant="danger" disabled={busy || !online || password.length < 8}>
              Konto löschen
            </Button>
            <Button type="button" variant="ghost" onClick={() => setScreen('login')}>Abbrechen</Button>
          </div>
        </form>
      )}
    </section>
  )
}

function titleFor(screen: AuthScreen): string {
  switch (screen) {
    case 'login':
      return 'Anmelden'
    case 'register':
      return 'Registrieren'
    case 'verify':
      return 'E-Mail bestätigen'
    case 'reset-request':
      return 'Passwort zurücksetzen'
    case 'reset-confirm':
      return 'Neues Passwort'
    case 'sessions':
      return 'Sitzungen'
    case 'delete':
      return 'Konto löschen'
  }
}
