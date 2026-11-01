// テーマC「防災速報アラート」の共通トークン・定数
// 配色は src/app/globals.css の @theme (--color-kuma-*) と対応させている

export const theme = {
  bg: '#0C1322',
  card: '#141E33',
  panel: '#1B2740',
  ink: '#E8EDF6',
  sub: '#93A1BC',
  faint: '#6B7A98',
  line: '#26324D',
  primary: '#F5A524',
  primaryText: '#0C1322',
  accent: '#FF4D4D',
  line2: '#06C755',
  danger: '#FF4D4D',
  field: '#0F1830',
  mapLand: '#1A2438',
  mapWater: '#1E3344',
  mapRoad: '#33405D',
  bear: { fur: '#C98A3A', muzzle: '#F0D6AE' },
} as const

// 出没ステータスのフィルタ定義（地図・LP等の状態ピルで使用）
export const STATES = [
  { key: 'all', label: '全て', emoji: '', color: '#8a8a8a' },
  { key: 'emg', label: '緊急', emoji: '🆘', color: '#EF4444' },
  { key: 'sight', label: '目撃情報', emoji: '🐻', color: '#D97706' },
  { key: 'resp', label: '対応中', emoji: '🚨', color: '#3B82F6' },
  { key: 'secured', label: '確保・駆除済み', emoji: '✅', color: '#10B981' },
] as const

// MapField/Pin で使うステータス別の色
export const PIN_COLORS: Record<string, string> = {
  sight: '#D97706',
  resp: '#3B82F6',
  secured: '#10B981',
  culled: '#6B7280',
  emg: '#EF4444',
}

// 通知が届く連鎖（/ と /notify で共通利用）
export const NOTIFY_CHAIN: { emoji: string; label: string; desc: string }[] = [
  { emoji: '📍', label: 'あなた', desc: '見かけたら投稿' },
  { emoji: '👨‍👩‍👧', label: '身内・ご近所', desc: 'すぐ知らせ合う' },
  { emoji: '🏫', label: '学校・自治体', desc: '初動対応の参考情報も' },
  { emoji: '👮', label: '管轄の警察', desc: '一報を共有' },
  { emoji: '🎯', label: '地域の猟友会', desc: '現場対応へ' },
]
