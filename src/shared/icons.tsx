/** Shared SVG icons for mobile nav and action rows — used across feature screens. */
export function IconHome({ active = false }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.18 : 0} />
    </svg>
  )
}

export function IconCompany({ active = false }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20V8.5L12 4l8 4.5V20" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 20v-5h6v5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.18 : 0} />
    </svg>
  )
}

export function IconDecision({ active = false }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.18 : 0} />
      <path d="M12 8v4l2.5 2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

export function IconTeam({ active = false }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.7" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.18 : 0} />
      <circle cx="16" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4.5 19c.8-2.4 2.7-3.5 4.5-3.5S12.7 16.6 13.5 19M14 15.5c1.4 0 2.9.7 3.5 2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

export function IconLedger({ active = false }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 4h10a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
      <path d="M9 9h6M9 13h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

export function IconChevron() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
