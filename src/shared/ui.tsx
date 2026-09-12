import type { ReactNode } from 'react'

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  return (
    <button className={`button button--${variant}`} onClick={onClick} disabled={disabled} type={type}>
      {children}
    </button>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`.trim()}>{children}</section>
}

export function Tag({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'positive' | 'warning' | 'negative' }) {
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
