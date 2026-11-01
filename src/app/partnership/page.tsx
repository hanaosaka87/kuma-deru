'use client'

import { useState } from 'react'
import Link from 'next/link'
import Header from '@/components/kuma/Header'
import Bear from '@/components/kuma/Bear'

const BENEFITS = [
  {
    emoji: '⚡',
    title: 'リアルタイムで情報共有',
    desc: '住民からの目撃情報が即座に地図へ反映されます。通報から数秒以内に担当者へ情報が届きます。',
    color: '#F5A524',
  },
  {
    emoji: '🤖',
    title: 'AIが写真を自動分析',
    desc: '投稿された写真からAIが熊のサイズ・個体特徴・確信度を自動判定。文字だけでは分からない情報を補完します。',
    color: '#5B9BFF',
  },
  {
    emoji: '🔔',
    title: 'エリア別・役割別に通知',
    desc: '「自治体担当者」「猟友会」「学校・保護者」など役割ごとに通知先を登録。不要な通知を減らし、初動を最速に。',
    color: '#10B981',
  },
  {
    emoji: '🗓️',
    title: '詳細データは3ヶ月で自動削除',
    desc: '住民の安全のために必要な情報を共有しつつ、観光地・地域イメージへの恒久的な影響を防ぎます。',
    color: '#B7A4FF',
  },
  {
    emoji: '📊',
    title: '出没傾向の可視化',
    desc: '都道府県・市区町村ごとの出没件数・ランキングを一覧表示。季節・時間帯のパターン把握に活用できます。',
    color: '#EC4899',
  },
  {
    emoji: '📋',
    title: '通報テキストを自動生成',
    desc: '住民が目撃情報を投稿すると、警察・猟友会向けの通報テキストが自動生成されます。110番・#9110への連絡も簡単に。',
    color: '#6B7280',
  },
]

const FLOW = [
  { step: '①', emoji: '👀', label: '住民が目撃', desc: '地図をタップして現在地・写真・状況を投稿（登録不要）' },
  { step: '②', emoji: '🤖', label: 'AI自動分析', desc: '写真からサイズ・個体特徴・確信度を即時判定' },
  { step: '③', emoji: '⚡', label: '即時通知配信', desc: 'メール・LINEで登録エリアの住民・学校・自治体担当者に配信' },
  { step: '④', emoji: '🏛️', label: '自治体・猟友会対応', desc: 'ステータスを「対応中」「確保済み」に更新。住民への安心情報として反映' },
]

const ORG_TYPES = [
  '市区町村（農林水産・獣害対策担当）',
  '都道府県（自然環境・農政担当）',
  '警察署・交番',
  '猟友会（都道府県支部・地区支部）',
  '学校・教育委員会',
  '観光協会・地域団体',
  'その他',
]

export default function PartnershipPage() {
  const [form, setForm] = useState({ org: '', division: '', name: '', email: '', orgType: '', message: '' })
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [partnerKey, setPartnerKey] = useState('')
  const [exportError, setExportError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    setExportError(null)
    try {
      const res = await fetch('/api/partnership/export', { headers: { 'x-partner-key': partnerKey } })
      if (!res.ok) {
        setExportError(res.status === 401 ? 'パスワードが正しくありません' : 'エクスポートに失敗しました')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kuma_oru_export_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setExportError('エクスポートに失敗しました')
    } finally {
      setExporting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/partnership-contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setLoading(false)
    setDone(true)
  }

  return (
    <main className="min-h-screen bg-kuma-bg text-kuma-ink">
      <Header title="自治体・猟友会の方へ" icon="🏛️" />

      <div className="max-w-[1120px] mx-auto px-5 lg:px-12 py-6 lg:py-10 space-y-10 lg:space-y-14">

        {/* ヒーロー */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-kuma-primary/10 border border-kuma-primary rounded-full px-4 py-1.5 text-xs font-extrabold text-kuma-primary mb-4">
              🏛️ 自治体・猟友会・学校の担当者様へ
            </div>
            <h1 className="text-[22px] lg:text-[30px] font-extrabold leading-[1.35]">
              住民の「見た」が、<br />
              <span className="text-kuma-primary">行政の「動く」につながる。</span>
            </h1>
            <p className="text-sm text-kuma-sub mt-4 leading-[1.85]">
              「くま！おる！熊！」は、住民・自治体・猟友会をつなぐクマ出没情報プラットフォームです。
              住民が投稿した目撃情報を即座に共有し、担当者が対応状況を更新することで、地域全体の安全対応を最速化します。
            </p>
            <div className="flex gap-3 mt-5 flex-wrap">
              <Link
                href="/map"
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-extrabold text-kuma-primary-text bg-kuma-primary hover:opacity-90 transition-opacity"
              >
                🗺️ マップを見る
              </Link>
              <a
                href="#contact"
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-extrabold text-kuma-primary border border-kuma-primary hover:bg-kuma-primary/10 transition-colors"
              >
                📨 連携を申し込む
              </a>
            </div>
          </div>
          <div className="hidden lg:flex items-center justify-center">
            <div className="bg-kuma-card border border-kuma-line rounded-2xl p-8 text-center shadow-xl">
              <Bear size={80} className="mx-auto mb-4" />
              <p className="text-[13px] font-extrabold text-kuma-primary">くまもり</p>
              <p className="text-xs text-kuma-sub mt-1">人も、熊も、守る。</p>
            </div>
          </div>
        </div>

        {/* 連携フロー */}
        <div>
          <div className="text-[12px] font-extrabold tracking-[.14em] text-kuma-accent mb-3">COOPERATION FLOW</div>
          <h2 className="text-[18px] lg:text-[22px] font-extrabold mb-5">情報はこう流れます</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {FLOW.map((f, i) => (
              <div key={f.step} className="relative bg-kuma-card border border-kuma-line rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-[10px] font-extrabold text-kuma-primary bg-kuma-primary/10 border border-kuma-primary/30 rounded-full px-2 py-0.5">{f.step}</span>
                  <span className="text-xl">{f.emoji}</span>
                </div>
                <p className="text-sm font-extrabold text-kuma-ink">{f.label}</p>
                <p className="text-[11.5px] text-kuma-sub mt-1.5 leading-[1.65]">{f.desc}</p>
                {i < FLOW.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-kuma-primary text-lg font-extrabold">›</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 自治体・猟友会が得られるメリット */}
        <div>
          <div className="text-[12px] font-extrabold tracking-[.14em] text-kuma-accent mb-3">BENEFITS</div>
          <h2 className="text-[18px] lg:text-[22px] font-extrabold mb-5">連携で得られる6つのメリット</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BENEFITS.map(b => (
              <div key={b.title} className="bg-kuma-card border border-kuma-line rounded-2xl p-5 flex gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ background: `${b.color}1f` }}
                >
                  {b.emoji}
                </div>
                <div>
                  <p className="text-sm font-extrabold text-kuma-ink">{b.title}</p>
                  <p className="text-[11.5px] text-kuma-sub mt-1 leading-[1.65]">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 現在の対応状況 */}
        <div className="bg-kuma-panel border border-kuma-line rounded-2xl p-6 lg:p-8">
          <div className="text-[12px] font-extrabold tracking-[.14em] text-kuma-accent mb-3">CURRENT STATUS</div>
          <h2 className="text-[17px] lg:text-[20px] font-extrabold mb-4">現在の連携状況・今後の予定</h2>
          <div className="space-y-3">
            {[
              { label: '全国47都道府県の公式出没情報ページ', status: '掲載済み', done: true },
              { label: '目撃情報の即時通知（メール・LINE）', status: '提供中', done: true },
              { label: 'AI写真分析（サイズ・個体特徴・確信度）', status: '提供中', done: true },
              { label: '自治体・猟友会専用ダッシュボード（投稿管理・対応更新）', status: '開発中', done: false },
              { label: '行政向けAPIデータ提供（CSV出力・連携）', status: '提供中', done: true },
              { label: '猟友会エリア担当者への直接通知機能', status: '検討中', done: false },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <span className={`text-sm shrink-0 ${item.done ? 'text-green-400' : 'text-kuma-faint'}`}>
                  {item.done ? '✅' : '🔲'}
                </span>
                <span className="text-sm text-kuma-ink flex-1">{item.label}</span>
                <span
                  className="text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0"
                  style={item.done
                    ? { color: '#10B981', background: '#10B98122', border: '1px solid #10B98144' }
                    : { color: '#6B7280', background: '#6B728022', border: '1px solid #6B728044' }
                  }
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* よくある質問 */}
        <div>
          <div className="text-[12px] font-extrabold tracking-[.14em] text-kuma-accent mb-3">FAQ</div>
          <h2 className="text-[17px] lg:text-[20px] font-extrabold mb-4">よくあるご質問</h2>
          <div className="space-y-3">
            {[
              {
                q: '利用料金はかかりますか？',
                a: '住民・一般ユーザーの利用は完全無料です。自治体・猟友会との公式連携についても、現在は無償での試験的な連携を優先しています。詳細はお問い合わせください。',
              },
              {
                q: '個人情報はどう扱われますか？',
                a: '目撃情報の投稿は匿名で行えます。投稿者のIPアドレス等は収集していません。詳細情報は3ヶ月後に自動削除し、集計データのみ残します。',
              },
              {
                q: '投稿された情報の信頼性は？',
                a: '誤投稿・虚偽報告のリスクを軽減するため、①AI写真分析による確信度判定、②複数目撃による信頼度スコア、③管理者による削除機能を実装しています。',
              },
              {
                q: '公式機関として情報を更新・管理できますか？',
                a: '現在、自治体・猟友会向け専用ダッシュボードを開発中です。連携をご検討の場合はお問い合わせいただければ、優先的に対応します。',
              },
            ].map(item => (
              <details key={item.q} className="bg-kuma-card border border-kuma-line rounded-xl overflow-hidden group">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-kuma-panel transition-colors">
                  <span className="text-sm font-bold text-kuma-ink">{item.q}</span>
                  <span className="text-base text-kuma-faint group-open:rotate-90 transition-transform shrink-0 ml-2">›</span>
                </summary>
                <div className="px-5 pb-4 text-[12.5px] text-kuma-sub leading-[1.75]">{item.a}</div>
              </details>
            ))}
          </div>
        </div>

        {/* データエクスポート（自治体・研究者向け） */}
        <div className="bg-kuma-panel border border-kuma-line rounded-2xl p-6 lg:p-8">
          <div className="text-[12px] font-extrabold tracking-[.14em] text-kuma-accent mb-3">DATA EXPORT</div>
          <h2 className="text-[17px] lg:text-[20px] font-extrabold mb-2">📊 データエクスポート（自治体・研究者向け）</h2>
          <p className="text-[12.5px] text-kuma-sub leading-[1.75] mb-4">
            提携済みの自治体・研究機関の方向けに、目撃データのCSVエクスポートを提供しています。個人を特定しうる情報（説明文原文・投稿者情報等）は含まれません。
            アクセス用のパスワードは連携申し込み後に個別にお渡しします。
          </p>
          <div className="flex flex-col sm:flex-row gap-2 max-w-md">
            <input
              type="password"
              className="flex-1 bg-kuma-field border border-kuma-line rounded-xl px-3 py-2.5 text-sm text-kuma-ink placeholder-kuma-faint focus:outline-none focus:ring-2 focus:ring-kuma-primary"
              placeholder="提携先パスワード"
              value={partnerKey}
              onChange={e => setPartnerKey(e.target.value)}
            />
            <button
              type="button"
              onClick={handleExport}
              disabled={!partnerKey || exporting}
              className="shrink-0 bg-kuma-primary hover:opacity-90 disabled:opacity-50 text-kuma-primary-text rounded-xl px-5 py-2.5 font-extrabold text-sm transition-opacity"
            >
              {exporting ? 'ダウンロード中...' : 'CSVダウンロード'}
            </button>
          </div>
          {exportError && <p className="mt-2 text-xs text-kuma-accent">{exportError}</p>}
        </div>

        {/* 問い合わせフォーム */}
        <div id="contact" className="lg:grid lg:grid-cols-2 lg:gap-12">
          <div>
            <div className="text-[12px] font-extrabold tracking-[.14em] text-kuma-accent mb-3">CONTACT</div>
            <h2 className="text-[17px] lg:text-[20px] font-extrabold mb-3">連携・お問い合わせ</h2>
            <p className="text-sm text-kuma-sub leading-[1.75] mb-5">
              自治体・猟友会・学校・地域団体の担当者の方からのお問い合わせをお待ちしています。
              連携内容・ご要望はフォームよりご連絡ください。<br />
              <span className="text-kuma-ink font-bold">3営業日以内にご返答いたします。</span>
            </p>
            <div className="bg-kuma-card border border-kuma-line rounded-2xl p-5 space-y-2">
              <p className="text-xs font-extrabold text-kuma-ink">📧 直接連絡する</p>
              <a href="mailto:hana@trickster.biz" className="text-sm text-kuma-primary font-bold hover:underline">
                hana@trickster.biz
              </a>
              <p className="text-xs text-kuma-faint">件名に「行政連携」とご記入いただくと優先対応いたします。</p>
            </div>
          </div>

          <div className="mt-6 lg:mt-0">
            {done ? (
              <div className="bg-kuma-card border border-kuma-line rounded-2xl p-10 text-center">
                <p className="text-4xl mb-3">📬</p>
                <p className="font-bold text-kuma-ink mb-1">お問い合わせありがとうございます！</p>
                <p className="text-sm text-kuma-sub">3営業日以内にご連絡いたします。</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-kuma-card border border-kuma-line rounded-2xl p-5 space-y-4">
                <div>
                  <label className="text-xs font-extrabold text-kuma-sub block mb-1.5">組織・機関名 <span className="text-kuma-accent">*</span></label>
                  <input
                    required
                    className="w-full bg-kuma-field border border-kuma-line rounded-xl px-3 py-2.5 text-sm text-kuma-ink placeholder-kuma-faint focus:outline-none focus:ring-2 focus:ring-kuma-primary"
                    placeholder="〇〇市役所 / 〇〇猟友会 / 〇〇警察署"
                    value={form.org}
                    onChange={e => setForm({ ...form, org: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-kuma-sub block mb-1.5">担当部署・部門</label>
                  <input
                    className="w-full bg-kuma-field border border-kuma-line rounded-xl px-3 py-2.5 text-sm text-kuma-ink placeholder-kuma-faint focus:outline-none focus:ring-2 focus:ring-kuma-primary"
                    placeholder="農林水産課 / 環境課 / 猟友会大阪支部"
                    value={form.division}
                    onChange={e => setForm({ ...form, division: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-kuma-sub block mb-1.5">ご担当者名 <span className="text-kuma-accent">*</span></label>
                  <input
                    required
                    className="w-full bg-kuma-field border border-kuma-line rounded-xl px-3 py-2.5 text-sm text-kuma-ink placeholder-kuma-faint focus:outline-none focus:ring-2 focus:ring-kuma-primary"
                    placeholder="山田 太郎"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-kuma-sub block mb-1.5">メールアドレス <span className="text-kuma-accent">*</span></label>
                  <input
                    type="email"
                    required
                    className="w-full bg-kuma-field border border-kuma-line rounded-xl px-3 py-2.5 text-sm text-kuma-ink placeholder-kuma-faint focus:outline-none focus:ring-2 focus:ring-kuma-primary"
                    placeholder="tanaka@city.example.lg.jp"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-kuma-sub block mb-1.5">組織・機関の種別 <span className="text-kuma-accent">*</span></label>
                  <select
                    required
                    className="w-full bg-kuma-field border border-kuma-line rounded-xl px-3 py-2.5 text-sm text-kuma-ink focus:outline-none focus:ring-2 focus:ring-kuma-primary"
                    value={form.orgType}
                    onChange={e => setForm({ ...form, orgType: e.target.value })}
                  >
                    <option value="">選択してください</option>
                    {ORG_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-extrabold text-kuma-sub block mb-1.5">お問い合わせ内容 <span className="text-kuma-accent">*</span></label>
                  <textarea
                    required
                    rows={4}
                    className="w-full bg-kuma-field border border-kuma-line rounded-xl px-3 py-2.5 text-sm text-kuma-ink placeholder-kuma-faint focus:outline-none focus:ring-2 focus:ring-kuma-primary"
                    placeholder="連携の目的・ご要望・ご質問などをご記入ください"
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
                <p className="text-[11px] text-kuma-faint text-center">3営業日以内にご返答いたします</p>
              </form>
            )}
          </div>
        </div>

      </div>
    </main>
  )
}
