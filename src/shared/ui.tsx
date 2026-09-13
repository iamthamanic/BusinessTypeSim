/** Shared UI primitives aligned to the Executive Decision Room styleguide. */
import type { HTMLAttributes, ReactNode } from 'react'

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  type = 'button',
  block = false,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'soft'
  disabled?: boolean
  type?: 'button' | 'submit'
  block?: boolean
  className?: string
}) {
  return (
    <button
      className={`button button--${variant}${block ? ' button--block' : ''}${className ? ` ${className}` : ''}`}
      onClick={onClick}
      disabled={disabled}
      type={type}
    >
      {children}
    </button>
  )
}

export function Card({
  children,
  className = '',
  ...rest
}: {
  children: ReactNode
  className?: string
} & HTMLAttributes<HTMLElement>) {
  return (
    <section className={`card ${className}`.trim()} {...rest}>
      {children}
    </section>
  )
}

export function Tag({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'positive' | 'warning' | 'negative' | 'accent'
}) {
  return <span className={`tag tag--${tone}`}>{children}</span>
}

export function SectionTitle({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {meta ? <span>{meta}</span> : null}
    </div>
  )
}

export function ProgressBar({ value }: { value: number }) {
  const width = Math.max(0, Math.min(100, value))
  return (
    <div className="progress" aria-label={`${width} von 100`}>
      <span style={{ width: `${width}%` }} />
    </div>
  )
}

/** Circular decision-quality gauge matching the mockup Auswertung screen. */
export function QualityGauge({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value))
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped / 100)
  return (
    <div className="quality-gauge" aria-label={`Decision Quality ${clamped} von 100`}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} className="quality-gauge__track" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          className="quality-gauge__value"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 70 70)"
        />
      </svg>
      <div className="quality-gauge__label">
        <strong>{clamped}</strong>
        <span>/100</span>
      </div>
    </div>
  )
}

/** Compact sparkline for company ARR/revenue trend. */
export function Sparkline({ values, positive = true }: { values: number[]; positive?: boolean }) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(1, max - min)
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100
      const y = 36 - ((value - min) / range) * 28
      return `${x},${y}`
    })
    .join(' ')
  return (
    <svg className={`sparkline${positive ? '' : ' sparkline--warn'}`} viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
      <polyline fill="none" stroke="currentColor" strokeWidth="2.2" points={points} />
    </svg>
  )
}

export function MetricTile({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string
  value: string
  hint?: string
  tone?: 'neutral' | 'positive' | 'negative' | 'warning'
}) {
  return (
    <div className={`metric-tile metric-tile--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </div>
  )
}

export function ActionRow({
  title,
  subtitle,
  onClick,
  trailing,
}: {
  title: string
  subtitle?: string
  onClick?: () => void
  trailing?: ReactNode
}) {
  return (
    <button type="button" className="action-row" onClick={onClick}>
      <div>
        <strong>{title}</strong>
        {subtitle ? <span>{subtitle}</span> : null}
      </div>
      {trailing ?? <span className="action-row__chevron" aria-hidden="true">›</span>}
    </button>
  )
}
