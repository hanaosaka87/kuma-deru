'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { isWithinDays } from '@/lib/prefectures'
import Bear from '@/components/kuma/Bear'
import MapField, { type PinData } from '@/components/kuma/MapField'
import MyAreaPanel from '@/components/kuma/MyAreaPanel'
import { NOTIFY_CHAIN } from '@/lib/theme'
import { KIND_STYLE, kindOf, type FeedItem } from '@/lib/kumaKind'

const FEATURES = [
  { emoji: '🔔', title: 'エリア通知', desc: 'メール・LINEで即時配信。学校・自治体には初動情報も。', color: '#F5A524' },
  { emoji: '🤖', title: 'AI写真分析', desc: '推定サイズ・特徴・確信度を自動判定。', color: '#5B9BFF' },
  { emoji: '🗓️', title: '3ヶ月で削除', desc: '詳細データは自動削除。観光地に残さない。', color: '#3DDC97' },
  { emoji: '🗾', title: '全国ガイド', desc: '安全ガイドと公式リンクを一体提供。', color: '#B7A4FF' },
]

// テスターフィードバック対応（2026-10-23）：「アプリの簡単なところ・役立つ説明を追加して欲しい」に対応
const USE_STEPS = [
  { n: '1', title: '見かけたら、その場で登録', desc: '地図をタップして位置を選ぶだけ。写真を添えればAIが大きさ・特徴を自動で分析します。', emoji: '📍' },
  { n: '2', title: '自分のエリアを登録', desc: '通学路・自宅周辺など気になるエリアを登録すれば、新しい目撃があった時だけメール・LINEに届きます。', emoji: '🔔' },
  { n: '3', title: '外出前に地図でチェック', desc: '登山・山菜採り・散歩の前に地図を開けば、直近の出没状況がひと目でわかります。', emoji: '🗺️' },
]

const USE_CASES = [
  { emoji: '🥾', text: '登山・ハイキング前の下調べ' },
  { emoji: '🎒', text: '子どもの通学路の安全確認' },
  { emoji: '🌿', text: '山菜採り・農作業前のチェック' },
  { emoji: '📢', text: '地域の最新の出没情報をリアルタイムで共有' },
]

const MINI_SPREAD = [
  { x: '28%', y: '32%' }, { x: '67%', y: '22%' }, { x: '74%', y: '60%' },
  { x: '40%', y: '72%' }, { x: '52%', y: '40%' },
]
const HERO_SPREAD = [
  { x: '24%', y: '40%' }, { x: '60%', y: '26%' }, { x: '76%', y: '60%' },
  { x: '42%', y: '70%' }, { x: '34%', y: '54%' }, { x: '68%', y: '44%' },
  { x: '50%', y: '32%' }, { x: '22%', y: '64%' },
]
const FALLBACK_MINI: PinData[] = [
  { x: '30%', y: '40%', kind: 'emg', pulse: true },
  { x: '66%', y: '30%', kind: 'sight' },
  { x: '74%', y: '72%', kind: 'resp' },
  { x: '44%', y: '78%', kind: 'secured' },
]
const FALLBACK_HERO: PinData[] = [
  { x: '24%', y: '40%', kind: 'sight' },
  { x: '60%', y: '26%', kind: 'emg', pulse: true },
  { x: '76%', y: '60%', kind: 'resp' },
  { x: '42%', y: '70%', kind: 'secured' },
  { x: '34%', y: '54%', kind: 'sight' },
]

const NAV = [
  { href: '/timeline', label: 'タイムライン' },
  { href: '/areas', label: '地域別ランキング' },
  { href: '/guide', label: '安全ガイド' },
  { href: '/coexist', label: '共存アイデア' },
  { href: '/notify', label: '通知登録' },
  { href: '/links', label: '公式リンク集' },
]

export default function LandingPage() {
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [recentCount, setRecentCount] = useState(0)
  const [urgentCount, setUrgentCount] = useState(0)

  useEffect(() => {
    supabase
      .from('bear_sightings')
      .select('id, area, status, urgent, sighted_at')
      .order('sighted_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!data) return
        setFeed(data.slice(0, 4))
        const recent = data.filter(s => isWithinDays(s.sighted_at, 1))
        setRecentCount(recent.length)
        setUrgentCount(recent.filter(s => s.urgent).length)
      })
  }, [])

  const latestUrgent = feed.find(s => s.urgent)

  const miniLivePins: PinData[] = feed.length > 0
    ? feed.slice(0, 5).map((s, i) => ({ ...MINI_SPREAD[i % MINI_SPREAD.length], kind: kindOf(s), pulse: s.urgent }))
    : FALLBACK_MINI

  const heroLivePins: PinData[] = feed.length > 0
    ? feed.slice(0, 8).map((s, i) => ({ ...HERO_SPREAD[i % HERO_SPREAD.length], kind: kindOf(s), pulse: s.urgent }))
    : FALLBACK_HERO

  return (
    <>
      {/* ============ モバイル ============ */}
      <div className="lg:hidden bg-kuma-bg text-kuma-ink">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-kuma-line">
          <div className="flex items-center gap-2">
            <Bear size={32} />
            <div className="leading-none">
              <span className="block font-extrabold text-[15.5px] text-kuma-primary">くま！おる！熊！</span>
              <span className="block text-[9px] text-kuma-faint mt-1">くまもり — 人も、熊も、守る</span>
            </div>
          </div>
          <Link href="/map" className="text-[11.5px] font-extrabold rounded-lg px-3 py-1.5" style={{ background: '#F5C400', color: '#1A1200' }}>今すぐ地図をみる</Link>
        </div>

        {latestUrgent && (
          <div className="bg-[#2A0E0E] border-b border-[#4d1f1f] px-4 py-2 flex items-center gap-2.5 text-[11.5px] font-mono text-kuma-accent overflow-hidden">
            <span className="shrink-0 font-extrabold bg-kuma-accent text-white rounded px-1.5 py-0.5 tracking-wide">緊急</span>
            <span className="text-[#FFB9B9] truncate">
              {new Date(latestUrgent.sighted_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} {latestUrgent.area || '場所不明'}で緊急通報 — 周辺地域に共有中
            </span>
          </div>
        )}

        <div className="px-[22px] pt-7">
          <div className="flex items-center gap-2 text-xs font-extrabold tracking-[.18em] text-kuma-primary font-mono">
            <span className="w-2 h-2 rounded-full bg-kuma-line2 animate-pulse" />REAL-TIME SHARING
          </div>
          <h1 className="text-[32px] leading-[1.26] font-extrabold mt-3 tracking-tight">
            くまの居場所を、<br /><span className="text-kuma-primary whitespace-nowrap">リアルタイムで共有。</span>
          </h1>
          <p className="text-sm leading-[1.75] text-kuma-sub mt-3.5">
            目撃された瞬間に地図へ反映。登録エリアの一報は、メールとLINEへ即時配信されます。みんなで見守れば、先に動ける。
          </p>
          <Link href="/map?report=true" className="mt-4 flex items-center justify-between gap-2 bg-kuma-primary/10 border border-kuma-primary rounded-xl px-4 py-[18px] min-h-[66px] hover:bg-kuma-primary/20 transition-colors active:opacity-80">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl shrink-0">🐻</span>
              <p className="text-sm font-extrabold text-kuma-primary truncate">熊を見かけたらみんなで登録しよう。</p>
            </div>
            <span className="shrink-0 whitespace-nowrap text-center text-[13px] font-extrabold text-white bg-kuma-primary rounded-lg px-3 py-2">今すぐ出没登録！</span>
          </Link>
          <div className="flex flex-col gap-2.5 mt-4">
            <Link href="/notify" className="rounded-xl py-[15px] min-h-[66px] flex items-center justify-center text-[15px] font-extrabold text-white bg-kuma-line2 text-center">LINEで通知登録</Link>
            <Link href="/notify" className="rounded-xl py-[15px] min-h-[66px] flex items-center justify-center text-[13.5px] font-extrabold text-center" style={{ background: '#F0E8D0', color: '#3D2906' }}>メールで通知登録</Link>
            <Link
              href="/map"
              className="rounded-xl py-[15px] min-h-[66px] text-[16px] font-extrabold text-center flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              style={{ background: '#F5C400', color: '#1A1200' }}
            >
              🗺️ 今すぐ地図を見る
            </Link>
            <Link
              href="/map?sos=open"
              className="rounded-xl py-[15px] min-h-[66px] text-[16px] font-extrabold text-white text-center flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #900000 0%, #FF0000 100%)', boxShadow: '0 4px 20px rgba(255,0,0,0.5)' }}
            >
              🆘 SOS緊急発信
            </Link>
          </div>
          <Link href="/tracking" className="mt-2.5 flex items-center justify-between gap-2 border rounded-xl px-4 py-3 hover:opacity-80 transition-opacity" style={{ background: 'rgba(0,229,255,0.1)', borderColor: 'rgba(0,229,255,0.4)' }}>
            <div className="flex items-center gap-2.5">
              <span className="text-lg">🐾</span>
              <div>
                <p className="text-[12px] font-extrabold" style={{ color: '#00E5FF' }}>AI移動追跡・同一個体トラッキング</p>
                <p className="text-[10px] text-kuma-faint mt-0.5">移動ルート推定・同じ熊の再出没を確認</p>
              </div>
            </div>
            <span className="text-[11px] font-bold" style={{ color: '#00E5FF' }}>見る →</span>
          </Link>
          <Link href="/partnership" className="mt-2.5 flex items-center justify-between gap-2 border rounded-xl px-4 py-3 hover:opacity-80 transition-opacity" style={{ background: 'rgba(59,92,153,0.15)', borderColor: 'rgba(99,132,220,0.4)' }}>
            <div className="flex items-center gap-2.5">
              <span className="text-lg">🏛️</span>
              <div>
                <p className="text-[12px] font-extrabold text-[#99B4F0]">自治体・猟友会の担当者の方へ</p>
                <p className="text-[10px] text-kuma-faint mt-0.5">連携・情報共有のご相談はこちら</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-[#99B4F0]">詳細 →</span>
          </Link>
        </div>

        {/* ライブ配信フィード */}
        <div className="px-[22px] pt-6">
          <div className="bg-kuma-card rounded-2xl border border-kuma-line overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-kuma-line">
              <span className="text-[12.5px] font-extrabold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-kuma-line2 animate-pulse" />ライブ配信フィード
              </span>
              <span className="text-[10.5px] text-kuma-sub font-mono">直近24h {recentCount}件 / 緊急 {urgentCount}</span>
            </div>
            {feed.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-kuma-faint">まだ目撃情報がありません</div>
            ) : (
              feed.map((s, i) => {
                const k = KIND_STYLE[kindOf(s)]
                return (
                  <div key={s.id} className={`flex items-center gap-3 px-4 py-3 ${i < feed.length - 1 ? 'border-b border-kuma-line' : ''}`}>
                    <span className="text-[11.5px] text-kuma-sub font-mono">
                      {new Date(s.sighted_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="flex-1 text-[13px] font-bold truncate">{s.area || '場所未設定'}</span>
                    <span
                      className="text-[10.5px] font-extrabold rounded px-2 py-1 border shrink-0"
                      style={{ color: k.color, background: `${k.color}1f`, borderColor: `${k.color}66` }}
                    >
                      {k.emoji} {k.label}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* 登録エリアパネル */}
        <div className="px-[22px] pt-4">
          <MyAreaPanel variant="mobile" />
        </div>

        {/* ミニマップ */}
        <div className="px-[22px] pt-3">
          <Link href="/map" className="block relative rounded-2xl overflow-hidden border border-kuma-line">
            <MapField h={130} radius={0} pins={miniLivePins} />
            <div className="absolute inset-0 flex items-end justify-center pb-3 bg-gradient-to-t from-black/65 via-transparent to-transparent pointer-events-none">
              <span className="text-[12.5px] font-extrabold rounded-full px-4 py-1.5" style={{ background: '#F5A524', color: '#0C1322' }}>
                🗺️ 全国地図を見る →
              </span>
            </div>
          </Link>
        </div>

        {/* 防災速報バンド */}
        <div className="px-[22px] pt-6">
          <div className="bg-[#2A0E0E] border border-[#4d1f1f] rounded-2xl p-5">
            <div className="text-[11.5px] font-extrabold tracking-[.16em] text-kuma-accent font-mono">EARLY WARNING</div>
            <h2 className="text-[22px] font-extrabold mt-2.5 leading-[1.35]">
              まるで、地震速報。<br /><span className="text-kuma-primary">熊の出没を、事前に。</span>
            </h2>
            <p className="text-[12.5px] text-[#FFB9B9] mt-3 leading-[1.75]">
              揺れる前に知らせるように、熊が近づく前に知らせる。数秒の差が、その日の行動を変える。
            </p>
          </div>
        </div>

        {/* 機能グリッド */}
        <div className="px-[22px] pt-8">
          <h2 className="text-[21px] font-extrabold mb-4">備えるための4機能</h2>
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-kuma-card rounded-2xl p-4 border border-kuma-line">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-2.5" style={{ background: `${f.color}1f` }}>{f.emoji}</div>
                <div className="text-[13.5px] font-extrabold" style={{ color: f.color }}>{f.title}</div>
                <div className="text-[11px] text-kuma-sub mt-1.5 leading-[1.6]">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 使い方（かんたん3ステップ） */}
        <div className="px-[22px] pt-8">
          <h2 className="text-[21px] font-extrabold mb-1">かんたん3ステップ</h2>
          <p className="text-[12px] text-kuma-sub mb-4">登録も、通知も、確認も。操作はすべてシンプルです。</p>
          <div className="flex flex-col gap-2.5">
            {USE_STEPS.map(s => (
              <div key={s.n} className="bg-kuma-card rounded-2xl p-4 border border-kuma-line flex items-start gap-3">
                <div className="shrink-0 w-9 h-9 rounded-full bg-kuma-primary/15 text-kuma-primary font-extrabold flex items-center justify-center text-sm">{s.n}</div>
                <div>
                  <div className="text-[13.5px] font-extrabold flex items-center gap-1.5">{s.emoji} {s.title}</div>
                  <div className="text-[11.5px] text-kuma-sub mt-1 leading-[1.6]">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* こんな時に役立つ */}
        <div className="px-[22px] pt-7">
          <h2 className="text-[21px] font-extrabold mb-3">こんな時に役立ちます</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {USE_CASES.map(c => (
              <div key={c.text} className="bg-kuma-card rounded-xl p-3.5 border border-kuma-line flex items-center gap-2">
                <span className="text-lg shrink-0">{c.emoji}</span>
                <span className="text-[11.5px] font-bold leading-[1.5]">{c.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 通知連鎖 */}
        <div className="px-[22px] pt-6">
          <div className="bg-kuma-panel rounded-2xl p-5 border border-kuma-line">
            <div className="text-xs font-extrabold tracking-[.12em] text-kuma-primary font-mono mb-3">NOTIFY CHAIN</div>
            <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {NOTIFY_CHAIN.map((c, i) => (
                <div key={c.label} className="flex items-center gap-3 shrink-0">
                  <div className="text-center w-[64px]">
                    <div className="text-xl mb-1">{c.emoji}</div>
                    <div className="text-[10.5px] font-bold leading-tight">{c.label}</div>
                  </div>
                  {i < NOTIFY_CHAIN.length - 1 && <span className="text-kuma-primary text-base">→</span>}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-kuma-sub mt-3.5 leading-[1.6]">一報が、管轄の警察・猟友会まで連鎖。地域の初動を、最速に。</p>
          </div>
        </div>

        {/* 最終CTA */}
        <div className="mt-8 px-[22px] py-8 text-center bg-gradient-to-b from-kuma-card to-kuma-bg border-t border-kuma-line">
          <h2 className="text-[22px] font-extrabold mb-2">速報を、今すぐ受け取る。</h2>
          <p className="text-[12.5px] text-kuma-sub mb-5 leading-[1.7]">登録無料。大切な人にもこの速報を。</p>
          <Link href="/notify" className="block w-full rounded-xl py-4 text-[15px] font-extrabold text-white bg-kuma-line2 mb-2.5">LINEで友だち追加（@962lbnbf）</Link>
          <Link href="/notify" className="block w-full rounded-xl py-[15px] text-sm font-extrabold" style={{ background: '#F0E8D0', color: '#3D2906' }}>メールで通知登録</Link>
        </div>
      </div>

      {/* ============ デスクトップ ============ */}
      <div className="hidden lg:block bg-kuma-bg text-kuma-ink">
        {/* nav */}
        <div className="border-b border-kuma-line bg-kuma-bg/90 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-[1120px] mx-auto px-12 h-[68px] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Bear size={36} />
              <div className="leading-none">
                <div className="font-extrabold text-[17px] text-kuma-primary">くま！おる！熊！</div>
                <div className="text-[10px] text-kuma-faint mt-1 tracking-wide">くまもり — 人も、熊も、守る</div>
              </div>
            </div>
            <div className="flex items-center gap-7">
              {NAV.map(n => (
                <Link key={n.href} href={n.href} className="text-[13.5px] font-bold text-kuma-sub hover:text-kuma-ink transition-colors">{n.label}</Link>
              ))}
              <Link href="/map" className="rounded-xl px-[18px] py-2.5 text-[13.5px] font-extrabold hover:opacity-90 transition-opacity" style={{ background: '#F5C400', color: '#1A1200' }}>今すぐ地図をみる</Link>
            </div>
          </div>
        </div>

        {/* hero */}
        <div className="max-w-[1120px] mx-auto px-12 py-14 grid grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-[#2A0E0E] text-kuma-accent border border-[#4d1f1f] rounded-full px-3.5 py-1.5 text-xs font-extrabold">
              <span className="w-1.5 h-1.5 rounded-full bg-kuma-accent animate-pulse" />リアルタイム配信中 · 直近24h {recentCount}件
            </div>
            <h1 className="text-[44px] leading-[1.22] font-extrabold mt-5 tracking-tight">
              くまの居場所を、<br /><span className="text-kuma-primary whitespace-nowrap">リアルタイムで共有。</span>
            </h1>
            <p className="text-[16.5px] leading-[1.8] text-kuma-sub mt-5 max-w-[460px]">
              登録エリアで熊が目撃されると、メール・LINEで即時にお知らせ。あなたの一報は<b className="text-kuma-ink">管轄の警察・自治体・猟友会</b><span className="whitespace-nowrap">まで届きます。</span>
            </p>
            <Link href="/map?report=true" className="mt-5 flex items-center justify-between gap-3 bg-kuma-primary/10 border border-kuma-primary rounded-xl px-5 py-[18px] min-h-[66px] hover:bg-kuma-primary/20 transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xl shrink-0">🐻</span>
                <p className="text-[15px] font-extrabold text-kuma-primary truncate">熊を見かけたらみんなで登録しよう。</p>
              </div>
              <span className="shrink-0 whitespace-nowrap text-center text-sm font-extrabold text-white bg-kuma-primary rounded-lg px-3 py-2">今すぐ出没登録！</span>
            </Link>
            <div className="flex gap-3 mt-5">
              <Link href="/notify" className="rounded-xl px-[26px] py-[15px] min-h-[66px] flex items-center justify-center text-[15px] font-extrabold text-white bg-kuma-line2 hover:opacity-90 transition-opacity">LINEで通知登録</Link>
              <Link href="/notify" className="rounded-xl px-[26px] py-[15px] min-h-[66px] flex items-center justify-center text-[15px] font-extrabold hover:opacity-90 transition-opacity" style={{ background: '#F0E8D0', color: '#3D2906' }}>メールで通知登録</Link>
              <Link
                href="/map"
                className="rounded-xl px-[28px] py-[15px] min-h-[66px] text-[16px] font-extrabold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                style={{ background: '#F5C400', color: '#1A1200' }}
              >
                🗺️ 今すぐ地図を見る
              </Link>
              <Link
                href="/map?sos=open"
                className="rounded-xl px-[28px] py-[15px] min-h-[66px] text-[16px] font-extrabold text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #900000 0%, #FF0000 100%)', boxShadow: '0 4px 20px rgba(255,0,0,0.5)' }}
              >
                🆘 SOS緊急発信
              </Link>
            </div>
            <Link href="/tracking" className="mt-3 flex items-center justify-between gap-3 border rounded-xl px-5 py-3 hover:opacity-80 transition-opacity" style={{ background: 'rgba(0,229,255,0.1)', borderColor: 'rgba(0,229,255,0.4)' }}>
              <div className="flex items-center gap-3">
                <span className="text-xl">🐾</span>
                <div>
                  <p className="text-[13px] font-extrabold" style={{ color: '#00E5FF' }}>AI移動追跡・同一個体トラッキング</p>
                  <p className="text-[11px] text-kuma-faint mt-0.5">移動ルート推定・同じ熊の再出没を確認</p>
                </div>
              </div>
              <span className="text-[12px] font-bold" style={{ color: '#00E5FF' }}>見る →</span>
            </Link>
            <Link href="/partnership" className="mt-3 flex items-center justify-between gap-3 border rounded-xl px-5 py-3 hover:opacity-80 transition-opacity" style={{ background: 'rgba(59,92,153,0.15)', borderColor: 'rgba(99,132,220,0.4)' }}>
              <div className="flex items-center gap-3">
                <span className="text-xl">🏛️</span>
                <div>
                  <p className="text-[13px] font-extrabold text-[#99B4F0]">自治体・猟友会の担当者の方へ</p>
                  <p className="text-[11px] text-kuma-faint mt-0.5">連携・情報共有のご相談はこちら</p>
                </div>
              </div>
              <span className="text-[12px] font-bold text-[#99B4F0]">詳細はこちら →</span>
            </Link>
            <div className="flex gap-8 mt-8">
              {[['47', '都道府県を網羅'], ['即時', 'メール・LINE通知'], ['3ヶ月', 'で詳細データ削除']].map(([a, b]) => (
                <div key={b}>
                  <div className="text-2xl font-extrabold text-kuma-primary">{a}</div>
                  <div className="text-xs text-kuma-sub mt-1">{b}</div>
                </div>
              ))}
            </div>
          </div>

          {/* hero visual */}
          <div className="flex flex-col gap-4">
            <MyAreaPanel variant="desktop" />
            <Link href="/map" className="block relative rounded-[22px] overflow-hidden border border-kuma-line shadow-xl group">
              <MapField h={260} radius={0} pins={heroLivePins} />
              <div className="absolute top-4 left-4 bg-kuma-card border border-kuma-line rounded-xl px-3.5 py-2.5 shadow-lg">
                <div className="text-[11px] text-kuma-faint font-bold">直近24時間の出没</div>
                <div className="text-2xl font-extrabold text-kuma-primary">{recentCount}<span className="text-[13px] text-kuma-accent ml-2">緊急 {urgentCount}</span></div>
              </div>
              <div className="absolute inset-0 flex items-end justify-end p-4 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none">
                <span className="text-[13.5px] font-extrabold rounded-full px-5 py-2.5 shadow-lg group-hover:opacity-90 transition-opacity" style={{ background: '#F5A524', color: '#0C1322' }}>
                  🗺️ 全国地図を見る →
                </span>
              </div>
            </Link>
          </div>
        </div>

        {/* 共存ストリップ */}
        <div className="bg-kuma-panel">
          <div className="max-w-[1120px] mx-auto px-12 py-8 flex items-center justify-center gap-6">
            <Bear size={64} />
            <div>
              <div className="text-2xl font-extrabold text-kuma-primary">人も、熊も、守る。</div>
              <div className="text-sm text-kuma-sub mt-1">「くまもり（熊守）」— 出会いを減らし、不要な駆除を防ぐ。共存のための情報インフラです。</div>
            </div>
          </div>
        </div>

        {/* 防災速報バンド */}
        <div className="bg-[#2A0E0E] border-t border-b border-[#4d1f1f]">
          <div className="max-w-[1120px] mx-auto px-12 py-10 flex items-center gap-10">
            <div className="shrink-0">
              <div className="text-[12.5px] font-extrabold tracking-[.16em] text-kuma-accent">EARLY WARNING</div>
              <h2 className="text-[34px] font-extrabold mt-3 leading-[1.32]">まるで、地震速報。<br /><span className="text-kuma-primary">熊の出没を、事前に。</span></h2>
            </div>
            <p className="text-[15.5px] text-[#FFB9B9] leading-[1.85] max-w-[520px]">
              揺れる前に知らせるように、熊が近づく前に知らせる。登録エリアの一報を、最速であなたへ。数秒の差が、その日の行動を変えます。
            </p>
          </div>
        </div>

        {/* 機能グリッド */}
        <div className="max-w-[1120px] mx-auto px-12 pt-14 pb-5">
          <div className="text-center mb-9">
            <div className="text-[12.5px] font-extrabold tracking-[.16em] text-kuma-accent">FEATURES</div>
            <h2 className="text-[32px] font-extrabold mt-3">安全・安心を支える4つの仕組み</h2>
          </div>
          <div className="grid grid-cols-4 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-kuma-card rounded-2xl p-6 border border-kuma-line shadow-sm">
                <div className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center text-[25px] mb-4" style={{ background: `${f.color}22` }}>{f.emoji}</div>
                <div className="text-[16.5px] font-extrabold">{f.title}</div>
                <div className="text-[13px] leading-[1.7] text-kuma-sub mt-2">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 使い方（かんたん3ステップ） */}
        <div className="max-w-[1120px] mx-auto px-12 pt-11 pb-5">
          <div className="text-center mb-9">
            <div className="text-[12.5px] font-extrabold tracking-[.16em] text-kuma-accent">HOW IT WORKS</div>
            <h2 className="text-[32px] font-extrabold mt-3">かんたん3ステップで使える</h2>
          </div>
          <div className="grid grid-cols-3 gap-5">
            {USE_STEPS.map(s => (
              <div key={s.n} className="bg-kuma-card rounded-2xl p-6 border border-kuma-line shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-kuma-primary/15 text-kuma-primary font-extrabold flex items-center justify-center">{s.n}</div>
                  <div className="text-[16.5px] font-extrabold">{s.emoji} {s.title}</div>
                </div>
                <div className="text-[13px] leading-[1.7] text-kuma-sub">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* こんな時に役立つ */}
        <div className="max-w-[1120px] mx-auto px-12 pb-11">
          <h2 className="text-center text-2xl font-extrabold mb-6">こんな時に役立ちます</h2>
          <div className="grid grid-cols-4 gap-4">
            {USE_CASES.map(c => (
              <div key={c.text} className="bg-kuma-card rounded-xl p-4 border border-kuma-line flex items-center gap-2.5">
                <span className="text-xl shrink-0">{c.emoji}</span>
                <span className="text-[13px] font-bold leading-[1.5]">{c.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 通知連鎖バンド */}
        <div className="max-w-[1120px] mx-auto px-12 py-11">
          <div className="bg-kuma-panel border border-kuma-line rounded-2xl px-8 py-9 shadow-sm">
            <div className="text-center mb-7">
              <div className="text-[12.5px] font-extrabold tracking-[.14em] text-kuma-accent">NOTIFY CHAIN</div>
              <h2 className="text-2xl font-extrabold mt-2.5">一報が、<span className="text-kuma-primary">管轄の警察・自治体・猟友会</span>まで届く。</h2>
            </div>
            <div className="flex items-center justify-between">
              {NOTIFY_CHAIN.map((c, i) => (
                <div key={c.label} className="flex items-center flex-1 last:flex-none">
                  <div className="text-center">
                    <div
                      className="w-[72px] h-[72px] mx-auto mb-2.5 flex items-center justify-center text-[32px]"
                      style={i >= 3
                        ? { borderRadius: 18, background: 'rgba(245,165,36,.14)', border: '2px solid var(--color-kuma-primary)' }
                        : { borderRadius: '50%', background: 'var(--color-kuma-field)', border: '1px solid var(--color-kuma-line)' }}
                    >
                      {c.emoji}
                    </div>
                    <div className={`text-sm font-extrabold ${i >= 3 ? 'text-kuma-primary' : 'text-kuma-ink'}`}>{c.label}</div>
                  </div>
                  {i < NOTIFY_CHAIN.length - 1 && (
                    <div className="flex-1 h-0.5 mx-2 -mt-3.5" style={{ background: 'linear-gradient(90deg, var(--color-kuma-line), rgba(245,165,36,.4))' }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 最終CTA */}
        <div className="bg-kuma-panel">
          <div className="max-w-[1120px] mx-auto px-12 py-12 text-center">
            <Bear size={64} className="mx-auto" />
            <h2 className="text-[32px] font-extrabold mt-4 mb-2">今すぐ、通知を受け取る。</h2>
            <p className="text-[15px] text-kuma-sub mb-6">登録は無料。大切な人にも、ぜひ知らせてあげてください。</p>
            <div className="flex gap-3 justify-center">
              <Link href="/notify" className="rounded-xl px-[26px] py-[15px] text-[15px] font-extrabold text-white bg-kuma-line2 hover:opacity-90 transition-opacity">LINEで友だち追加（@962lbnbf）</Link>
              <Link href="/notify" className="rounded-xl px-[26px] py-[15px] text-[15px] font-extrabold hover:opacity-90 transition-opacity" style={{ background: '#F0E8D0', color: '#3D2906' }}>メールで通知登録</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
