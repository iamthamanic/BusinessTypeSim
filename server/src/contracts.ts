/** Zod contracts mirrored for the Node API (same shapes as Edge contracts). */
import { z } from 'zod'

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

export const actionProposalSchema = z.object({
  actions: z.array(z.object({
    id: z.string().min(1).max(120),
    kind: actionKindSchema,
    label: z.string().min(1).max(180),
    sourceText: z.string().max(4000),
  })).min(1).max(6),
  assumptions: z.array(z.string().max(500)).max(8),
  ambiguities: z.array(z.string().max(500)).max(8),
  extractedObjectives: z.array(z.string().max(120)).max(12),
  extractedRisks: z.array(z.string().max(120)).max(12),
  extractedAlternatives: z.array(z.string().max(120)).max(12),
  evidenceRefs: z.array(z.string().max(120)).max(24),
})
