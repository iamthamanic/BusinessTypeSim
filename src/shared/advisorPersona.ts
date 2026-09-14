/**
 * Stable advisor display names, departments + portrait assets for Room / Team UI.
 * Location: src/shared/advisorPersona.ts
 */
import { advisorVoiceForRole } from '../domain'

export type AdvisorPersona = {
  name: string
  /** Short department label shown in People list (Finance, IT, …). */
  dept: string
  portraitSrc: string
  /** How they write / reply. */
  voiceBlurb: string
}

const PERSONAS = {
  'adalbert-assistent': {
    name: 'Adalbert Assistent',
    dept: 'Assistent',
    portraitSrc: '/brand/people/adalbert-assistent.png?v=2',
  },
  'carlo-cash': {
    name: 'Carlo Cash',
    dept: 'Finance',
    portraitSrc: '/brand/people/carlo-cash.png',
  },
  'tina-tech': {
    name: 'Tina Tech',
    dept: 'IT',
    portraitSrc: '/brand/people/tina-tech.png',
  },
  'mia-marketing': {
    name: 'Mia Marketing',
    dept: 'Marketing',
    portraitSrc: '/brand/people/mia-marketing.png',
  },
  'damian-deals': {
    name: 'Damian Deals',
    dept: 'Sales',
    portraitSrc: '/brand/people/damian-deals.png',
  },
  'otto-ops': {
    name: 'Otto Ops',
    dept: 'Ops',
    portraitSrc: '/brand/people/otto-ops.png',
  },
  'harry-humans': {
    name: 'Harry Humans',
    dept: 'HR',
    portraitSrc: '/brand/people/hanna-hr.png',
  },
  'amir-care': {
    name: 'Amir Care',
    dept: 'Care',
    portraitSrc: '/brand/people/amir-care.png',
  },
} as const

type PersonaKey = keyof typeof PERSONAS

function personaKeyForRole(role: string): PersonaKey {
  const normalized = role.trim().toLowerCase()
  if (normalized.includes('assistent') || normalized.includes('assistant')) return 'adalbert-assistent'
  if (
    normalized === 'cfo' ||
    normalized === 'finance' ||
    normalized.includes('finance')
  ) {
    return 'carlo-cash'
  }
  if (
    normalized === 'it' ||
    normalized.includes('cto') ||
    normalized.includes('tech') ||
    normalized.includes('grid')
  ) {
    return 'tina-tech'
  }
  if (
    normalized === 'cmo' ||
    normalized === 'marketing' ||
    normalized.includes('brand') ||
    normalized.includes('marketing')
  ) {
    return 'mia-marketing'
  }
  if (
    normalized === 'sales' ||
    normalized.includes('sales') ||
    normalized.includes('partnership') ||
    normalized.includes('account')
  ) {
    return 'damian-deals'
  }
  if (
    normalized === 'coo' ||
    normalized === 'ops' ||
    normalized.includes('delivery') ||
    normalized.includes('ops')
  ) {
    return 'otto-ops'
  }
  if (
    normalized === 'hr' ||
    normalized.includes('chro') ||
    normalized.includes('hr') ||
    normalized.includes('people') ||
    normalized.includes('human')
  ) {
    return 'harry-humans'
  }
  if (normalized.includes('ärzt') || normalized.includes('medizin') || normalized.includes('clinic') || normalized.includes('care')) {
    return 'amir-care'
  }
  return 'adalbert-assistent'
}

/** Fixed roster names/portraits by role — same person across all scenarios. */
export function advisorPersona(role: string): AdvisorPersona {
  const key = personaKeyForRole(role)
  const base = PERSONAS[key]
  return {
    ...base,
    voiceBlurb: advisorVoiceForRole(role).blurb,
  }
}

/** Stable persona key for role matching (CTO and IT both → tina-tech). */
export function advisorPersonaKey(role: string): string {
  return personaKeyForRole(role)
}

export function listAdvisorPersonas(): AdvisorPersona[] {
  return (Object.keys(PERSONAS) as PersonaKey[]).map((key) => advisorPersona(key.replace(/-/g, ' ')))
}

/** Match a house dept label onto a world department name. */
export function matchDepartmentId(
  departments: Array<{ id: string; name: string }>,
  deptLabel: string,
): string | undefined {
  const label = deptLabel.trim().toLowerCase()
  if (!label || label === 'assistent') return undefined
  const hit = departments.find((dept) => {
    const name = dept.name.toLowerCase()
    if (label === 'it') return /it|eng|tech|platform/.test(name)
    if (label === 'finance') return /finance|finanz|controlling/.test(name)
    if (label === 'sales') return /sales|vertrieb|partnership|account/.test(name)
    if (label === 'marketing') return /market|brand|cmo/.test(name)
    if (label === 'hr') return /\bhr\b|people|human|personal/.test(name)
    if (label === 'ops') return /ops|operation|delivery|produktion/.test(name)
    if (label === 'care') return /care|medizin|klinik|ärzt/.test(name)
    return name.includes(label)
  })
  return hit?.id
}

/** Resolve first @Name mention against scenario advisors (persona display names). */
export function resolveAdvisorMention(
  text: string,
  advisors: Array<{ id: string; role: string }>,
): string | null {
  const lowered = text.toLowerCase()
  const ranked = [...advisors]
    .map((advisor) => ({ advisor, name: advisorPersona(advisor.role).name }))
    .sort((a, b) => b.name.length - a.name.length)

  for (const entry of ranked) {
    const mention = `@${entry.name}`.toLowerCase()
    if (lowered.includes(mention)) return entry.advisor.id
  }

  for (const entry of ranked) {
    const first = entry.name.split(/\s+/)[0]
    if (!first) continue
    const mention = `@${first}`.toLowerCase()
    const re = new RegExp(`${escapeRegExp(mention)}(?![\\p{L}\\p{N}_])`, 'iu')
    if (re.test(text)) return entry.advisor.id
  }

  return null
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
