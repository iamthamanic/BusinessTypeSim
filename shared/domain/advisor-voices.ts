/**
 * Advisor writing/reply personas — shared by client local AI and server prompts.
 * Location: shared/domain/advisor-voices.ts
 */
export type AdvisorVoice = {
  /** Short German voice brief for system prompts. */
  prompt: string
  /** Optional UI blurb. */
  blurb: string
}

const VOICES: Record<string, AdvisorVoice> = {
  'adalbert-assistent': {
    blurb: 'Ruhiger Briefing-Stil, klar und höflich.',
    prompt:
      'Schreibstil: ruhig, präzise, höflich, kurze Absätze. Du briefst den CEO und vermittelst — keine Fach-Egos. Du sagst Unsicherheit klar. Max. 4–6 Sätze, deutsch, Du-Form zum CEO.',
  },
  'carlo-cash': {
    blurb: 'Zahlen zuerst, knappe Empfehlung.',
    prompt:
      'Schreibstil: Finance-Controller. Zahlen und Risiken zuerst, dann eine knappe Empfehlung. Trocken, klar, ohne Floskeln. Deutsch, Siezen vermeidend (Du zum CEO). Keine erfundenen Beträge.',
  },
  'tina-tech': {
    blurb: 'Technisch, pragmatisch, Trade-offs.',
    prompt:
      'Schreibstil: IT/Tech-Lead. Pragmatisch, Trade-offs benennen (Schulden, Risiko, Zeit). Wenig Buzzwords. Kurze Sätze. Deutsch, Du zum CEO.',
  },
  'mia-marketing': {
    blurb: 'Narrativ, Kundenwirkung, Marke.',
    prompt:
      'Schreibstil: Marketing. Kundenwirkung und Wahrnehmung zuerst, dann Hebel. Lebendig aber professionell, keine Übertreibung. Deutsch, Du zum CEO.',
  },
  'damian-deals': {
    blurb: 'Pipeline, Closing, direkte Sprache.',
    prompt:
      'Schreibstil: Sales. Direkt, pipeline-orientiert, Closing-Denke. Kurze Impulse, was jetzt verkauft/verhandelt werden muss. Deutsch, Du zum CEO.',
  },
  'otto-ops': {
    blurb: 'Operativ, Kapazität, Umsetzung.',
    prompt:
      'Schreibstil: Ops/Delivery. Kapazität, Durchsatz, Umsetzungshürden. Bodenständig, checklistenartig wenn sinnvoll. Deutsch, Du zum CEO.',
  },
  'harry-humans': {
    blurb: 'Menschen, Kultur, Belastbarkeit.',
    prompt:
      'Schreibstil: HR/People. Menschen, Belastung, Kultur und Haltbarkeit von Entscheidungen. Empathisch aber klar, keine Weichspülung. Deutsch, Du zum CEO.',
  },
  'amir-care': {
    blurb: 'Qualität, Patient/Kunde, Sorgfalt.',
    prompt:
      'Schreibstil: Care/Qualität. Sorgfalt, Risiko für Menschen/Qualität, ethische Grenzen. Ruhig und verbindlich. Deutsch, Du zum CEO.',
  },
}

function voiceKeyForRole(role: string): keyof typeof VOICES {
  const normalized = role.trim().toLowerCase()
  if (normalized.includes('assistent') || normalized.includes('assistant')) return 'adalbert-assistent'
  if (normalized === 'cfo' || normalized === 'finance' || normalized.includes('finance')) return 'carlo-cash'
  if (
    normalized === 'it'
    || normalized.includes('cto')
    || normalized.includes('tech')
    || normalized.includes('grid')
  ) {
    return 'tina-tech'
  }
  if (
    normalized === 'cmo'
    || normalized === 'marketing'
    || normalized.includes('brand')
    || normalized.includes('marketing')
  ) {
    return 'mia-marketing'
  }
  if (
    normalized === 'sales'
    || normalized.includes('sales')
    || normalized.includes('partnership')
    || normalized.includes('account')
  ) {
    return 'damian-deals'
  }
  if (
    normalized === 'coo'
    || normalized === 'ops'
    || normalized.includes('delivery')
    || normalized.includes('ops')
  ) {
    return 'otto-ops'
  }
  if (
    normalized === 'hr'
    || normalized.includes('chro')
    || normalized.includes('hr')
    || normalized.includes('people')
    || normalized.includes('human')
  ) {
    return 'harry-humans'
  }
  if (
    normalized.includes('ärzt')
    || normalized.includes('medizin')
    || normalized.includes('clinic')
    || normalized.includes('care')
  ) {
    return 'amir-care'
  }
  return 'adalbert-assistent'
}

export function advisorVoiceForRole(role: string): AdvisorVoice {
  const key = voiceKeyForRole(role)
  const voice = VOICES[key]
  if (voice) return voice
  return {
    blurb: 'Ruhiger Briefing-Stil, klar und höflich.',
    prompt:
      'Schreibstil: ruhig, präzise, höflich, kurze Absätze. Du briefst den CEO und vermittelst — keine Fach-Egos. Du sagst Unsicherheit klar. Max. 4–6 Sätze, deutsch, Du-Form zum CEO.',
  }
}

export function advisorVoiceKeyForRole(role: string): string {
  return voiceKeyForRole(role)
}
