'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  extractPrefecture, isWithinDays, calcRiskLevel, estimateActivityLevel,
  RISK_LEVEL_STYLE, ACTIVITY_LEVEL_STYLE, type RiskLevel, type ActivityLevel,
} from '@/lib/prefectures'
import { KIND_STYLE, kindOf, type FeedItem } from '@/lib/kumaKind'
import { MY_AREAS_STORAGE_KEY, matchesMyAreas } from '@/lib/myAreas'
import MapField, { type PinData } from './MapField'

type MyAreaSighting = FeedItem & { prefecture: string | null }

const PANEL_SPREAD = [
  { x: '30%', y: '35%' }, { x: '65%', y: '25%' }, { x: '72%', y: '65%' },
  { x: '42%', y: '78%' }, { x: '55%', y: '46%' },
]

function relativeTimeLabel(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffH = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffH < 1) return 'たった今'
  if (diffH < 24) return `${diffH}時間前`
  return `${Math.floor(diffH / 24)}日前`
}

function StatusBadge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span
      className="text-[10.5px] font-extrabold rounded px-1.5 py-0.5 whitespace-nowrap"
      style={{ color, background: bg }}
    >
      {label}
    </span>
  )
}

export default function MyAreaPanel({ variant }: { variant: 'desktop' | 'mobile' }) {
  const [myAreas, setMyAreas] = useState<string[] | null>(null)
  const [sightings, setSightings] = useState<MyAreaSighting[]>([])
  const myAreasRef = useRef<string[]>([])

  useEffect(() => {
    // SSRとクライアント初回描画を一致させるため、localStorage読み込みは必ずマウント後に行う
    let stored: string[] = []
    try {
      stored = JSON.parse(localStorage.getItem(MY_AREAS_STORAGE_KEY) || '[]')
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- クライアント専用データ(localStorage)の初回読み込みのため
    setMyAreas(stored)
    myAreasRef.current = stored
  }, [])

  useEffect(() => {
    if (!myAreas || myAreas.length === 0) return

    const prefectures = Array.from(
      new Set(myAreas.map(extractPrefecture).filter((p): p is string => !!p))
    )
    if (prefectures.length === 0) return

    supabase
      .from('bear_sightings')
      .select('id, area, status, urgent, sighted_at, prefecture')
      .in('prefecture', prefectures)
      .order('sighted_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (!data) return
        setSightings(data.filter(s => matchesMyAreas(s.area, myAreas)))
      })

    const channel = supabase
      .channel(`kuma-my-area-live-${variant}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bear_sightings' },
        (payload) => {
          const s = payload.new as MyAreaSighting
          if (!matchesMyAreas(s.area, myAreasRef.current)) return
          setSightings(prev => (prev.some(p => p.id === s.id) ? prev : [s, ...prev]))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [myAreas])

  if (myAreas === null) return null

  const h = variant === 'desktop' ? 150 : 100

  if (myAreas.length === 0) {
    return (
      <Link
        href="/notify"
        className="flex items-center gap-3 rounded-2xl border border-kuma-line bg-kuma-card px-4 py-4 transition-colors hover:border-kuma-primary"
        style={{ height: h }}
      >
        <span className="text-2xl shrink-0">🔔</span>
        <div className="min-w-0">
          <p className="text-[13px] font-extrabold text-kuma-ink leading-snug">
            あなたのエリアを登録すると
          </p>
          <p className="text-[13px] font-extrabold text-kuma-primary leading-snug">
            ここにリアルタイム情報が表示されます →
          </p>
        </div>
      </Link>
    )
  }

  const urgentCount = sightings.filter(s => s.urgent).length
  const recent30 = sightings.filter(s => isWithinDays(s.sighted_at, 30)).length
  const risk: RiskLevel = calcRiskLevel(recent30)
  const activity: ActivityLevel = estimateActivityLevel(recent30)
  const lastSighting = sightings[0]
  const pins: PinData[] = sightings.slice(0, 5).map((s, i) => ({
    ...PANEL_SPREAD[i % PANEL_SPREAD.length],
    kind: kindOf(s),
    pulse: s.urgent,
  }))

  return (
    <div className="rounded-2xl border border-kuma-line overflow-hidden">
      {/* 自分のエリアの状況（テスターフィードバック対応・2026-09-22：ひと目でわかる状況表示を追加） */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-kuma-card border-b border-kuma-line">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm shrink-0">📍</span>
          <span className="text-[12px] font-extrabold text-kuma-ink truncate">
            {myAreas[0]}{myAreas.length > 1 ? ` 他${myAreas.length - 1}件` : ''}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <StatusBadge label={`リスク${risk}`} color={RISK_LEVEL_STYLE[risk].color} bg={RISK_LEVEL_STYLE[risk].bg} />
          <StatusBadge label={`出没${activity}`} color={ACTIVITY_LEVEL_STYLE[activity].color} bg={ACTIVITY_LEVEL_STYLE[activity].bg} />
        </div>
      </div>

      <Link href="/map" className="block relative overflow-hidden group">
        <MapField h={h} radius={0} pins={pins} />
        {sightings.length > 0 && (
          <div className="absolute top-2.5 right-2.5 bg-kuma-card/95 border border-kuma-line rounded-lg px-2.5 py-1.5">
            <span className="text-[11px] font-extrabold" style={{ color: urgentCount > 0 ? KIND_STYLE.emg.color : 'var(--color-kuma-ink)' }}>
              30日 {sightings.length}件{urgentCount > 0 ? `・緊急${urgentCount}` : ''}
            </span>
          </div>
        )}
        {sightings.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[12px] font-bold text-kuma-faint bg-kuma-card/90 border border-kuma-line rounded-full px-3 py-1.5">
              現在、登録エリアでの出没報告はありません
            </span>
          </div>
        )}
      </Link>

      {/* 最終目撃・詳細への導線 */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-kuma-panel text-[11px] text-kuma-sub">
        <span>{lastSighting ? `最終目撃：${relativeTimeLabel(lastSighting.sighted_at)}` : '直近30日の目撃報告はありません'}</span>
        <Link href="/areas" className="font-bold text-kuma-primary hover:opacity-80 transition-opacity">地域別の詳細を見る →</Link>
      </div>
    </div>
  )
}
