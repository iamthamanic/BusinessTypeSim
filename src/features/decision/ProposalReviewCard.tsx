/**
 * Editable mobile review of interpreted ManagementActions before commit.
 * Location: src/features/decision/ProposalReviewCard.tsx
 */
import { useEffect, useState } from 'react'
import type { ActionParams, ActionProposal, ManagementAction } from '../../domain'
import { Button, Card, SectionTitle, Tag } from '../../shared/ui'

function centsToEuroInput(cents: number | undefined): string {
  if (cents === undefined) return ''
  return (cents / 100).toFixed(2)
}

function euroInputToCents(raw: string): number | undefined {
  const trimmed = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (!trimmed) return undefined
  if (!/^-?\d+(\.\d{0,2})?$/.test(trimmed)) return undefined
  if (trimmed.endsWith('.')) return undefined
  const euros = Number.parseFloat(trimmed)
  if (!Number.isFinite(euros)) return undefined
  return Math.round(euros * 100)
}

function formatEuroSummary(cents: number | undefined): string {
  if (cents === undefined) return '—'
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

function primarySummary(action: ManagementAction): string {
  const { params, kind } = action
  if (kind === 'allocate_capital' || kind === 'renegotiate_customer' || kind === 'start_project') {
    return `Betrag: ${formatEuroSummary(params.amountCents)}`
  }
  if (kind === 'change_headcount_plan') {
    return `Headcount: ${params.headcountDelta === undefined ? '—' : params.headcountDelta > 0 ? `+${params.headcountDelta}` : String(params.headcountDelta)}`
  }
  if (kind === 'set_pricing_policy') {
    return `Preis: ${params.priceChangeBps === undefined ? '—' : `${params.priceChangeBps} bps`}`
  }
  if (kind === 'restructure_organization') {
    return `Org: ${params.orgChange ?? '—'}`
  }
  return params.scope ?? action.label
}

function applyParamPatch(current: ActionParams, patch: ActionParams): ActionParams {
  const next: ActionParams = { ...current }
  if ('amountCents' in patch) {
    if (patch.amountCents === undefined) delete next.amountCents
    else next.amountCents = patch.amountCents
  }
  if ('targetId' in patch) {
    if (patch.targetId === undefined || patch.targetId === '') delete next.targetId
    else next.targetId = patch.targetId
  }
  if ('scope' in patch) {
    if (patch.scope === undefined || patch.scope === '') delete next.scope
    else next.scope = patch.scope
  }
  if ('timingDays' in patch) {
    if (patch.timingDays === undefined) delete next.timingDays
    else next.timingDays = patch.timingDays
  }
  if ('conditions' in patch) {
    if (patch.conditions === undefined || patch.conditions === '') delete next.conditions
    else next.conditions = patch.conditions
  }
  if ('fallback' in patch) {
    if (patch.fallback === undefined || patch.fallback === '') delete next.fallback
    else next.fallback = patch.fallback
  }
  if ('headcountDelta' in patch) {
    if (patch.headcountDelta === undefined) delete next.headcountDelta
    else next.headcountDelta = patch.headcountDelta
  }
  if ('priceChangeBps' in patch) {
    if (patch.priceChangeBps === undefined) delete next.priceChangeBps
    else next.priceChangeBps = patch.priceChangeBps
  }
  if ('projectId' in patch) {
    if (patch.projectId === undefined || patch.projectId === '') delete next.projectId
    else next.projectId = patch.projectId
  }
  if ('orgChange' in patch) {
    if (patch.orgChange === undefined || patch.orgChange === '') delete next.orgChange
    else next.orgChange = patch.orgChange
  }
  return next
}

function patchActionParams(
  proposal: ActionProposal,
  actionId: string,
  patch: ActionParams,
): ActionProposal {
  return {
    ...proposal,
    actions: proposal.actions.map((action) => {
      if (action.id !== actionId) return action
      return { ...action, params: applyParamPatch(action.params, patch) }
    }),
  }
}

function EuroAmountField({
  cents,
  disabled,
  onCommitCents,
}: {
  cents: number | undefined
  disabled: boolean
  onCommitCents: (cents: number | undefined) => void
}) {
  const [draft, setDraft] = useState(() => centsToEuroInput(cents))

  useEffect(() => {
    setDraft(centsToEuroInput(cents))
  }, [cents])

  return (
    <label className="field">
      <span>Betrag (EUR)</span>
      <input
        inputMode="decimal"
        value={draft}
        disabled={disabled}
        onChange={(event) => {
          const next = event.target.value
          setDraft(next)
          if (next.trim() === '') {
            onCommitCents(undefined)
            return
          }
          const parsed = euroInputToCents(next)
          if (parsed !== undefined) onCommitCents(parsed)
        }}
        onBlur={() => {
          const parsed = euroInputToCents(draft)
          onCommitCents(parsed)
          setDraft(centsToEuroInput(parsed))
        }}
      />
    </label>
  )
}

function ActionReviewRow({
  action,
  disabled,
  onChangeParams,
}: {
  action: ManagementAction
  disabled: boolean
  onChangeParams: (patch: ActionParams) => void
}) {
  const [open, setOpen] = useState(false)
  const { params } = action

  return (
    <div className={`action-review-row${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="action-review-row__summary"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        disabled={disabled}
      >
        <div className="action-review-row__head">
          <Tag tone="positive">Action</Tag>
          <strong>{action.label}</strong>
        </div>
        <span className="action-review-row__primary">{primarySummary(action)}</span>
        <span className="action-review-row__chevron" aria-hidden="true">{open ? '▾' : '›'}</span>
      </button>

      {open ? (
        <div className="action-review-sheet" role="region" aria-label={`Parameter ${action.label}`}>
          {(action.kind === 'allocate_capital' || action.kind === 'renegotiate_customer' || action.kind === 'start_project') ? (
            <EuroAmountField
              cents={params.amountCents}
              disabled={disabled}
              onCommitCents={(amountCents) => onChangeParams({ amountCents })}
            />
          ) : null}

          {action.kind === 'change_headcount_plan' ? (
            <label className="field">
              <span>Headcount-Delta</span>
              <input
                inputMode="numeric"
                value={params.headcountDelta === undefined ? '' : String(params.headcountDelta)}
                disabled={disabled}
                onChange={(event) => {
                  const raw = event.target.value.trim()
                  if (!raw) {
                    onChangeParams({ headcountDelta: undefined })
                    return
                  }
                  if (!/^-?\d+$/.test(raw)) return
                  onChangeParams({ headcountDelta: Number.parseInt(raw, 10) })
                }}
              />
            </label>
          ) : null}

          {action.kind === 'set_pricing_policy' ? (
            <label className="field">
              <span>Preisänderung (bps)</span>
              <input
                inputMode="numeric"
                value={params.priceChangeBps === undefined ? '' : String(params.priceChangeBps)}
                disabled={disabled}
                onChange={(event) => {
                  const raw = event.target.value.trim()
                  if (!raw) {
                    onChangeParams({ priceChangeBps: undefined })
                    return
                  }
                  if (!/^-?\d+$/.test(raw)) return
                  onChangeParams({ priceChangeBps: Number.parseInt(raw, 10) })
                }}
              />
            </label>
          ) : null}

          {action.kind === 'start_project' ? (
            <label className="field">
              <span>Projekt-ID</span>
              <input
                value={params.projectId ?? ''}
                disabled={disabled}
                onChange={(event) => {
                  const value = event.target.value.trim()
                  onChangeParams({ projectId: value.length > 0 ? value : undefined })
                }}
              />
            </label>
          ) : null}

          {action.kind === 'restructure_organization' ? (
            <label className="field">
              <span>Org-Änderung</span>
              <input
                value={params.orgChange ?? ''}
                disabled={disabled}
                onChange={(event) => {
                  const value = event.target.value.trim()
                  onChangeParams({ orgChange: value.length > 0 ? value : undefined })
                }}
              />
            </label>
          ) : null}

          <label className="field">
            <span>Ziel</span>
            <input
              value={params.targetId ?? ''}
              disabled={disabled}
              onChange={(event) => {
                const value = event.target.value.trim()
                onChangeParams({ targetId: value.length > 0 ? value : undefined })
              }}
            />
          </label>

          <label className="field">
            <span>Scope</span>
            <input
              value={params.scope ?? ''}
              disabled={disabled}
              onChange={(event) => {
                const value = event.target.value.trim()
                onChangeParams({ scope: value.length > 0 ? value : undefined })
              }}
            />
          </label>

          <label className="field">
            <span>Timing (Tage)</span>
            <input
              inputMode="numeric"
              value={params.timingDays === undefined ? '' : String(params.timingDays)}
              disabled={disabled}
              onChange={(event) => {
                const raw = event.target.value.trim()
                if (!raw) {
                  onChangeParams({ timingDays: undefined })
                  return
                }
                if (!/^\d+$/.test(raw)) return
                onChangeParams({ timingDays: Number.parseInt(raw, 10) })
              }}
            />
          </label>

          <label className="field">
            <span>Bedingungen</span>
            <textarea
              rows={2}
              value={params.conditions ?? ''}
              disabled={disabled}
              onChange={(event) => {
                const value = event.target.value.trim()
                onChangeParams({ conditions: value.length > 0 ? value : undefined })
              }}
            />
          </label>

          <label className="field">
            <span>Fallback</span>
            <textarea
              rows={2}
              value={params.fallback ?? ''}
              disabled={disabled}
              onChange={(event) => {
                const value = event.target.value.trim()
                onChangeParams({ fallback: value.length > 0 ? value : undefined })
              }}
            />
          </label>
        </div>
      ) : null}
    </div>
  )
}

export function ProposalReviewCard({
  proposal,
  busy,
  online,
  interpretError,
  commitBlockedReason,
  onProposalChange,
  onBack,
  onConfirm,
}: {
  proposal: ActionProposal | null
  busy: boolean
  online: boolean
  interpretError?: string | null | undefined
  commitBlockedReason?: string | null | undefined
  onProposalChange: (proposal: ActionProposal) => void
  onBack: () => void
  onConfirm: () => void
}) {
  if (busy && !proposal) {
    return (
      <Card className="proposal-card proposal-card--loading" aria-busy="true">
        <SectionTitle title="So haben wir dich verstanden" meta="Interpretation läuft" />
        <p className="proposal-status" role="status">Lade strukturierte Interpretation …</p>
      </Card>
    )
  }

  if (interpretError) {
    return (
      <Card className="proposal-card proposal-card--error">
        <SectionTitle title="So haben wir dich verstanden" meta="Fehler" />
        <div className="error-box" role="alert">
          <strong>Interpretation fehlgeschlagen.</strong> {interpretError}
        </div>
        <div className="button-row">
          <Button variant="secondary" onClick={onBack}>Zurück</Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="proposal-card">
      <SectionTitle title="So haben wir dich verstanden" meta="Vor Commit korrigierbar" />
      {!online ? (
        <p className="offline-hint" role="status">Offline — Entwurf lokal gespeichert. Cloud-Commit erst wieder online.</p>
      ) : null}
      {proposal ? (
        <>
          <div className="proposal-actions">
            {proposal.actions.map((action) => (
              <ActionReviewRow
                key={action.id}
                action={action}
                disabled={busy}
                onChangeParams={(patch) => onProposalChange(patchActionParams(proposal, action.id, patch))}
              />
            ))}
          </div>
          {proposal.ambiguities.length ? (
            <div className="warning-box">
              <strong>Offen:</strong> {proposal.ambiguities.join(' ')}
            </div>
          ) : null}
          <div className="proposal-meta">
            <span>Ziele: {proposal.extractedObjectives.join(', ') || 'nicht explizit erkannt'}</span>
            <span>Risiken: {proposal.extractedRisks.join(', ') || 'nicht explizit erkannt'}</span>
            <span>Evidence: {proposal.evidenceRefs.length} Analyse(n)</span>
          </div>
        </>
      ) : (
        <p className="proposal-status">Keine strukturierte Interpretation — du kannst zurück und neu formulieren.</p>
      )}
      <div className="button-row">
        <Button variant="secondary" disabled={busy} onClick={onBack}>Überarbeiten</Button>
        <Button
          disabled={busy || !proposal || Boolean(commitBlockedReason)}
          onClick={onConfirm}
        >
          {busy ? 'Committe …' : 'Committen & simulieren'}
        </Button>
      </div>
      {commitBlockedReason ? <p className="offline-hint" role="status">{commitBlockedReason}</p> : null}
    </Card>
  )
}
