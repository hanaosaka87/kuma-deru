'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Header from '@/components/kuma/Header'

type TimelineItem = {
  id: number
  area: string | null
  status: string
  urgent: boolean
  photo_url: string | null
  ai_size_estimate: string | null
  source: string
  sighted_at: string
}

const KIND_STYLE: Record<string, { emoji: string; label: string; color: string }> = {
  emg: { emoji: '🆘', label: '緊急', color: '#FF4D4D' },
  sight: { emoji: '🐻', label: '目撃', color: '#F5A524' },
  resp: { emoji: '🚨', label: '対応中', color: '#5B9BFF' },
  secured: { emoji: '✅', label: '確保', color: '#3DDC97' },
}

function kindOf(s: TimelineItem): keyof typeof KIND_STYLE {
  if (s.urgent) return 'emg'
  if (s.status === '対応中') return 'resp'
  if (s.status === '確保済み' || s.status === '駆除済み') return 'secured'
  return 'sight'
}

const SOURCE_LABEL: Record<string, string> = {
  news_auto: '📰 ニュース自動',
  x_auto: '🐦 X自動',
}

export default function TimelinePage() {
  const [items, setItems] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('bear_sightings')
      .select('id, area, status, urgent, photo_url, ai_size_estimate, source, sighted_at')
      .order('sighted_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setItems((data ?? []) as TimelineItem[])
        setLoading(false)
      })

    // 新規投稿をリアルタイムでタイムライン先頭に反映する（/mapのRealtime購読と同じテーブル・イベント）
    const channel = supabase
      .channel('bear-timeline-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bear_sightings' },
        (payload) => {
          const newItem = payload.new as TimelineItem
          setItems(prev => (prev.some(i => i.id === newItem.id) ? prev : [newItem, ...prev]))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <main className="min-h-screen bg-kuma-bg text-kuma-ink">
      <Header title="タイムライン" icon="📰" />

      <div className="max-w-2xl mx-auto px-5 lg:px-0 py-6">
        <div className="flex items-center gap-2 text-xs font-extrabold tracking-[.14em] text-kuma-primary font-mono mb-1">
          <span className="w-2 h-2 rounded-full bg-kuma-line2 animate-pulse" />REAL-TIME TIMELINE
        </div>
        <p className="text-xs text-kuma-sub leading-relaxed mb-5">
          全国の目撃情報を時系列で流し見できます。新規投稿は自動でリアルタイム反映されます。位置関係を確認したい場合は
          <Link href="/map" className="text-kuma-primary font-bold underline mx-1">地図表示</Link>
          もご利用ください。
        </p>

        {loading ? (
          <p className="text-center text-kuma-faint text-sm py-10">読み込み中...</p>
        ) : items.length === 0 ? (
          <p className="text-center text-kuma-faint text-sm py-10">まだ目撃情報がありません</p>
        ) : (
          <div className="bg-kuma-card rounded-2xl border border-kuma-line overflow-hidden">
            {items.map((s, i) => {
              const k = KIND_STYLE[kindOf(s)]
              return (
                <Link
                  key={s.id}
                  href="/map"
                  className={`flex items-center gap-3 px-4 py-3.5 hover:bg-kuma-panel transition-colors ${i < items.length - 1 ? 'border-b border-kuma-line' : ''}`}
                >
                  {s.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.photo_url} alt="目撃写真" className="w-11 h-11 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-lg bg-kuma-field flex items-center justify-center text-lg shrink-0">🐻</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13.5px] font-bold truncate">{s.area || '場所未設定'}</span>
                      <span
                        className="text-[10px] font-extrabold rounded px-1.5 py-0.5 border shrink-0"
                        style={{ color: k.color, background: `${k.color}1f`, borderColor: `${k.color}66` }}
                      >
                        {k.emoji} {k.label}
                      </span>
                      {SOURCE_LABEL[s.source] && (
                        <span className="text-[10px] text-kuma-faint border border-kuma-line rounded px-1.5 py-0.5 shrink-0">{SOURCE_LABEL[s.source]}</span>
                      )}
                    </div>
                    {s.ai_size_estimate && <p className="text-[11px] text-kuma-primary mt-0.5 truncate">🤖 {s.ai_size_estimate}</p>}
                  </div>
                  <span className="text-[11px] text-kuma-faint font-mono shrink-0">
                    {new Date(s.sighted_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
