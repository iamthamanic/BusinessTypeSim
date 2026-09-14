/**
 * Shared run info sheet — analyses, decide, end run (from topbar i).
 * Location: src/features/room/RoomInfoSheet.tsx
 */
export function RoomInfoSheet({
  companyName,
  headline,
  decisionContext,
  onClose,
  onOpenAnalyses,
  onOpenDecide,
  onEndRun,
}: {
  companyName: string
  headline: string
  decisionContext: string
  onClose: () => void
  onOpenAnalyses: () => void
  onOpenDecide: () => void
  onEndRun: () => void
}) {
  return (
    <div className="room-info" role="dialog" aria-modal="true" aria-label="Raum-Info" data-testid="room-info">
      <div className="room-info__card">
        <header>
          <strong>{companyName}</strong>
          <button type="button" className="icon-button" aria-label="Schließen" onClick={onClose}>
            ×
          </button>
        </header>
        <p>{headline}</p>
        <p className="muted">{decisionContext}</p>
        <div className="room-info__actions">
          <button
            type="button"
            onClick={() => {
              onClose()
              onOpenAnalyses()
            }}
          >
            Weitere Informationen anfordern
          </button>
          <button
            type="button"
            onClick={() => {
              onClose()
              onOpenDecide()
            }}
          >
            Entscheidung treffen
          </button>
          <button type="button" className="room-info__danger" onClick={onEndRun}>
            Run beenden
          </button>
        </div>
      </div>
    </div>
  )
}
