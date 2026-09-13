/**
 * Versioned, kind-specific ManagementAction parameter schemas.
 * Pure domain: Zod validation only — no React, DB, or LLM.
 * Location: shared/domain/action-params.ts
 */
import { z } from 'zod'
import type { ActionKind, ActionParams, ManagementAction } from './types.ts'

/** Current parameter schema version for new ManagementActions. */
export const ACTION_PARAMS_SCHEMA_VERSION = 1 as const

/** Kinds that ship full, versioned parameter schemas in this slice. */
export const PARAMETERIZED_ACTION_KINDS = [
  'allocate_capital',
  'renegotiate_customer',
  'change_headcount_plan',
  'set_pricing_policy',
  'start_project',
  'restructure_organization',
] as const

export type ParameterizedActionKind = (typeof PARAMETERIZED_ACTION_KINDS)[number]

export function isParameterizedActionKind(kind: ActionKind): kind is ParameterizedActionKind {
  return (PARAMETERIZED_ACTION_KINDS as readonly string[]).includes(kind)
}

/** Shared optional fields across management actions. */
const commonParamsFields = {
  targetId: z.string().min(1).max(120).optional(),
  scope: z.string().min(1).max(500).optional(),
  timingDays: z.number().int().min(0).max(3650).optional(),
  conditions: z.string().min(1).max(1000).optional(),
  fallback: z.string().min(1).max(1000).optional(),
} as const

/** Integer minor units only — rejects floats. */
const amountCentsSchema = z.number().int().finite()

export const allocateCapitalParamsSchema = z
  .object({
    ...commonParamsFields,
    amountCents: amountCentsSchema.optional(),
  })
  .strict()

export const renegotiateCustomerParamsSchema = z
  .object({
    ...commonParamsFields,
    amountCents: amountCentsSchema.optional(),
  })
  .strict()

export const changeHeadcountPlanParamsSchema = z
  .object({
    ...commonParamsFields,
    headcountDelta: z.number().int().finite().optional(),
  })
  .strict()

export const setPricingPolicyParamsSchema = z
  .object({
    ...commonParamsFields,
    priceChangeBps: z.number().int().finite().optional(),
  })
  .strict()

export const startProjectParamsSchema = z
  .object({
    ...commonParamsFields,
    projectId: z.string().min(1).max(120).optional(),
    amountCents: amountCentsSchema.optional(),
  })
  .strict()

export const restructureOrganizationParamsSchema = z
  .object({
    ...commonParamsFields,
    orgChange: z.string().min(1).max(500).optional(),
  })
  .strict()

/** Generic bag for non-parameterized kinds (still strips unknown keys). */
export const genericActionParamsSchema = z
  .object({
    ...commonParamsFields,
  })
  .strict()

export type AllocateCapitalParams = z.infer<typeof allocateCapitalParamsSchema>
export type RenegotiateCustomerParams = z.infer<typeof renegotiateCustomerParamsSchema>
export type ChangeHeadcountPlanParams = z.infer<typeof changeHeadcountPlanParamsSchema>
export type SetPricingPolicyParams = z.infer<typeof setPricingPolicyParamsSchema>
export type StartProjectParams = z.infer<typeof startProjectParamsSchema>
export type RestructureOrganizationParams = z.infer<typeof restructureOrganizationParamsSchema>
export type GenericActionParams = z.infer<typeof genericActionParamsSchema>

const parameterizedSchemas: Record<ParameterizedActionKind, z.ZodTypeAny> = {
  allocate_capital: allocateCapitalParamsSchema,
  renegotiate_customer: renegotiateCustomerParamsSchema,
  change_headcount_plan: changeHeadcountPlanParamsSchema,
  set_pricing_policy: setPricingPolicyParamsSchema,
  start_project: startProjectParamsSchema,
  restructure_organization: restructureOrganizationParamsSchema,
}

export function paramsSchemaForKind(kind: ActionKind): z.ZodTypeAny {
  if (isParameterizedActionKind(kind)) return parameterizedSchemas[kind]
  return genericActionParamsSchema
}

export type NormalizeActionParamsResult = {
  params: ActionParams
  ambiguities: string[]
  ok: boolean
}

/**
 * Strip unknown fields; never invent missing values.
 * Invalid types → ok:false with ambiguity; partial but typed → ok:true.
 */
export function normalizeActionParams(kind: ActionKind, raw: unknown): NormalizeActionParamsResult {
  const schema = paramsSchemaForKind(kind)
  const parsed = schema.safeParse(raw ?? {})
  if (!parsed.success) {
    return {
      params: {},
      ambiguities: [`Parameter für ${kind} sind ungültig oder falsch typisiert.`],
      ok: false,
    }
  }
  return { params: parsed.data as ActionParams, ambiguities: [], ok: true }
}

export const actionKindSchema = z.enum([
  'allocate_capital',
  'change_hiring_policy',
  'change_headcount_plan',
  'set_pricing_policy',
  'renegotiate_customer',
  'accept_contract',
  'reject_contract',
  'prioritize_product',
  'start_project',
  'cancel_project',
  'request_analysis',
  'restructure_organization',
])

const managementActionBaseSchema = z.object({
  id: z.string().min(1).max(120),
  kind: actionKindSchema,
  label: z.string().min(1).max(180),
  sourceText: z.string().max(4000),
  schemaVersion: z.number().int().positive().default(ACTION_PARAMS_SCHEMA_VERSION),
  params: z.unknown().optional(),
})

export type ParseManagementActionResult =
  | { ok: true; action: ManagementAction; ambiguities: string[] }
  | { ok: false; ambiguities: string[] }

/**
 * Parse a single management action: defaults schemaVersion, normalizes params,
 * never invents amounts or other business fields.
 */
export function parseManagementAction(raw: unknown): ParseManagementActionResult {
  const base = managementActionBaseSchema.safeParse(raw)
  if (!base.success) {
    return { ok: false, ambiguities: ['Action-Struktur ist ungültig.'] }
  }
  const normalized = normalizeActionParams(base.data.kind, base.data.params ?? {})
  if (!normalized.ok) {
    return { ok: false, ambiguities: normalized.ambiguities }
  }
  const action: ManagementAction = {
    id: base.data.id,
    kind: base.data.kind,
    label: base.data.label,
    sourceText: base.data.sourceText,
    schemaVersion: base.data.schemaVersion,
    params: normalized.params,
  }
  return { ok: true, action, ambiguities: [] }
}

export const managementActionSchema = z.unknown().transform((raw, ctx) => {
  const result = parseManagementAction(raw)
  if (!result.ok) {
    for (const message of result.ambiguities) {
      ctx.addIssue({ code: 'custom', message })
    }
    return z.NEVER
  }
  return result.action
})

export const actionProposalSchema = z.object({
  actions: z.array(managementActionSchema).min(1).max(6),
  assumptions: z.array(z.string().max(500)).max(8),
  ambiguities: z.array(z.string().max(500)).max(8),
  extractedObjectives: z.array(z.string().max(120)).max(12),
  extractedRisks: z.array(z.string().max(120)).max(12),
  extractedAlternatives: z.array(z.string().max(120)).max(12),
  evidenceRefs: z.array(z.string().max(120)).max(24),
})

/** Fields that are typically expected for parameterized kinds when relevant. */
const KIND_AMOUNT_HINT: Partial<Record<ParameterizedActionKind, string>> = {
  allocate_capital: 'Betrag (amountCents) für Kapitalallokation fehlt oder ist unklar.',
  renegotiate_customer: 'Kunden-Ziel oder Verhandlungsbetrag ist unklar.',
  change_headcount_plan: 'Headcount-Delta ist unklar.',
  set_pricing_policy: 'Preisänderung (Basispunkte) ist unklar.',
  start_project: 'Projektumfang oder Budget ist unklar.',
  restructure_organization: 'Art der Organisationsänderung ist unklar.',
}

/**
 * Deterministic local extraction of params from German freitext.
 * Clear numeric amounts become integer cents; unclear amounts stay unset + ambiguity.
 */
export function inferParamsFromText(
  kind: ActionKind,
  text: string,
): { params: ActionParams; ambiguities: string[] } {
  const ambiguities: string[] = []
  const lower = text.toLowerCase()

  if (!isParameterizedActionKind(kind)) {
    return { params: {}, ambiguities }
  }

  const conditions = extractClause(text, /\b(?:nur wenn|nur bei|wenn|sofern|unter der bedingung)\b([^.;]+)/i)
  const fallback = extractClause(text, /\b(?:ansonsten|sonst|fallback|falls nicht|bei scheitern)\s*([^.;]*)/i)
  const scope = extractScope(text)
  const timingDays = extractTimingDays(text)
  const targetId = extractTargetId(text)

  let params: ActionParams = {}

  if (kind === 'allocate_capital' || kind === 'renegotiate_customer' || kind === 'start_project') {
    const money = extractAmountCents(text)
    if (money.status === 'clear') {
      params = { ...params, amountCents: money.amountCents }
    } else if (money.status === 'unclear' || mentionsMoneyWithoutNumber(lower)) {
      ambiguities.push(KIND_AMOUNT_HINT[kind] ?? 'Geldbetrag ist unklar.')
    } else if (kind === 'allocate_capital' && /kapital|budget|invest|capex|automatis/.test(lower)) {
      ambiguities.push(KIND_AMOUNT_HINT.allocate_capital!)
    }
  }

  if (kind === 'change_headcount_plan') {
    const delta = extractHeadcountDelta(text)
    if (delta.status === 'clear') {
      params = { ...params, headcountDelta: delta.value }
    } else {
      ambiguities.push(KIND_AMOUNT_HINT.change_headcount_plan!)
    }
  }

  if (kind === 'set_pricing_policy') {
    const bps = extractPriceChangeBps(text)
    if (bps.status === 'clear') {
      params = { ...params, priceChangeBps: bps.value }
    } else if (/preis|pricing|marge|rabatt/.test(lower)) {
      ambiguities.push(KIND_AMOUNT_HINT.set_pricing_policy!)
    }
  }

  if (kind === 'start_project') {
    const projectId = extractProjectId(text)
    if (projectId) params = { ...params, projectId }
  }

  if (kind === 'restructure_organization') {
    const orgChange = extractOrgChange(text)
    if (orgChange) {
      params = { ...params, orgChange }
    } else {
      ambiguities.push(KIND_AMOUNT_HINT.restructure_organization!)
    }
  }

  if (kind === 'renegotiate_customer' && !targetId && !/kunde|lidl|translog|vertrag|kondition/.test(lower)) {
    ambiguities.push('Kunden-Ziel (targetId) ist unklar.')
  }

  if (targetId) params = { ...params, targetId }
  if (scope) params = { ...params, scope }
  if (timingDays !== undefined) params = { ...params, timingDays }
  if (conditions) params = { ...params, conditions }
  if (fallback) params = { ...params, fallback }

  const normalized = normalizeActionParams(kind, params)
  return { params: normalized.params, ambiguities: [...ambiguities, ...normalized.ambiguities] }
}

type MoneyExtract =
  | { status: 'clear'; amountCents: number }
  | { status: 'unclear' }
  | { status: 'absent' }

function extractAmountCents(text: string): MoneyExtract {
  const vague = /\b(etwas|viel|wenig|angemessen|ausreichend|ungefähr|ca\.?|circa|etwa)\b/i.test(text)
    && !/\d/.test(text)
  if (vague) return { status: 'unclear' }

  const mio = text.match(
    /(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:mio\.?|millionen|million)\b/i,
  )
  if (mio?.[1]) {
    const millions = parseGermanDecimal(mio[1])
    if (millions === null) return { status: 'unclear' }
    return { status: 'clear', amountCents: Math.round(millions * 1_000_000) * 100 }
  }

  const thousand = text.match(
    /(\d{1,3}(?:[.\s]\d{3})+|\d+)\s*(?:€|eur|euro)\b/i,
  )
  if (thousand?.[1]) {
    const euros = parseGermanInteger(thousand[1])
    if (euros === null) return { status: 'unclear' }
    return { status: 'clear', amountCents: euros * 100 }
  }

  const kForm = text.match(/(\d{1,4})\s*k\s*(?:€|eur|euro)?\b/i)
  if (kForm?.[1]) {
    const thousands = Number.parseInt(kForm[1], 10)
    if (!Number.isFinite(thousands)) return { status: 'unclear' }
    return { status: 'clear', amountCents: thousands * 1_000 * 100 }
  }

  if (mentionsMoneyWithoutNumber(text.toLowerCase())) return { status: 'unclear' }
  return { status: 'absent' }
}

function mentionsMoneyWithoutNumber(lower: string): boolean {
  return /\b(budget|capex|invest|kapital|€|euro|eur)\b/.test(lower) && !/\d/.test(lower)
}

type IntExtract = { status: 'clear'; value: number } | { status: 'unclear' } | { status: 'absent' }

function extractHeadcountDelta(text: string): IntExtract {
  const abbau = text.match(
    /\b(?:abbau|reduzier|kündig|entlass)\w*\s+(?:um\s+)?(\d{1,5})\b/i,
  )
  if (abbau?.[1]) {
    return { status: 'clear', value: -Number.parseInt(abbau[1], 10) }
  }
  const aufbau = text.match(
    /\b(?:aufbau|einstell|hiring|stellen|mitarbeiter|fte|headcount)\w*.{0,24}?\b(\d{1,5})\b/i,
  )
  if (aufbau?.[1]) {
    return { status: 'clear', value: Number.parseInt(aufbau[1], 10) }
  }
  const plusMinus = text.match(/\b([+-]\d{1,5})\s*(?:fte|stellen|mitarbeiter|ma)?\b/i)
  if (plusMinus?.[1]) {
    return { status: 'clear', value: Number.parseInt(plusMinus[1], 10) }
  }
  if (/\b(headcount|stellen|fte|mitarbeiter|hiring|abbau)\b/i.test(text)) {
    return { status: 'unclear' }
  }
  return { status: 'absent' }
}

function extractPriceChangeBps(text: string): IntExtract {
  const percent = text.match(/([+-]?\d{1,3}(?:[.,]\d{1,2})?)\s*%/)
  if (percent?.[1]) {
    const value = parseGermanDecimal(percent[1])
    if (value === null) return { status: 'unclear' }
    return { status: 'clear', value: Math.round(value * 100) }
  }
  const bps = text.match(/([+-]?\d{1,5})\s*(?:bps|basispunkte?)\b/i)
  if (bps?.[1]) {
    return { status: 'clear', value: Number.parseInt(bps[1], 10) }
  }
  return { status: 'absent' }
}

function extractTimingDays(text: string): number | undefined {
  const months = text.match(/\b(?:in|innerhalb|nach)\s+(\d{1,3})\s*monat/i)
  if (months?.[1]) return Number.parseInt(months[1], 10) * 30
  const days = text.match(/\b(?:in|innerhalb|nach)\s+(\d{1,4})\s*(?:tagen|tag)\b/i)
  if (days?.[1]) return Number.parseInt(days[1], 10)
  const weeks = text.match(/\b(?:in|innerhalb|nach)\s+(\d{1,3})\s*wochen?\b/i)
  if (weeks?.[1]) return Number.parseInt(weeks[1], 10) * 7
  return undefined
}

function extractTargetId(text: string): string | undefined {
  const named = text.match(/\b(lidl|translog|aldi|rewe|metro)\b/i)
  if (named?.[1]) return named[1].toLowerCase()
  return undefined
}

function extractScope(text: string): string | undefined {
  const pilot = text.match(/\b(pilot|thüringen|werk\s*\d+|dach|enterprise|mid[- ]?market|premium)\b/i)
  if (pilot?.[1]) return pilot[1]
  return undefined
}

function extractProjectId(text: string): string | undefined {
  const named = text.match(/\b(automatisierung|ai[- ]?roadmap|plattform|dispatch|debottleneck(?:ing)?)\b/i)
  if (named?.[1]) return named[1].toLowerCase().replace(/\s+/g, '-')
  return undefined
}

function extractOrgChange(text: string): string | undefined {
  const match = text.match(
    /\b(zentralis\w*|dezentral\w*|span of control|führungsspanne|reorgan\w*|matrix|squads?|werke?\s*autonom\w*)\b/i,
  )
  return match?.[1]
}

function extractClause(text: string, pattern: RegExp): string | undefined {
  const match = text.match(pattern)
  const clause = match?.[1]?.trim()
  return clause && clause.length > 0 ? clause.slice(0, 1000) : undefined
}

function parseGermanDecimal(raw: string): number | null {
  const normalized = raw.replace(/\s/g, '').replace(',', '.')
  const value = Number.parseFloat(normalized)
  if (!Number.isFinite(value)) return null
  return value
}

function parseGermanInteger(raw: string): number | null {
  const digits = raw.replace(/[.\s]/g, '')
  if (!/^\d+$/.test(digits)) return null
  const value = Number.parseInt(digits, 10)
  return Number.isFinite(value) ? value : null
}

/** Ensure persisted / LLM actions always carry schemaVersion + params. */
export function ensureManagementAction(
  action: Omit<ManagementAction, 'schemaVersion' | 'params'> & {
    schemaVersion?: number
    params?: ActionParams
  },
): ManagementAction {
  const schemaVersion = action.schemaVersion ?? ACTION_PARAMS_SCHEMA_VERSION
  const normalized = normalizeActionParams(action.kind, action.params ?? {})
  return {
    id: action.id,
    kind: action.kind,
    label: action.label,
    sourceText: action.sourceText,
    schemaVersion,
    params: normalized.params,
  }
}
