import type { CSSProperties } from 'react'
import { PIN_COLORS } from '@/lib/theme'

export type PinData = {
  x: string
  y: string
  kind: keyof typeof PIN_COLORS
  label?: string
  pulse?: boolean
}

export function Pin({ x = '50%', y = '50%', kind = 'sight', label, pulse = false, size = 30 }: PinData & { size?: number }) {
  const c = PIN_COLORS[kind] || '#D97706'
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%,-100%)', filter: 'drop-shadow(0 3px 4px rgba(0,0,0,.25))' }}>
      {pulse && (
        <span
          style={{
            position: 'absolute', left: '50%', top: size * 0.34, width: size, height: size,
            transform: 'translate(-50%,-50%)', borderRadius: '50%', background: c, opacity: 0.35,
            animation: 'kumaPulse 2s ease-out infinite',
          }}
        />
      )}
      <div style={{ position: 'relative', width: size, height: size * 1.3 }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, width: size, height: size, borderRadius: '50% 50% 50% 0',
          transform: 'rotate(45deg)', background: c, boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.55)',
        }} />
        <div style={{ position: 'absolute', top: size * 0.16, left: 0, width: size, height: size * 0.68, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.42 }}>🐻</div>
      </div>
      {label && (
        <div style={{
          position: 'absolute', top: size * 1.3 + 2, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap',
          background: 'rgba(255,255,255,.95)', color: '#3a2a18', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 5, boxShadow: '0 1px 3px rgba(0,0,0,.18)',
        }}>{label}</div>
      )}
    </div>
  )
}

export default function MapField({
  h = 200,
  pins = [],
  land = '#1A2438',
  road = '#33405D',
  water = '#1E3344',
  radius = 16,
  className,
  style,
}: {
  h?: number
  pins?: PinData[]
  land?: string
  road?: string
  water?: string
  radius?: number
  className?: string
  style?: CSSProperties
}) {
  return (
    <div className={className} style={{ position: 'relative', height: h, borderRadius: radius, overflow: 'hidden', background: land, ...style }}>
      <div style={{
        position: 'absolute', inset: 0, background:
          `radial-gradient(120px 90px at 78% 22%, ${water} 0 60%, transparent 61%),
           radial-gradient(150px 110px at 14% 86%, ${water} 0 55%, transparent 56%),
           radial-gradient(90px 70px at 30% 24%, ${water} 0 60%, transparent 61%)`,
      }} />
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.9, background:
          `linear-gradient(90deg, transparent 0 18%, ${road} 18% 20.4%, transparent 20.4%),
           linear-gradient(0deg, transparent 0 42%, ${road} 42% 44.2%, transparent 44.2%),
           linear-gradient(115deg, transparent 0 60%, ${road} 60% 61.8%, transparent 61.8%)`,
      }} />
      {pins.map((p, i) => <Pin key={i} {...p} />)}
    </div>
  )
}
