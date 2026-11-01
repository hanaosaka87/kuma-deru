'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import type { RouteSighting, RouteAnalysis } from '@/lib/analyzeRoute'
import { groupMatches, type MatchPair } from '@/lib/groupIndividualMatches'
import { getMyAreas } from '@/lib/myAreas'
import { extractPrefecture, getPrefectureCoords } from '@/lib/prefectures'

type Group = {
  sightings: RouteSighting[]
  estimate: { lat: number; lng: number } | null
  analysis: RouteAnalysis
}

const HOURS_OPTIONS = [12, 24, 48, 72] as const

export default function TrackingPage() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const polylinesRef = useRef<google.maps.Polyline[]>([])
  const estimateMarkerRef = useRef<google.maps.Marker | null>(null)

  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroupIdx, setSelectedGroupIdx] = useState(0)
  const [hours, setHours] = useState<number>(24)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'route' | 'individual'>('route')

  const clearMap = () => {
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []
    polylinesRef.current.forEach((p) => p.setMap(null))
    polylinesRef.current = []
    if (estimateMarkerRef.current) {
      estimateMarkerRef.current.setMap(null)
      estimateMarkerRef.current = null
    }
  }

  const drawGroup = useCallback((group: Group) => {
    const map = mapInstanceRef.current
    if (!map) return
    clearMap()

    const { sightings, estimate } = group
    const bounds = new google.maps.LatLngBounds()

    // 時系列番号マーカー
    sightings.forEach((s, i) => {
      const isLast = i === sightings.length - 1
      const marker = new google.maps.Marker({
        position: { lat: s.lat, lng: s.lng },
        map,
        label: {
          text: String(i + 1),
          color: '#000',
          fontWeight: 'bold',
          fontSize: '13px',
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 16,
          fillColor: isLast ? '#FF4D4D' : '#F5A524',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
        title: `[${i + 1}] ${new Date(s.sighted_at).toLocaleString('ja-JP')} / ${s.area ?? ''}${s.urgent ? ' 【緊急】' : ''}`,
        zIndex: 10 + i,
      })
      markersRef.current.push(marker)
      bounds.extend({ lat: s.lat, lng: s.lng })
    })

    // 移動ルートのポリライン
    if (sightings.length >= 2) {
      const path = sightings.map((s) => ({ lat: s.lat, lng: s.lng }))
      const polyline = new google.maps.Polyline({
        path,
        map,
        strokeColor: '#F5A524',
        strokeOpacity: 0.85,
        strokeWeight: 3,
        icons: [
          {
            icon: {
              path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 3,
              strokeColor: '#F5A524',
            },
            offset: '100%',
            repeat: '80px',
          },
        ],
      })
      polylinesRef.current.push(polyline)
    }

    // 推定現在地マーカー（点滅アニメ風）
    if (estimate) {
      const estMarker = new google.maps.Marker({
        position: { lat: estimate.lat, lng: estimate.lng },
        map,
        title: 'AI推定現在地',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: '#00E5FF',
          fillOpacity: 0.9,
          strokeColor: '#fff',
          strokeWeight: 3,
        },
        label: {
          text: '？',
          color: '#fff',
          fontWeight: 'bold',
          fontSize: '12px',
        },
        zIndex: 100,
      })
      estimateMarkerRef.current = estMarker
      bounds.extend({ lat: estimate.lat, lng: estimate.lng })
    }

    map.fitBounds(bounds, 80)
  }, [])

  const fetchAndAnalyze = useCallback(async () => {
    setLoading(true)
    setError(null)
    setGroups([])

    const since = new Date(Date.now() - hours * 3_600_000).toISOString()
    const { data, error: dbErr } = await supabase
      .from('bear_sightings')
      .select('id, lat, lng, area, prefecture, sighted_at, description, urgent')
      .gte('sighted_at', since)
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .order('sighted_at', { ascending: true })

    if (dbErr) {
      setError('データ取得に失敗しました')
      setLoading(false)
      return
    }

    if (!data || data.length < 2) {
      setError(`直近${hours}時間の目撃情報が2件未満のため分析できません`)
      setLoading(false)
      return
    }

    const res = await fetch('/api/analyze-route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sightings: data }),
    })

    if (!res.ok) {
      const j = await res.json()
      setError(j.error ?? 'AI分析に失敗しました')
      setLoading(false)
      return
    }

    const json = await res.json()
    const fetched: Group[] = json.groups ?? []
    setGroups(fetched)
    setSelectedGroupIdx(0)
    setLoading(false)

    if (fetched.length > 0) {
      drawGroup(fetched[0])
    }
  }, [hours, drawGroup])

  // Google Maps 初期化
  useEffect(() => {
    const init = () => {
      if (!mapRef.current || mapInstanceRef.current) return
      // テスターフィードバック対応（2026-10-23）：地図ページと同様、登録済みの自分のエリアを起点に表示する
      const registeredAreas = getMyAreas()
      const firstAreaPref = registeredAreas.length > 0 ? extractPrefecture(registeredAreas[0]) : null
      const prefCoords = firstAreaPref ? getPrefectureCoords(firstAreaPref) : null
      const map = new google.maps.Map(mapRef.current, {
        center: prefCoords ?? { lat: 36.5, lng: 137.5 },
        zoom: prefCoords ? 10 : 8,
        mapTypeId: 'hybrid',
        styles: [
          { featureType: 'all', elementType: 'labels.text.fill', stylers: [{ color: '#e8d5b7' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0C1322' }] },
        ],
      })
      mapInstanceRef.current = map
    }

    if (typeof google !== 'undefined' && google.maps) {
      init()
    } else {
      const timer = setInterval(() => {
        if (typeof google !== 'undefined' && google.maps) {
          clearInterval(timer)
          init()
        }
      }, 100)
      return () => clearInterval(timer)
    }
  }, [])

  // グループ切替時に地図更新
  useEffect(() => {
    if (groups[selectedGroupIdx]) {
      drawGroup(groups[selectedGroupIdx])
    }
  }, [selectedGroupIdx, groups, drawGroup])

  const group = groups[selectedGroupIdx]

  return (
    <div className="min-h-screen bg-kuma-bg text-kuma-ink flex flex-col">
      {/* ヘッダー */}
      <header className="bg-kuma-card border-b border-kuma-line px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-kuma-faint hover:text-kuma-ink text-sm">← トップ</Link>
        <span className="text-xl">🐾</span>
        <h1 className="text-base font-bold text-kuma-amber">AI追跡</h1>
        <div className="ml-auto flex gap-1">
          <button
            onClick={() => setMode('route')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${mode === 'route' ? 'bg-kuma-amber text-black border-kuma-amber' : 'border-kuma-line text-kuma-faint hover:border-kuma-amber'}`}
          >
            🧭 AI移動ルート追跡
          </button>
          <button
            onClick={() => setMode('individual')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${mode === 'individual' ? 'bg-kuma-amber text-black border-kuma-amber' : 'border-kuma-line text-kuma-faint hover:border-kuma-amber'}`}
          >
            🔁 同一個体トラッキング
          </button>
        </div>
      </header>

      {mode === 'individual' ? (
        <IndividualTrackingSection />
      ) : (
      <div className="flex flex-col lg:flex-row flex-1 gap-0">
        {/* 左サイドバー（PC）/ 上部コントロール（Mobile） */}
        <aside className="lg:w-80 bg-kuma-card border-r border-kuma-line flex flex-col shrink-0">
          {/* 時間範囲 + 分析ボタン */}
          <div className="p-4 border-b border-kuma-line">
            <p className="text-xs text-kuma-faint mb-2">直近の目撃情報を対象に分析</p>
            <div className="flex gap-1 mb-3 flex-wrap">
              {HOURS_OPTIONS.map((h) => (
                <button
                  key={h}
                  onClick={() => setHours(h)}
                  className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                    hours === h
                      ? 'bg-kuma-amber text-black border-kuma-amber'
                      : 'border-kuma-line text-kuma-faint hover:border-kuma-amber'
                  }`}
                >
                  {h}時間
                </button>
              ))}
            </div>
            <button
              onClick={fetchAndAnalyze}
              disabled={loading}
              className="w-full py-2.5 rounded-lg font-bold text-sm transition-opacity"
              style={{ background: 'linear-gradient(135deg,#C85400,#FF4D4D)', color: '#fff', opacity: loading ? 0.5 : 1 }}
            >
              {loading ? '🔍 AI分析中…' : '🔍 AI移動分析を実行'}
            </button>
          </div>

          {/* 表示条件 */}
          <div className="mx-4 mt-3 rounded-lg border border-kuma-line overflow-hidden text-xs">
            <div className="bg-kuma-line/20 px-3 py-2 font-bold text-kuma-faint">📋 データが表示される条件</div>
            <table className="w-full">
              <tbody>
                <tr className="border-t border-kuma-line">
                  <td className="px-3 py-2 font-bold text-kuma-amber whitespace-nowrap align-top">座標が必要</td>
                  <td className="px-3 py-2 text-kuma-faint leading-relaxed">位置情報あり（lat/lng）で登録したデータのみ対象。位置情報なしで登録したデータは除外されます</td>
                </tr>
                <tr className="border-t border-kuma-line">
                  <td className="px-3 py-2 font-bold text-kuma-amber whitespace-nowrap align-top">2件以上必要</td>
                  <td className="px-3 py-2 text-kuma-faint leading-relaxed">「同一個体グループ」が成立するには、選択した時間範囲内に2件以上の目撃情報が必要</td>
                </tr>
                <tr className="border-t border-kuma-line">
                  <td className="px-3 py-2 font-bold text-kuma-amber whitespace-nowrap align-top">グルーピング条件</td>
                  <td className="px-3 py-2 text-kuma-faint leading-relaxed">同一都道府県内 かつ 半径10km以内 かつ 24時間以内の目撃のみグループとみなす（県をまたぐ場合は別個体として扱う）</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* エラー */}
          {error && (
            <div className="mx-4 mt-3 p-3 rounded-lg bg-red-900/30 border border-red-600 text-xs text-red-300">
              ⚠️ {error}
            </div>
          )}

          {/* グループ一覧 */}
          {groups.length > 0 && (
            <div className="p-4 border-b border-kuma-line">
              <p className="text-xs text-kuma-faint mb-2">検出された個体グループ</p>
              <div className="flex flex-col gap-2">
                {groups.map((g, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedGroupIdx(i)}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                      selectedGroupIdx === i
                        ? 'border-kuma-amber bg-kuma-amber/10 text-kuma-amber'
                        : 'border-kuma-line text-kuma-faint hover:border-kuma-amber/50'
                    }`}
                  >
                    <span className="font-bold">個体 {i + 1}</span>
                    <span className="ml-2 text-xs">{g.sightings.length}件の目撃</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AI分析結果 */}
          {group && (
            <div className="p-4 flex-1 overflow-y-auto">
              <p className="text-xs text-kuma-faint mb-3">🤖 AI分析レポート</p>
              <div className="flex flex-col gap-3">
                <AnalysisCard icon="🧭" label="移動方向" value={group.analysis.direction} />
                <AnalysisCard
                  icon="📍"
                  label="推定現在地"
                  value={group.analysis.currentEstimate}
                  highlight={!!group.estimate}
                />
                <AnalysisCard icon="⚠️" label="次に警戒すべきエリア" value={group.analysis.nextRiskArea} accent />
                <AnalysisCard icon="🐻" label="行動パターン" value={group.analysis.behavior} />
                <AnalysisCard icon="📊" label="推定信頼度" value={group.analysis.confidence} />
              </div>

              {/* 時系列リスト */}
              <div className="mt-5">
                <p className="text-xs text-kuma-faint mb-2">目撃タイムライン</p>
                <div className="flex flex-col gap-2">
                  {group.sightings.map((s, i) => (
                    <div key={s.id} className={`flex gap-2 items-start text-xs ${i === group.sightings.length - 1 ? 'text-kuma-amber' : 'text-kuma-faint'}`}>
                      <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px]"
                        style={{ background: i === group.sightings.length - 1 ? '#FF4D4D' : '#F5A524', color: '#000' }}>
                        {i + 1}
                      </span>
                      <div>
                        <div>{new Date(s.sighted_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                        <div className="text-kuma-faint">{s.area ?? '場所不明'}{s.urgent ? ' 🔴' : ''}</div>
                      </div>
                    </div>
                  ))}
                  {group.estimate && (
                    <div className="flex gap-2 items-start text-xs text-cyan-400">
                      <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px]"
                        style={{ background: '#00E5FF', color: '#000' }}>？</span>
                      <div>
                        <div>現在（AI推定）</div>
                        <div className="text-cyan-500/70">
                          {group.estimate.lat.toFixed(4)}, {group.estimate.lng.toFixed(4)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-[10px] text-kuma-faint/60 mt-5 leading-relaxed">
                ※ AI推定はあくまで参考値です。実際の熊の位置・行動を保証するものではありません。緊急の場合は警察・行政へご連絡ください。
              </p>
            </div>
          )}

          {!groups.length && !loading && !error && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-kuma-faint text-sm">
              <div className="text-4xl mb-3">🐾</div>
              <p>時間範囲を選択して</p>
              <p>「AI移動分析を実行」を押してください</p>
            </div>
          )}
        </aside>

        {/* 地図エリア */}
        <div className="flex-1 relative min-h-[400px] lg:min-h-0">
          <div ref={mapRef} className="absolute inset-0" />
          {/* 凡例 */}
          <div className="absolute bottom-4 left-4 bg-kuma-bg/90 border border-kuma-line rounded-lg p-3 text-xs flex flex-col gap-1.5 backdrop-blur">
            <LegendItem color="#F5A524" label="目撃地点（時系列番号）" />
            <LegendItem color="#FF4D4D" label="最終目撃地点" />
            <LegendItem color="#00E5FF" label="AI推定現在地（？）" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-kuma-amber border-dashed" style={{ borderTop: '2px dashed #F5A524' }} />
              <span className="text-kuma-faint">移動ルート</span>
            </div>
          </div>
          {loading && (
            <div className="absolute inset-0 bg-kuma-bg/60 flex items-center justify-center backdrop-blur-sm">
              <div className="text-kuma-amber font-bold text-lg animate-pulse">🔍 AI分析中…</div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  )
}

type MatchedSighting = {
  id: number
  area: string | null
  sighted_at: string
  photo_url: string | null
  ai_individual_id: string | null
}

function IndividualTrackingSection() {
  const [loading, setLoading] = useState(true)
  const [groupList, setGroupList] = useState<{ ids: number[]; sightings: MatchedSighting[]; matches: MatchPair[] }[]>([])

  useEffect(() => {
    const load = async () => {
      const { data: matchRows } = await supabase.from('bear_individual_matches').select('sighting_id, matched_sighting_id, confidence, reason')
      const matches = (matchRows ?? []) as MatchPair[]
      if (matches.length === 0) { setGroupList([]); setLoading(false); return }

      const groups = groupMatches(matches)
      const allIds = Array.from(new Set(groups.flat()))
      const { data: sightingRows } = await supabase
        .from('bear_sightings')
        .select('id, area, sighted_at, photo_url, ai_individual_id')
        .in('id', allIds)
      const sightingsById = new Map((sightingRows ?? []).map((s) => [s.id, s as MatchedSighting]))

      const result = groups
        .map((ids) => ({
          ids,
          sightings: ids
            .map((id) => sightingsById.get(id))
            .filter((s): s is MatchedSighting => !!s)
            .sort((a, b) => new Date(a.sighted_at).getTime() - new Date(b.sighted_at).getTime()),
          matches: matches.filter((m) => ids.includes(m.sighting_id) && ids.includes(m.matched_sighting_id)),
        }))
        .filter((g) => g.sightings.length >= 2)

      setGroupList(result)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
      <p className="text-xs text-kuma-faint mb-4 max-w-2xl">
        AIによる写真の特徴記述（胸の模様・毛色・体格等）のテキスト比較から、同一個体の可能性が高いと推定された投稿をグループ化して表示します。
        座標クラスタリングによる「AI移動ルート追跡」とは異なるロジックであり、あくまで参考情報です。写真の照合を保証するものではありません。
      </p>
      {loading ? (
        <p className="text-center text-kuma-faint text-sm py-10">読み込み中...</p>
      ) : groupList.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-kuma-faint text-sm">
          <div className="text-4xl mb-3">🔁</div>
          <p>まだ同一個体と推定される投稿がありません</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5 max-w-3xl">
          {groupList.map((g, i) => (
            <div key={i} className="border border-kuma-line rounded-xl p-4 bg-kuma-card">
              <p className="text-sm font-bold text-kuma-amber mb-3">🔁 個体グループ {i + 1}（{g.sightings.length}件）</p>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {g.sightings.map((s) => {
                  const m = g.matches.find((mm) => mm.sighting_id === s.id || mm.matched_sighting_id === s.id)
                  return (
                    <div key={s.id} className="shrink-0 w-40 border border-kuma-line rounded-lg overflow-hidden bg-kuma-bg/40">
                      {s.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.photo_url} alt="目撃写真" className="w-full h-24 object-cover" />
                      ) : (
                        <div className="w-full h-24 flex items-center justify-center text-2xl bg-kuma-field">🐻</div>
                      )}
                      <div className="p-2 text-[11px] text-kuma-faint">
                        <div className="text-kuma-ink font-bold">{new Date(s.sighted_at).toLocaleDateString('ja-JP')}</div>
                        <div className="truncate">{s.area ?? '場所不明'}</div>
                        {m && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ color: m.confidence === 'high' ? '#B91C1C' : '#B45309', background: m.confidence === 'high' ? '#FEE2E2' : '#FEF3C7' }}>
                            {m.confidence === 'high' ? '高確度' : '中確度'}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AnalysisCard({ icon, label, value, highlight, accent }: { icon: string; label: string; value: string; highlight?: boolean; accent?: boolean }) {
  return (
    <div className={`rounded-lg p-3 border text-xs ${accent ? 'border-red-600/50 bg-red-900/20' : 'border-kuma-line bg-kuma-bg/40'}`}>
      <div className={`text-[10px] mb-1 ${accent ? 'text-red-400' : 'text-kuma-faint'}`}>{icon} {label}</div>
      <div className={`font-medium leading-relaxed ${highlight ? 'text-cyan-300' : accent ? 'text-red-300' : 'text-kuma-ink'}`}>{value}</div>
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-3.5 h-3.5 rounded-full border-2 border-white shrink-0" style={{ background: color }} />
      <span className="text-kuma-faint">{label}</span>
    </div>
  )
}
