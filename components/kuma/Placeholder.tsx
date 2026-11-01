import type { CSSProperties } from 'react'
import { theme } from '@/lib/theme'

export default function Placeholder({
  label = 'image',
  h = 160,
  tone = theme.sub,
  bg = theme.field,
  radius = 14,
  className,
  style,
}: {
  label?: string
  h?: number
  tone?: string
  bg?: string
  radius?: number
  className?: string
  style?: CSSProperties
}) {
  const stripe = `repeating-linear-gradient(135deg, ${tone}14 0 10px, transparent 10px 20px)`
  return (
    <div
      className={className}
      style={{
        height: h,
        borderRadius: radius,
        background: bg,
        backgroundImage: stripe,
        border: `1px dashed ${tone}55`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: tone,
        fontFamily: 'ui-monospace,Menlo,monospace',
        fontSize: 11.5,
        letterSpacing: '.04em',
        textAlign: 'center',
        padding: 12,
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {label}
    </div>
  )
}
