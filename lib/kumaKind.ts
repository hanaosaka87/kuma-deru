export type FeedItem = {
  id: number
  area: string | null
  status: string
  urgent: boolean
  sighted_at: string
}

export const KIND_STYLE: Record<string, { emoji: string; label: string; color: string }> = {
  emg: { emoji: '🆘', label: '緊急', color: '#FF4D4D' },
  sight: { emoji: '🐻', label: '目撃', color: '#F5A524' },
  resp: { emoji: '🚨', label: '対応中', color: '#5B9BFF' },
  secured: { emoji: '✅', label: '確保', color: '#3DDC97' },
}

export function kindOf(s: FeedItem): keyof typeof KIND_STYLE {
  if (s.urgent) return 'emg'
  if (s.status === '対応中') return 'resp'
  if (s.status === '確保済み' || s.status === '駆除済み') return 'secured'
  return 'sight'
}
