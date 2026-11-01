import { theme } from '@/lib/theme'

export default function Bear({
  size = 88,
  fur = theme.bear.fur,
  muzzle = theme.bear.muzzle,
  nose = '#2B1A10',
  eye = '#2B1A10',
  className,
}: {
  size?: number
  fur?: string
  muzzle?: string
  nose?: string
  eye?: string
  className?: string
}) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden="true">
      <circle cx="27" cy="27" r="15" fill={fur} />
      <circle cx="73" cy="27" r="15" fill={fur} />
      <circle cx="27" cy="27" r="7" fill={muzzle} />
      <circle cx="73" cy="27" r="7" fill={muzzle} />
      <circle cx="50" cy="55" r="34" fill={fur} />
      <ellipse cx="50" cy="67" rx="19" ry="15" fill={muzzle} />
      <circle cx="38" cy="48" r="4" fill={eye} />
      <circle cx="62" cy="48" r="4" fill={eye} />
      <ellipse cx="50" cy="60" rx="6.5" ry="5" fill={nose} />
    </svg>
  )
}
