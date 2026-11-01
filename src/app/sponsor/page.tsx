'use client'

import { useState } from 'react'
import Header from '@/components/kuma/Header'

const PLANS = [
  {
    name: 'プラチナ',
    price: '10万円/月',
    color: '#B7A4FF',
    features: [
      '全ページヘッダーにロゴ・リンク掲載',
      'トップページ バナー広告（300×250）',
      '月1回スポンサード記事・SNS告知',
      '地図ページ内への広告表示',
      '月次レポート（PV・クリック数）',
    ],
  },
  {
    name: 'ゴールド',
    price: '3万円/月',
    color: '#F5A524',
    features: [
      'フッターへのロゴ・リンク掲載（全ページ）',
      'サイドバナー広告（160×600）',
      '四半期1回 SNS告知',
      '月次レポート（PV・クリック数）',
    ],
  },
  {
    name: 'シルバー',
    price: '1万円/月',
    color: '#93A1BC',
    features: [
      'フッターへのテキストリンク掲載（全ページ）',
      '四半期1回 SNS告知',
    ],
  },
]

export default function SponsorPage() {
  const [form, setForm] = useState({ company: '', name: '', email: '', plan: '', message: '' })
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/sponsor-contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setLoading(false)
    setDone(true)
  }

  return (
    <main className="min-h-screen bg-kuma-bg text-kuma-ink">
      <Header title="スポンサー募集" icon="🤝" />

      <div className="max-w-[1120px] mx-auto px-5 lg:px-12 py-6 lg:py-10">
        {/* ヒーロー */}
        <div className="mb-8">
          <h1 className="text-[22px] lg:text-[30px] font-extrabold">スポンサー募集</h1>
          <p className="text-sm text-kuma-sub mt-2 leading-[1.75]">
            「くま！おる！熊！」は、地域の安全を守るために完全無料で提供しているサービスです。<br />
            スポンサーのご支援で、より多くの地域・機能を届けられます。
          </p>
        </div>

        {/* 数字実績 */}
        <div className="grid grid-cols-3 gap-3 lg:gap-5 mb-10">
          {[
            ['全国47都道府県', '対応エリア'],
            ['完全無料', 'ユーザー向け'],
            ['即時通知', 'メール・LINE'],
          ].map(([a, b]) => (
            <div key={b} className="bg-kuma-card border border-kuma-line rounded-2xl p-4 text-center">
              <div className="text-[17px] lg:text-2xl font-extrabold text-kuma-primary">{a}</div>
              <div className="text-[11px] lg:text-xs text-kuma-sub mt-1">{b}</div>
            </div>
          ))}
        </div>

        {/* プラン */}
        <h2 className="text-[18px] font-extrabold mb-4">掲載プラン</h2>
        <div className="grid lg:grid-cols-3 gap-4 mb-10">
          {PLANS.map(plan => (
            <div key={plan.name} className="bg-kuma-card border border-kuma-line rounded-2xl p-5 flex flex-col">
              <div className="mb-4">
                <div
                  className="text-xs font-extrabold tracking-widest mb-1.5"
                  style={{ color: plan.color }}
                >
                  {plan.name}
                </div>
                <div className="text-[22px] font-extrabold" style={{ color: plan.color }}>
                  {plan.price}
                </div>
              </div>
              <ul className="space-y-2 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="text-[12.5px] text-kuma-sub flex items-start gap-1.5">
                    <span className="text-kuma-primary mt-0.5 shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, plan: plan.name }))}
                className="mt-4 w-full text-sm font-extrabold rounded-xl py-2.5 border-2 transition-colors"
                style={
                  form.plan === plan.name
                    ? { background: plan.color, borderColor: plan.color, color: '#0C1322' }
                    : { background: 'transparent', borderColor: plan.color, color: plan.color }
                }
              >
                {form.plan === plan.name ? '✓ 選択中' : 'このプランを選ぶ'}
              </button>
            </div>
          ))}
        </div>

        {/* 申し込みフォーム */}
        <div className="max-w-lg">
          <h2 className="text-[18px] font-extrabold mb-4">スポンサー申し込み</h2>
          {done ? (
            <div className="bg-kuma-card border border-kuma-line rounded-2xl p-8 text-center">
              <p className="text-4xl mb-3">🤝</p>
              <p className="font-bold text-kuma-ink mb-1">お申し込みありがとうございます！</p>
              <p className="text-sm text-kuma-sub">3営業日以内にご連絡いたします。</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-kuma-card border border-kuma-line rounded-2xl p-5 space-y-4">
              {[
                { label: '会社名・団体名', key: 'company', placeholder: '株式会社〇〇' },
                { label: 'ご担当者名', key: 'name', placeholder: '山田 太郎' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-extrabold text-kuma-sub block mb-1.5">{f.label}</label>
                  <input
                    required
                    className="w-full bg-kuma-field border border-kuma-line rounded-xl px-3 py-2.5 text-sm text-kuma-ink placeholder-kuma-faint focus:outline-none focus:ring-2 focus:ring-kuma-primary"
                    placeholder={f.placeholder}
                    value={form[f.key as 'company' | 'name']}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  />
                </div>
              ))}
              <div>
                <label className="text-xs font-extrabold text-kuma-sub block mb-1.5">メールアドレス</label>
                <input
                  type="email"
                  required
                  className="w-full bg-kuma-field border border-kuma-line rounded-xl px-3 py-2.5 text-sm text-kuma-ink placeholder-kuma-faint focus:outline-none focus:ring-2 focus:ring-kuma-primary"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-extrabold text-kuma-sub block mb-1.5">希望プラン</label>
                <select
                  className="w-full bg-kuma-field border border-kuma-line rounded-xl px-3 py-2.5 text-sm text-kuma-ink focus:outline-none focus:ring-2 focus:ring-kuma-primary"
                  value={form.plan}
                  onChange={e => setForm({ ...form, plan: e.target.value })}
                >
                  <option value="">選択してください</option>
                  {PLANS.map(p => (
                    <option key={p.name} value={p.name}>{p.name}（{p.price}）</option>
                  ))}
                  <option value="相談">まずは相談したい</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-extrabold text-kuma-sub block mb-1.5">メッセージ（任意）</label>
                <textarea
                  rows={3}
                  className="w-full bg-kuma-field border border-kuma-line rounded-xl px-3 py-2.5 text-sm text-kuma-ink placeholder-kuma-faint focus:outline-none focus:ring-2 focus:ring-kuma-primary"
                  placeholder="ご要望・ご質問があればご記入ください"
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-kuma-primary hover:opacity-90 disabled:opacity-50 text-kuma-primary-text rounded-xl py-3 font-extrabold text-sm transition-opacity"
              >
                {loading ? '送信中...' : '申し込む'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
