'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { extractPrefecture, calcRiskLevel, isWithinDays, estimateActivityLevel, type RiskLevel, type ActivityLevel } from '@/lib/prefectures'
import Header from '@/components/kuma/Header'

type SightingRow = {
  area: string | null
  sighted_at: string
}

type PrefStat = {
  name: string
  total: number
  recent30: number
  risk: RiskLevel
  activity: ActivityLevel
}

type AreaStat = {
  area: string
  total: number
  recent30: number
}

type ArchiveStat = {
  prefecture: string
  archived_count: number
}

const RISK_COLOR: Record<RiskLevel, string> = {
  '高': '#EF4444',
  '中': '#F59E0B',
  '低': '#10B981',
  '情報なし': '#6B7A98',
}

const ACTIVITY_COLOR: Record<ActivityLevel, string> = {
  '活発': '#EF4444',
  'やや活発': '#F59E0B',
  '低調': '#10B981',
  'データ不足': '#6B7A98',
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const c = RISK_COLOR[level]
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold rounded px-2 py-0.5 whitespace-nowrap"
      style={{ color: c, background: `${c}1f`, border: `1px solid ${c}66` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />リスク{level}
    </span>
  )
}

function ActivityBadge({ level }: { level: ActivityLevel }) {
  const c = ACTIVITY_COLOR[level]
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold rounded px-2 py-0.5 whitespace-nowrap"
      style={{ color: c, background: `${c}1f`, border: `1px solid ${c}66` }}
      title="直近30日の投稿頻度に基づく参考指標です（環境省の個体数調査とは手法・精度が異なります）"
    >
      📡 出没頻度{level}
    </span>
  )
}

function PrefRow({ rank, name, total, recent30, risk, activity, max }: { rank: number; name: string; total: number; recent30: number; risk: RiskLevel; activity: ActivityLevel; max: number }) {
  const medal = rank <= 3
  return (
    <div className="flex items-center gap-3 py-3 border-b border-kuma-line last:border-b-0">
      <div
        className={`shrink-0 w-[26px] h-[26px] flex items-center justify-center text-[12.5px] font-black font-mono ${medal ? 'rounded-full text-kuma-primary-text' : 'rounded-md text-kuma-faint border border-kuma-line'}`}
        style={medal ? { background: 'var(--color-kuma-primary)' } : undefined}
      >
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[14.5px] font-extrabold text-kuma-ink">{name}</span>
          <RiskBadge level={risk} />
          <ActivityBadge level={activity} />
        </div>
        <div className="h-[5px] rounded bg-kuma-field overflow-hidden mt-1.5">
          <div className="h-full rounded" style={{ width: `${max > 0 ? (total / max) * 100 : 0}%`, background: RISK_COLOR[risk] }} />
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-base font-black text-kuma-ink font-mono leading-none">{total}</div>
        <div className="text-[10px] text-kuma-faint mt-1">30日 <b className="text-kuma-accent">+{recent30}</b></div>
      </div>
    </div>
  )
}

export default function AreasPage() {
  const [loading, setLoading] = useState(true)
  const [prefStats, setPrefStats] = useState<PrefStat[]>([])
  const [areaStats, setAreaStats] = useState<AreaStat[]>([])
  const [archiveStats, setArchiveStats] = useState<ArchiveStat[]>([])
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('bear_sightings')
        .select('area, sighted_at')
        .order('sighted_at', { ascending: false })

      const { data: archiveData } = await supabase
        .from('bear_sighting_archive_stats')
        .select('prefecture, archived_count')
        .order('archived_count', { ascending: false })

      setArchiveStats((archiveData ?? []) as ArchiveStat[])

      const rows = (data ?? []) as SightingRow[]
      setTotalCount(rows.length)

      const prefMap = new Map<string, { total: number; recent30: number }>()
      const areaMap = new Map<string, { total: number; recent30: number }>()

      rows.forEach(row => {
        if (!row.area) return
        const recent = isWithinDays(row.sighted_at, 30)

        const pref = extractPrefecture(row.area)
        if (pref) {
          const cur = prefMap.get(pref) ?? { total: 0, recent30: 0 }
          cur.total += 1
          if (recent) cur.recent30 += 1
          prefMap.set(pref, cur)
        }

        const cur2 = areaMap.get(row.area) ?? { total: 0, recent30: 0 }
        cur2.total += 1
        if (recent) cur2.recent30 += 1
        areaMap.set(row.area, cur2)
      })

      const prefs: PrefStat[] = Array.from(prefMap.entries())
        .map(([name, v]) => ({ name, total: v.total, recent30: v.recent30, risk: calcRiskLevel(v.recent30), activity: estimateActivityLevel(v.recent30) }))
        .sort((a, b) => b.total - a.total)

      const areas: AreaStat[] = Array.from(areaMap.entries())
        .map(([area, v]) => ({ area, total: v.total, recent30: v.recent30 }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 20)

      setPrefStats(prefs)
      setAreaStats(areas)
      setLoading(false)
    }
    load()
  }, [])

  const max = prefStats[0]?.total ?? 1

  return (
    <main className="min-h-screen bg-kuma-bg text-kuma-ink">
      <Header title="地域別 出没ランキング" icon="📊" />

      <div className="max-w-[1120px] mx-auto px-5 lg:px-12 py-5 lg:py-10 space-y-5 lg:space-y-6">
        <div>
          <h1 className="text-[21px] lg:text-[28px] font-extrabold leading-[1.4]">今、どこで出ているか。</h1>
          <p className="text-[12.5px] lg:text-sm leading-[1.7] text-kuma-sub mt-2">累計件数と直近30日の動きから、地域ごとのリスクを把握できます。</p>
        </div>

        <p className="text-xs text-kuma-sub bg-kuma-card border border-kuma-line rounded-xl p-3 leading-relaxed">
          本ランキングは「くま！おる！熊！」へのユーザー投稿データ（直近3ヶ月・累計{totalCount}件）に基づく集計です。気象庁・環境省・自治体等の公式統計とは異なり、投稿数の偏りの影響を受けます。リスクレベルは直近30日間の投稿件数をもとにした目安（高: 10件以上 / 中: 3〜9件 / 低: 1〜2件 / 情報なし: 0件）であり、安全を保証するものではありません。投稿から3ヶ月を経過した詳細情報（写真・地点等）は削除され、都道府県別の件数のみ「過去の参考統計」に記録されます。「出没頻度指数」も同じ投稿件数から算出した簡易参考値であり、環境省が新たに開始した「胸模様カメラによる個体識別＋通過頻度」を用いた全国統一の個体数調査とは手法・精度が異なりますのでご留意ください。
        </p>

        {loading ? (
          <p className="text-center text-kuma-faint text-sm py-10">読み込み中...</p>
        ) : prefStats.length === 0 ? (
          <p className="text-center text-kuma-faint text-sm py-10">まだ集計できる投稿がありません</p>
        ) : (
          <div className="lg:grid lg:grid-cols-[1.15fr_1fr] lg:gap-6 lg:items-start space-y-5 lg:space-y-0">
            {/* 都道府県別ランキング */}
            <section className="bg-kuma-card border border-kuma-line rounded-2xl px-4 lg:px-6 py-2 shadow-sm">
              <div className="flex items-center justify-between py-3">
                <span className="text-sm lg:text-base font-extrabold">都道府県別ランキング</span>
                <span className="text-[10.5px] text-kuma-faint font-mono">累計 / 直近30日</span>
              </div>
              {prefStats.map((p, i) => (
                <PrefRow key={p.name} rank={i + 1} name={p.name} total={p.total} recent30={p.recent30} risk={p.risk} activity={p.activity} max={max} />
              ))}
            </section>

            <div className="space-y-5 lg:space-y-6">
              {/* 市区町村ランキング */}
              <section className="bg-kuma-card border border-kuma-line rounded-2xl px-4 lg:px-6 py-4 shadow-sm">
                <div className="text-sm lg:text-base font-extrabold mb-1.5">市区町村・地区別 <span className="text-[11px] font-bold text-kuma-faint">上位20</span></div>
                {areaStats.map((a, i) => (
                  <div key={a.area} className={`flex items-center gap-3 py-2.5 ${i < areaStats.length - 1 ? 'border-b border-kuma-line' : ''}`}>
                    <span className="w-5 text-xs font-extrabold text-kuma-faint font-mono">{i + 1}</span>
                    <span className="flex-1 text-[13.5px] font-bold text-kuma-ink truncate">{a.area}</span>
                    <span className="text-[10px] text-kuma-faint shrink-0">30日 <b className="text-kuma-accent">+{a.recent30}</b></span>
                    <span className="text-sm font-black text-kuma-ink font-mono w-8 text-right shrink-0">{a.total}</span>
                  </div>
                ))}
              </section>

              {/* 過去の参考統計 */}
              {archiveStats.length > 0 && (
                <section className="bg-kuma-panel border border-kuma-line rounded-2xl px-4 lg:px-6 py-4">
                  <div className="text-sm font-extrabold mb-1">📦 過去の参考統計（都道府県別・件数のみ）</div>
                  <p className="text-[11px] leading-[1.7] text-kuma-sub mb-3">
                    プライバシーおよび観光地への影響に配慮し、3ヶ月を超えた投稿は地点・写真等の詳細を削除し、都道府県別の件数のみを記録しています。
                  </p>
                  <div className="space-y-2">
                    {archiveStats.map(a => (
                      <div key={a.prefecture} className="flex items-center justify-between bg-kuma-card border border-kuma-line rounded-lg px-3.5 py-2.5">
                        <span className="text-[12.5px] font-bold text-kuma-sub">{a.prefecture}</span>
                        <span className="text-sm font-black text-kuma-ink font-mono">{a.archived_count}件</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 環境省リンク */}
              <a
                href="https://www.env.go.jp/nature/choju/effort/effort12/effort12.html"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-kuma-card border border-kuma-line rounded-2xl px-4 py-3.5 hover:border-kuma-primary transition-colors"
              >
                <span className="text-xl">🏛️</span>
                <span className="flex-1">
                  <span className="block text-[13px] font-extrabold text-kuma-ink">環境省「クマ類の出没情報」</span>
                  <span className="block text-[11px] text-kuma-faint">全国の公的統計・出典はこちら</span>
                </span>
                <span className="text-base text-kuma-primary">›</span>
              </a>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Link href="/guide" className="flex-1 bg-kuma-card border border-kuma-line rounded-2xl py-3.5 text-center shadow-sm hover:border-kuma-primary transition-colors">
            <div className="text-xl">📖</div>
            <div className="text-[12.5px] font-extrabold text-kuma-ink mt-1.5">安全ガイド</div>
          </Link>
          <Link href="/links" className="flex-1 bg-kuma-card border border-kuma-line rounded-2xl py-3.5 text-center shadow-sm hover:border-kuma-primary transition-colors">
            <div className="text-xl">🗾</div>
            <div className="text-[12.5px] font-extrabold text-kuma-ink mt-1.5">公式リンク集</div>
          </Link>
        </div>
      </div>
    </main>
  )
}
