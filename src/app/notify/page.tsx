'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/kuma/Header'
import { NOTIFY_CHAIN } from '@/lib/theme'
import { PREFECTURES } from '@/lib/prefectures'

const SUBSCRIBER_TYPES = ['個人', '学校・教育機関', '自治体・行政', '警察', '猟友会'] as const
const DB_SUBSCRIBER_TYPE: Record<typeof SUBSCRIBER_TYPES[number], string> = {
  '個人': '個人',
  '学校・教育機関': '学校・教育機関',
  '自治体・行政': '自治体・行政',
  '警察': '自治体・行政',
  '猟友会': '自治体・行政',
}

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export default function NotifyPage() {
  const [email, setEmail] = useState('')
  const [subscriberType, setSubscriberType] = useState<typeof SUBSCRIBER_TYPES[number]>('個人')

  // Push通知
  const [pushSupported, setPushSupported] = useState(false)
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [pushPref, setPushPref] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true)
      navigator.serviceWorker.register('/sw.js').then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          if (sub) setPushSubscribed(true)
        })
      }).catch(() => {})
    }
  }, [])

  const handlePushSubscribe = async () => {
    if (!VAPID_PUBLIC_KEY) return
    setPushLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), prefecture: pushPref || null }),
      })
      setPushSubscribed(true)
    } catch {
      alert('プッシュ通知の登録に失敗しました。ブラウザの通知許可を確認してください。')
    }
    setPushLoading(false)
  }

  const handlePushUnsubscribe = async () => {
    setPushLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setPushSubscribed(false)
    } catch {}
    setPushLoading(false)
  }

  // エリア選択
  const [selectedPref, setSelectedPref] = useState('')
  const [cityInput, setCityInput] = useState('')
  const [areas, setAreas] = useState<string[]>([])

  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addArea = () => {
    const a = [selectedPref, cityInput.trim()].filter(Boolean).join(' ')
    if (!a) return
    if (!areas.includes(a)) setAreas(prev => [...prev, a])
    setCityInput('')
  }

  const removeArea = (a: string) => setAreas(prev => prev.filter(x => x !== a))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // 未追加のエリアも含める
    const pending = [selectedPref, cityInput.trim()].filter(Boolean).join(' ')
    const finalAreas = [...areas]
    if (pending && !finalAreas.includes(pending)) finalAreas.push(pending)

    if (!email.trim()) { setError('メールアドレスを入力してください'); return }
    if (finalAreas.length === 0) { setError('通知を受け取るエリアを1つ以上追加してください'); return }

    setLoading(true)
    setError(null)

    const results = await Promise.all(
      finalAreas.map(a =>
        supabase.from('bear_area_subscriptions').insert({
          email: email.trim(),
          area: a,
          subscriber_type: DB_SUBSCRIBER_TYPE[subscriberType],
        })
      )
    )
    setLoading(false)

    if (results.some(r => r.error)) {
      setError('一部の登録に失敗しました。時間をおいて再度お試しください。')
      return
    }

    try {
      const existing: string[] = JSON.parse(localStorage.getItem('kuma_my_areas') || '[]')
      localStorage.setItem('kuma_my_areas', JSON.stringify(Array.from(new Set([...existing, ...finalAreas]))))
    } catch {}

    setDone(true)
  }

  return (
    <main className="min-h-screen bg-kuma-bg text-kuma-ink">
      <Header title="出没エリア通知登録" icon="🔔" />

      <div className="max-w-[1120px] mx-auto px-5 lg:px-12 py-6 lg:py-12">
        <div className="lg:grid lg:grid-cols-2 lg:gap-12">
          {/* 左：見出し + 通知連鎖 */}
          <div>
            <h1 className="text-[23px] lg:text-[34px] font-extrabold leading-[1.4] lg:leading-[1.3]">
              登録エリアで熊が出たら、<br /><span className="text-kuma-primary">すぐ届く。すぐ知らせる。</span>
            </h1>
            <p className="text-[13px] lg:text-[15px] leading-[1.75] lg:leading-[1.8] text-kuma-sub mt-2.5">
              あなたの一報は、身近な人から<b className="text-kuma-ink">管轄の警察・自治体・猟友会</b>まで届きます。
            </p>

            {/* 通知連鎖 */}
            <div className="bg-kuma-card border border-kuma-line rounded-2xl px-4 py-[18px] mt-[18px] shadow-sm">
              <div className="text-[11.5px] font-extrabold tracking-[.1em] text-kuma-primary mb-3.5">通知が届く連鎖</div>
              <div className="flex flex-col">
                {NOTIFY_CHAIN.map((c, i) => (
                  <div key={c.label}>
                    <div className="flex items-center gap-3">
                      <div
                        className="shrink-0 w-11 h-11 flex items-center justify-center text-[21px]"
                        style={i >= 3
                          ? { borderRadius: 12, background: 'rgba(245,165,36,.14)', border: '1.5px solid var(--color-kuma-primary)' }
                          : { borderRadius: '50%', background: 'var(--color-kuma-field)', border: '1px solid var(--color-kuma-line)' }}
                      >
                        {c.emoji}
                      </div>
                      <div className="flex-1">
                        <div className={`text-sm font-extrabold ${i >= 3 ? 'text-kuma-primary' : 'text-kuma-ink'}`}>
                          {c.label}
                          {i >= 3 && <span className="text-[10px] ml-1.5 font-extrabold text-kuma-primary-text bg-kuma-primary rounded px-1.5 py-0.5">自動連携</span>}
                        </div>
                        <div className="text-[11.5px] text-kuma-sub mt-0.5">{c.desc}</div>
                      </div>
                    </div>
                    {i < NOTIFY_CHAIN.length - 1 && <div className="w-px h-3 bg-kuma-line ml-[22px]" />}
                  </div>
                ))}
              </div>
            </div>

            {/* 通知フロー説明 */}
            <div className="bg-kuma-panel border border-kuma-line rounded-2xl px-4 py-4 mt-4">
              <div className="text-xs font-extrabold text-kuma-primary mb-2">⚙️ 自治体・警察・猟友会への通知フロー</div>
              <ol className="space-y-2 text-[12px] text-kuma-sub leading-[1.7]">
                <li className="flex gap-2"><span className="shrink-0 text-kuma-primary font-extrabold">1.</span>担当者がこのページから「自治体・行政」「警察」「猟友会」として<b className="text-kuma-ink">エリアを事前登録</b></li>
                <li className="flex gap-2"><span className="shrink-0 text-kuma-primary font-extrabold">2.</span>登録エリアで出没情報が投稿されると、<b className="text-kuma-ink">メール・LINEで即時通知</b>（初動対応の参考情報を付記）</li>
                <li className="flex gap-2"><span className="shrink-0 text-kuma-primary font-extrabold">3.</span>緊急投稿の場合は運営者にも同時通知し、<b className="text-kuma-ink">人力での連絡をバックアップ</b></li>
              </ol>
              <p className="text-[11px] text-kuma-faint mt-2">
                ※ 自治体・猟友会の方は「自治体・行政」「猟友会」を選択して登録してください。
              </p>
            </div>

            <p className="text-[11px] leading-[1.7] text-kuma-faint mt-4 lg:mt-6">
              ※ 写真・座標などの詳細情報は投稿から3ヶ月で自動削除されます。
            </p>
          </div>

          {/* 右：Push + LINE登録 + メール登録 */}
          <div className="mt-4 lg:mt-0 space-y-4">
            {/* Web Pushカード */}
            {pushSupported && (
              <div className="bg-kuma-card border border-kuma-line rounded-2xl px-4 py-[18px] shadow-sm">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xl">🔔</span>
                  <span className="text-[15px] font-extrabold text-kuma-ink">ブラウザ通知（最速・登録不要）</span>
                </div>
                <p className="text-[12.5px] leading-[1.7] text-kuma-sub mb-3.5">
                  ボタン1つで登録完了。熊が出たら<b className="text-kuma-ink">スマホに即プッシュ通知</b>が届きます。メール登録不要です。
                </p>
                {pushSubscribed ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 bg-green-900/20 border border-green-600/40 rounded-xl px-4 py-3">
                      <span className="text-green-400 text-lg">✅</span>
                      <span className="text-sm font-bold text-green-400">プッシュ通知を登録済みです</span>
                    </div>
                    <button
                      onClick={handlePushUnsubscribe}
                      disabled={pushLoading}
                      className="w-full text-xs text-kuma-faint border border-kuma-line rounded-lg py-2 hover:border-kuma-accent hover:text-kuma-accent transition-colors disabled:opacity-50"
                    >
                      {pushLoading ? '処理中...' : '通知を解除する'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <select
                      className="w-full bg-kuma-field border border-kuma-line rounded-xl px-3 py-2.5 text-[13px] text-kuma-ink focus:outline-none focus:ring-2 focus:ring-kuma-primary"
                      value={pushPref}
                      onChange={e => setPushPref(e.target.value)}
                    >
                      <option value="">全国（都道府県を絞り込まない）</option>
                      {PREFECTURES.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                    </select>
                    <button
                      onClick={handlePushSubscribe}
                      disabled={pushLoading}
                      className="w-full rounded-xl py-3.5 text-[14.5px] font-extrabold text-kuma-primary-text bg-kuma-primary hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {pushLoading ? '登録中...' : '🔔 プッシュ通知を受け取る'}
                    </button>
                    <p className="text-[11px] text-kuma-faint text-center">ブラウザが通知許可を求めます。「許可」を押してください。</p>
                  </div>
                )}
              </div>
            )}

            {/* LINEカード */}
            <div className="bg-[rgba(6,199,85,.1)] border-[1.5px] border-kuma-line2 rounded-2xl px-4 py-[18px]">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-[30px] h-[30px] rounded-lg bg-kuma-line2 text-white text-sm font-extrabold flex items-center justify-center">L</span>
                <span className="text-[15px] font-extrabold text-kuma-ink">LINEで登録（いちばん簡単）</span>
              </div>
              <p className="text-[12.5px] leading-[1.7] text-kuma-sub mb-3.5">
                友だち追加して、トークで<b className="text-kuma-ink">エリア名を送るだけ</b>で登録完了。<br />
                例：「秋田県 鹿角市」と送信 → 即登録
              </p>
              <a
                href="https://line.me/R/ti/p/@962lbnbf"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center rounded-xl py-3.5 text-[14.5px] font-extrabold text-white bg-kuma-line2 hover:opacity-90 transition-opacity"
              >
                友だち追加（@962lbnbf）
              </a>
            </div>

            {/* メールフォーム */}
            <div className="bg-kuma-card border border-kuma-line rounded-2xl px-4 py-[18px] shadow-sm">
              <div className="text-[15px] font-extrabold text-kuma-ink mb-3.5">✉️ メールで登録</div>

              {done ? (
                <div className="text-center py-6">
                  <p className="text-3xl mb-2">🐻🔔</p>
                  <p className="font-bold mb-1 text-kuma-ink">登録しました！</p>
                  <p className="text-sm text-kuma-sub">
                    登録エリア：{areas.join('、')} での出没情報をお知らせします。
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* メールアドレス */}
                  <label className="block">
                    <span className="text-[11.5px] font-extrabold text-kuma-sub">メールアドレス</span>
                    <input
                      type="email"
                      required
                      className="mt-1.5 w-full bg-kuma-field border-[1.5px] border-kuma-line rounded-xl px-3 py-3 text-[13px] text-kuma-ink placeholder-kuma-faint focus:outline-none focus:ring-2 focus:ring-kuma-primary"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </label>

                  {/* 登録区分 */}
                  <div>
                    <span className="text-[11.5px] font-extrabold text-kuma-sub">登録区分</span>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {SUBSCRIBER_TYPES.map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSubscriberType(t)}
                          className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold border-[1.5px] transition-colors ${
                            subscriberType === t
                              ? 'bg-kuma-primary text-kuma-primary-text border-kuma-primary'
                              : 'bg-kuma-field text-kuma-sub border-kuma-line hover:text-kuma-ink'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-xs text-kuma-faint">
                      学校・自治体・警察・猟友会を選ぶと、初動対応の参考情報を含めた通知をお送りします。
                    </p>
                  </div>

                  {/* エリア選択 */}
                  <div>
                    <span className="text-[11.5px] font-extrabold text-kuma-sub block mb-2">
                      通知を受け取るエリア
                    </span>

                    <div className="flex gap-2">
                      {/* 都道府県プルダウン */}
                      <select
                        className="w-[140px] shrink-0 bg-kuma-field border-[1.5px] border-kuma-line rounded-xl px-2 py-2.5 text-[13px] text-kuma-ink focus:outline-none focus:ring-2 focus:ring-kuma-primary"
                        value={selectedPref}
                        onChange={e => setSelectedPref(e.target.value)}
                      >
                        <option value="">都道府県</option>
                        {PREFECTURES.map(p => (
                          <option key={p.name} value={p.name}>{p.name}</option>
                        ))}
                      </select>

                      {/* 市区町村入力 */}
                      <input
                        className="flex-1 bg-kuma-field border-[1.5px] border-kuma-line rounded-xl px-3 py-2.5 text-[13px] text-kuma-ink placeholder-kuma-faint focus:outline-none focus:ring-2 focus:ring-kuma-primary"
                        placeholder="市区町村・地区（任意）"
                        value={cityInput}
                        onChange={e => setCityInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addArea() } }}
                      />

                      {/* 追加ボタン */}
                      <button
                        type="button"
                        onClick={addArea}
                        disabled={!selectedPref}
                        className="shrink-0 px-3.5 py-2.5 rounded-xl bg-kuma-primary text-kuma-primary-text font-extrabold text-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
                      >
                        ＋追加
                      </button>
                    </div>

                    <p className="mt-1.5 text-xs text-kuma-faint">
                      都道府県を選択し「＋追加」で複数エリアの登録が可能です。
                    </p>

                    {/* 追加済みエリア */}
                    {areas.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {areas.map(a => (
                          <span
                            key={a}
                            className="inline-flex items-center gap-1.5 bg-kuma-primary/15 border border-kuma-primary/40 text-kuma-primary rounded-full px-3 py-1 text-xs font-bold"
                          >
                            📍 {a}
                            <button
                              type="button"
                              onClick={() => removeArea(a)}
                              className="text-kuma-primary/60 hover:text-kuma-accent leading-none text-sm"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {error && <p className="text-xs text-kuma-accent">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-kuma-primary hover:opacity-90 disabled:opacity-50 text-kuma-primary-text rounded-xl py-3.5 font-extrabold text-[14.5px] transition-opacity"
                  >
                    {loading ? '登録中...' : 'この内容で通知登録する'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
