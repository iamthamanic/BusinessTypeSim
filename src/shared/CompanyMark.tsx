/** Company scenario mark + industry cover assets from public/brand. */
import type { ScenarioId } from '../domain'

const COMPANY_ICON: Record<ScenarioId, { src: string; label: string }> = {
  'nexora-saas': { src: '/brand/companies/nexora-saas.png?v=5', label: 'Nexora' },
  'nordkern-foods': { src: '/brand/companies/nordkern-foods.png?v=5', label: 'Nordkern Foods' },
  'klarwerk-services': { src: '/brand/companies/klarwerk-services.png?v=5', label: 'Klarwerk Consulting' },
  'heliora-clinic': { src: '/brand/companies/heliora-clinic.png?v=5', label: 'Askolep Klinikgruppe' },
  'marktwerk-marketplace': { src: '/brand/companies/marktwerk-marketplace.png?v=5', label: 'Marktwerk' },
  'stromfeld-energy': { src: '/brand/companies/stromfeld-energy.png?v=5', label: 'Stromfeld Energy' },
  'urbanfit-retail': { src: '/brand/companies/urbanfit-retail.png?v=5', label: 'Urbanatics' },
}

const COMPANY_COVER: Record<ScenarioId, string> = {
  'nexora-saas': '/brand/covers/nexora-saas.png?v=1',
  'nordkern-foods': '/brand/covers/nordkern-foods.png?v=1',
  'klarwerk-services': '/brand/covers/klarwerk-services.png?v=1',
  'heliora-clinic': '/brand/covers/heliora-clinic.png?v=1',
  'marktwerk-marketplace': '/brand/covers/marktwerk-marketplace.png?v=1',
  'stromfeld-energy': '/brand/covers/stromfeld-energy.png?v=1',
  'urbanfit-retail': '/brand/covers/urbanfit-retail.png?v=1',
}

export function companyIconSrc(id: ScenarioId): string {
  return COMPANY_ICON[id].src
}

/** Short header label for room chrome (first token of brand label). */
export function companyShortLabel(id: ScenarioId): string {
  return COMPANY_ICON[id].label.split(/\s+/)[0] ?? COMPANY_ICON[id].label
}

export function companyCoverSrc(id: ScenarioId): string {
  return COMPANY_COVER[id]
}

export function CompanyMark({
  id,
  size = 64,
  className = '',
}: {
  id: ScenarioId
  size?: number
  className?: string
}) {
  const icon = COMPANY_ICON[id]
  return (
    <img
      className={`company-mark${className ? ` ${className}` : ''}`}
      src={icon.src}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      title={icon.label}
    />
  )
}
