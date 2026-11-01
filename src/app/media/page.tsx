'use client'

import { useState } from 'react'
import Header from '@/components/kuma/Header'

const FACTS = [
  { label: 'サービス開始', value: '2026年6月' },
  { label: '対応地域', value: '全国47都道府県' },
  { label: '提供形態', value: '無料Webアプリ（登録不要で閲覧可能）' },
  { label: 'AI機能', value: '写真から熊のサイズ・個体特徴・確信度を自動判定' },
  { label: '通知手段', value: 'メール・LINE（登録エリアに即時配信）' },
  { label: '運営', value: '株式会社華（大阪府）' },
]

const FEATURES = [
  { emoji: '🤖', title: 'AI画像分析で熊を識別', desc: '写真からAIが熊のサイズ・個体特徴・確信度を自動判定。誤投稿の警告機能つき。' },
  { emoji: '📍', title: 'リアルタイム地図共有', desc: '目撃情報が即座に地図へ反映。登録エリアにメール・LINEで即時通知。' },
  { emoji: '🏫', title: '学校・自治体・猟友会への通知連鎖', desc: '登録区分（自治体・警察・猟友会）で初動対応情報を含む通知を配信。' },
  { emoji: '🗓️', title: '3ヶ月で詳細データ自動削除', desc: '観光地への恒久的な影響を防ぐため、詳細情報は3ヶ月で自動削除。集計のみ残す。' },
]

const PURPOSE_OPTIONS = [
  '新聞・雑誌への掲載',
  'テレビ・ラジオ取材',
  'Webメディア掲載',
  'SNSでの紹介・シェア',
  'インタビュー・コメント取材',
  'その他',
]

export default function MediaPage() {
  const [form, setForm] = useState({ media: '', name: '', email: '', purpose: '', message: '' })
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/media-contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setLoading(false)
    setDone(true)
  }

  return (
    <main className="min-h-screen bg-kuma-bg text-kuma-ink">
      <Header title="メディア・取材" icon="📰" />

      <div className="max-w-[1120px] mx-auto px-5 lg:px-12 py-6 lg:py-10">
        {/* ヒーロー */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-kuma-primary/10 border border-kuma-primary rounded-full px-4 py-1.5 text-xs font-extrabold text-kuma-primary mb-3">
            📰 メディア・取材窓口
          </div>
          <h1 className="text-[22px] lg:text-[30px] font-extrabold">取材・メディア掲載のご依頼</h1>
          <p className="text-sm text-kuma-sub mt-2 leading-[1.75]">
            「くま！おる！熊！」に関する取材・掲載・インタビュー等のご依頼はこちらから。<br />
            3営業日以内にご返答いたします。
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-2 lg:gap-12">
          {/* 左：サービス概要 */}
          <div>
            <h2 className="text-[17px] font-extrabold mb-4">サービス概要</h2>
            <div className="bg-kuma-card border border-kuma-line rounded-2xl overflow-hidden mb-6">
              {FACTS.map((f, i) => (
                <div
                  key={f.label}
                  className={`flex gap-4 px-5 py-3.5 ${i < FACTS.length - 1 ? 'border-b border-kuma-line' : ''}`}
                >
                  <span className="text-xs text-kuma-faint w-[100px] shrink-0 leading-[1.8]">{f.label}</span>
                  <span className="text-sm font-bold text-kuma-ink leading-[1.8]">{f.value}</span>
                </div>
              ))}
            </div>

            <h2 className="text-[17px] font-extrabold mb-4">主な特徴</h2>
            <div className="space-y-3">
              {FEATURES.map(f => (
                <div key={f.title} className="bg-kuma-card border border-kuma-line rounded-xl p-4 flex gap-3">
                  <span className="text-xl shrink-0">{f.emoji}</span>
                  <div>
                    <p className="text-sm font-extrabold text-kuma-ink">{f.title}</p>
                    <p className="text-xs text-kuma-sub mt-0.5 leading-[1.7]">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右：申し込みフォーム */}
          <div className="mt-8 lg:mt-0">
            <h2 className="text-[17px] font-extrabold mb-4">取材・掲載のお申し込み</h2>
            {done ? (
              <div className="bg-kuma-card border border-kuma-line rounded-2xl p-8 text-center">
                <p className="text-4xl mb-3">📬</p>
                <p className="font-bold text-kuma-ink mb-1">お問い合わせありがとうございます！</p>
                <p className="text-sm text-kuma-sub">3営業日以内にご返答いたします。</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-kuma-card border border-kuma-line rounded-2xl p-5 space-y-4">
                <div>
                  <label className="text-xs font-extrabold text-kuma-sub block mb-1.5">媒体名・会社名</label>
                  <input
                    required
                    className="w-full bg-kuma-field border border-kuma-line rounded-xl px-3 py-2.5 text-sm text-kuma-ink placeholder-kuma-faint focus:outline-none focus:ring-2 focus:ring-kuma-primary"
                    placeholder="〇〇新聞 / 〇〇テレビ / 個人ブログ 等"
                    value={form.media}
                    onChange={e => setForm({ ...form, media: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-kuma-sub block mb-1.5">ご担当者名</label>
                  <input
                    required
                    className="w-full bg-kuma-field border border-kuma-line rounded-xl px-3 py-2.5 text-sm text-kuma-ink placeholder-kuma-faint focus:outline-none focus:ring-2 focus:ring-kuma-primary"
                    placeholder="山田 太郎"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-kuma-sub block mb-1.5">メールアドレス</label>
                  <input
                    type="email"
                    required
                    className="w-full bg-kuma-field border border-kuma-line rounded-xl px-3 py-2.5 text-sm text-kuma-ink placeholder-kuma-faint focus:outline-none focus:ring-2 focus:ring-kuma-primary"
                    placeholder="you@media.co.jp"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-kuma-sub block mb-1.5">目的・種別</label>
                  <select
                    className="w-full bg-kuma-field border border-kuma-line rounded-xl px-3 py-2.5 text-sm text-kuma-ink focus:outline-none focus:ring-2 focus:ring-kuma-primary"
                    value={form.purpose}
                    onChange={e => setForm({ ...form, purpose: e.target.value })}
                  >
                    <option value="">選択してください</option>
                    {PURPOSE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-extrabold text-kuma-sub block mb-1.5">取材内容・ご要望</label>
                  <textarea
                    required
                    rows={4}
                    className="w-full bg-kuma-field border border-kuma-line rounded-xl px-3 py-2.5 text-sm text-kuma-ink placeholder-kuma-faint focus:outline-none focus:ring-2 focus:ring-kuma-primary"
                    placeholder="取材の目的・内容・希望日程などをご記入ください"
                    value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-kuma-primary hover:opacity-90 disabled:opacity-50 text-kuma-primary-text rounded-xl py-3 font-extrabold text-sm transition-opacity"
                >
                  {loading ? '送信中...' : '送信する'}
                </button>
                <p className="text-[11px] text-kuma-faint text-center">3営業日以内にご連絡いたします</p>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
