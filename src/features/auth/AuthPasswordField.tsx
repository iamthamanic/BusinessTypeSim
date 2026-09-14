/**
 * Password input with show/hide toggle for auth forms.
 * Location: src/features/auth/AuthPasswordField.tsx
 */
import { useState } from 'react'

export function AuthPasswordField({
  label,
  value,
  onChange,
  autoComplete,
  minLength,
  required,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  minLength?: number
  required?: boolean
  disabled?: boolean
}) {
  const [visible, setVisible] = useState(false)
  const inputId = `auth-password-${label.replace(/\W+/g, '-').toLowerCase()}`

  return (
    <label className="auth-password" htmlFor={inputId}>
      <span>{label}</span>
      <div className="auth-password__row">
        <input
          id={inputId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          minLength={minLength}
          required={required}
          disabled={disabled}
        />
        <button
          type="button"
          className="auth-password__toggle"
          aria-label={visible ? 'Passwort verbergen' : 'Passwort anzeigen'}
          aria-pressed={visible}
          disabled={disabled}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <IconEyeOff /> : <IconEye />}
        </button>
      </div>
    </label>
  )
}

function IconEye() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.75" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

function IconEyeOff() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 3l18 18M10.5 6.5C11 6.2 11.5 6 12 6c6 0 9.5 7 9.5 7a16 16 0 0 1-3.2 3.8M7.1 7.3A15 15 0 0 0 2.5 12S6 19 12 19c1.3 0 2.5-.3 3.6-.8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.9 9.9a3 3 0 0 0 4.2 4.2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}
