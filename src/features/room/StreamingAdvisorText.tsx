/**
 * Chat-style typing delay + character stream for advisor messages.
 * Location: src/features/room/StreamingAdvisorText.tsx
 * Empty text + animate keeps typing dots until content arrives (LLM briefings).
 */
import { useEffect, useRef, useState } from 'react'

const TYPING_MS = 900
const CHARS_PER_TICK = 3
const TICK_MS = 28

export function StreamingAdvisorText({
  text,
  animate,
  onComplete,
}: {
  text: string
  animate: boolean
  onComplete?: () => void
}) {
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  const [phase, setPhase] = useState<'idle' | 'typing' | 'stream' | 'done'>(
    animate ? 'typing' : 'done',
  )
  const [shown, setShown] = useState(animate ? '' : text)

  useEffect(() => {
    if (!animate) {
      setPhase('done')
      setShown(text)
      return
    }

    // Wait for LLM/fallback content — keep typing indicator.
    if (!text.trim()) {
      setPhase('typing')
      setShown('')
      return
    }

    setPhase('typing')
    setShown('')
    let cancelled = false
    let tickTimer: number | undefined
    const typingTimer = window.setTimeout(() => {
      if (cancelled) return
      setPhase('stream')
      let i = 0
      tickTimer = window.setInterval(() => {
        if (cancelled) return
        i = Math.min(text.length, i + CHARS_PER_TICK)
        setShown(text.slice(0, i))
        if (i >= text.length) {
          if (tickTimer !== undefined) window.clearInterval(tickTimer)
          setPhase('done')
          onCompleteRef.current?.()
        }
      }, TICK_MS)
    }, TYPING_MS)

    return () => {
      cancelled = true
      window.clearTimeout(typingTimer)
      if (tickTimer !== undefined) window.clearInterval(tickTimer)
    }
  }, [animate, text])

  if (phase === 'typing') {
    return (
      <p className="room-msg__typing" data-testid="room-msg-typing" aria-label="schreibt…">
        <span className="room-msg__typing-dot" />
        <span className="room-msg__typing-dot" />
        <span className="room-msg__typing-dot" />
      </p>
    )
  }

  return (
    <p data-testid={phase === 'stream' ? 'room-msg-streaming' : undefined}>
      {shown}
      {phase === 'stream' ? <span className="room-msg__caret" aria-hidden="true" /> : null}
    </p>
  )
}
