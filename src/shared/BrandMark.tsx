/**
 * Business Type brand mark — exact reference asset (PNG), used across the app shell.
 * Location: src/shared/BrandMark.tsx
 */
type BrandMarkProps = {
  size?: number | string
  className?: string
  title?: string
}

export function BrandMark({
  size = 48,
  className = '',
  title = 'Business Type',
}: BrandMarkProps) {
  const dim = typeof size === 'number' ? `${size}px` : size
  return (
    <img
      src="/brand/bt-icon.png"
      width={typeof size === 'number' ? size : undefined}
      height={typeof size === 'number' ? size : undefined}
      alt={title}
      className={`brand-mark-img ${className}`.trim()}
      style={{ width: dim, height: dim }}
      decoding="async"
    />
  )
}
