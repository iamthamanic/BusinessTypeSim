export function formatMoney(cents: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    notation: Math.abs(cents) >= 100_000_000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(cents / 100)
}

export function formatPercent(bps: number): string {
  return `${(bps / 100).toFixed(0)} %`
}

export function formatDeltaPercent(ratio: number): string {
  const pct = Math.round(ratio * 100)
  if (pct === 0) return '0 %'
  return `${pct > 0 ? '+' : ''}${pct} %`
}

export function estimateRunwayMonths(cashCents: number, ebitdaAnnualCents: number): number {
  const monthlyBurn = ebitdaAnnualCents < 0 ? Math.abs(ebitdaAnnualCents) / 12 : cashCents / 24
  if (monthlyBurn <= 0) return 36
  return Math.max(1, Math.round(cashCents / monthlyBurn))
}

/** Deterministic faux quarterly trend for charts (display only, not game truth). */
export function buildTrendSeries(seed: string, current: number): number[] {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  const points = [0.82, 0.88, 0.94, 1]
  return points.map((factor, index) => {
    const wobble = ((hash >> (index * 3)) & 7) / 100
    return Math.round(current * (factor - 0.04 + wobble))
  })
}
