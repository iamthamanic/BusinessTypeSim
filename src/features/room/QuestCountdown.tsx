/**
 * Live wall-clock countdown for decision quests (compressed game-day → real time).
 * Location: src/features/room/QuestCountdown.tsx
 */
import { useEffect, useState } from 'react'

/** UI urgency: 1 Spieltag ≈ 1 echte Minute Countdown. */
export const MS_PER_GAME_DAY_UI = 60_000

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function formatQuestCountdown(remainingMs: number): string {
  const safe = Math.max(0, remainingMs)
  const totalSec = Math.floor(safe / 1000)
  const days = Math.floor(totalSec / 86_400)
  const hours = Math.floor((totalSec % 86_400) / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60
  if (days > 0) return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

export function QuestCountdown({
  gameDaysLeft,
  missed = false,
}: {
  /** Remaining soft-deadline days in simulation time. */
  gameDaysLeft: number
  missed?: boolean
}) {
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, gameDaysLeft) * MS_PER_GAME_DAY_UI,
  )

  useEffect(() => {
    const targetAt = Date.now() + Math.max(0, gameDaysLeft) * MS_PER_GAME_DAY_UI
    const tick = () => setRemainingMs(Math.max(0, targetAt - Date.now()))
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [gameDaysLeft])

  if (missed) {
    return (
      <span className="room-quest__countdown room-quest__countdown--missed" data-testid="quest-countdown">
        Frist verpasst
      </span>
    )
  }

  if (gameDaysLeft <= 0) {
    return (
      <span className="room-quest__countdown room-quest__countdown--due" data-testid="quest-countdown">
        Jetzt fällig
      </span>
    )
  }

  return (
    <span className="room-quest__countdown" data-testid="quest-countdown" aria-live="polite">
      <span className="room-quest__countdown-label">Countdown</span>
      <strong>{formatQuestCountdown(remainingMs)}</strong>
    </span>
  )
}
