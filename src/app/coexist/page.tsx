'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Header from '@/components/kuma/Header'

type Idea = {
  id: string
  created_at: string
  title: string
  body: string
  category: string
  author_name: string
  likes: number
}

const CATEGORIES = [
  { key: 'すべて', emoji: '🌏' },
  { key: '農業・農地対策', emoji: '🌾' },
  { key: '生活圏対策', emoji: '🏘️' },
  { key: '観察・研究', emoji: '🔭' },
  { key: '教育・啓発', emoji: '📚' },
  { key: 'テクノロジー活用', emoji: '💻' },
  { key: '地域連携', emoji: '🤝' },
  { key: 'その他', emoji: '💡' },
]

const CATEGORY_EMOJI: Record<string, string> = Object.fromEntries(CATEGORIES.map(c => [c.key, c.emoji]))

const EMPTY_FORM = { title: '', body: '', category: '農業・農地対策', author_name: '' }

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return 'たった今'
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`
  return `${Math.floor(diff / 86400)}日前`
}

export default function CoexistPage() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [total, setTotal] = useState(0)
  const [category, setCategory] = useState('すべて')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [localLikes, setLocalLikes] = useState<Record<string, number>>({})
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('kuma_coexist_liked')
      if (stored) setLikedIds(new Set(JSON.parse(stored)))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    setPage(1)
    setIdeas([])
    fetchIdeas(category, 1, true)
  }, [category]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchIdeas(cat: string, pg: number, reset: boolean) {
    if (reset) setLoading(true)
    else setLoadingMore(true)
    try {
      const params = new URLSearchParams({ page: String(pg) })
      if (cat !== 'すべて') params.set('category', cat)
      const res = await fetch(`/api/coexist?${params}`)
      const data = await res.json()
      if (data.ok) {
        setIdeas(prev => reset ? data.ideas : [...prev, ...data.ideas])
        setTotal(data.total)
        setPage(pg)
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  async function handleLike(idea: Idea) {
    if (likedIds.has(idea.id)) return
    const newLiked = new Set([...likedIds, idea.id])
    setLikedIds(newLiked)
    setLocalLikes(prev => ({ ...prev, [idea.id]: (prev[idea.id] ?? idea.likes) + 1 }))
    try {
      localStorage.setItem('kuma_coexist_liked', JSON.stringify([...newLiked]))
    } catch { /* ignore */ }
    fetch('/api/coexist/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: idea.id }),
    }).catch(() => {})
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.body.trim()) return
    setSubmitting(true)
    setSubmitResult(null)
    try {
      const res = await fetch('/api/coexist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.ok) {
        setSubmitResult({ ok: true, msg: '投稿しました！ありがとうございます 🌿' })
        setForm(EMPTY_FORM)
        setShowForm(false)
        setTimeout(() => fetchIdeas(category, 1, true), 300)
      } else {
        setSubmitResult({ ok: false, msg: data.error || '投稿に失敗しました' })
      }
    } catch {
      setSubmitResult({ ok: false, msg: 'ネットワークエラーが発生しました' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-kuma-bg text-kuma-ink">
      <Header title="共存アイデア集" icon="🌿" />

      <div className="max-w-[860px] mx-auto px-5 lg:px-12 py-6 lg:py-10">

        {/* Hero */}
        <div className="mb-8 lg:mb-10">
          <div className="inline-flex items-center gap-2 bg-[#0A1F0A] border border-[#1a4a1a] rounded-full px-3.5 py-1.5 text-[11px] font-extrabold text-[#4ade80] mb-4 tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />くまもりの目的
          </div>
          <h1 className="text-[24px] lg:text-[34px] font-extrabold leading-[1.3] tracking-tight">
            熊は増え続ける。<br />
            <span className="text-[#4ade80]">人と熊が共に生きる</span>アイデアを集めよう。
          </h1>
          <p className="text-[13px] lg:text-[15px] leading-[1.85] text-kuma-sub mt-4 max-w-[620px]">
            温暖化・森林の変化・食料不足により、クマの生息域は年々拡大しています。
            排除するだけが答えではなく、私たちとクマが同じ地球に生きていくための知恵を、
            みんなで持ち寄りましょう。あなたの地域の工夫が、誰かの命を救うかもしれません。
          </p>

          <div className="flex items-center gap-5 mt-6 flex-wrap">
            <div className="text-center">
              <div className="text-[26px] font-extrabold text-[#4ade80]">{total}</div>
              <div className="text-[11px] text-kuma-faint mt-0.5">集まったアイデア</div>
            </div>
            <div className="h-10 w-px bg-kuma-line" />
            <div className="text-center">
              <div className="text-[26px] font-extrabold text-kuma-primary">{CATEGORIES.length - 1}</div>
              <div className="text-[11px] text-kuma-faint mt-0.5">カテゴリ</div>
            </div>
            <div className="h-10 w-px bg-kuma-line hidden sm:block" />
            <button
              onClick={() => { setShowForm(v => !v); setSubmitResult(null) }}
              className="rounded-xl px-5 py-2.5 text-[13.5px] font-extrabold hover:opacity-90 transition-opacity"
              style={{ background: '#4ade80', color: '#0a0a0a' }}
            >
              {showForm ? '✕ 閉じる' : '＋ アイデアを投稿する'}
            </button>
          </div>
        </div>

        {/* 成功メッセージ */}
        {submitResult?.ok && (
          <div className="mb-6 bg-[#0A1F0A] border border-[#1a4a1a] rounded-2xl px-5 py-4 flex items-center gap-3">
            <span className="text-2xl">🌿</span>
            <p className="text-[13.5px] font-bold text-[#4ade80]">{submitResult.msg}</p>
          </div>
        )}

        {/* 投稿フォーム */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mb-8 bg-kuma-card border border-kuma-line rounded-2xl p-5 lg:p-7 space-y-5"
          >
            <h2 className="text-[16px] font-extrabold text-kuma-ink">アイデアを投稿</h2>

            <div>
              <label className="block text-[11.5px] font-bold text-kuma-sub mb-2">
                カテゴリ <span className="text-kuma-accent">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.filter(c => c.key !== 'すべて').map(c => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, category: c.key }))}
                    className={`text-[12px] font-bold rounded-full px-3.5 py-1.5 border transition-colors ${
                      form.category === c.key
                        ? 'bg-[#4ade80]/20 border-[#4ade80]/60 text-[#4ade80]'
                        : 'border-kuma-line text-kuma-sub hover:border-kuma-faint'
                    }`}
                  >
                    {c.emoji} {c.key}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11.5px] font-bold text-kuma-sub mb-1.5">
                タイトル <span className="text-kuma-accent">*</span>
                <span className="ml-2 font-normal text-kuma-faint">（50文字以内）</span>
              </label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                maxLength={50}
                placeholder="例：農地の周囲に電気柵を設置して被害を防ぐ"
                className="w-full bg-kuma-field border border-kuma-line rounded-xl px-4 py-3 text-[13.5px] text-kuma-ink placeholder:text-kuma-faint focus:border-[#4ade80]/50 focus:outline-none transition-colors"
              />
              <div className="text-right text-[11px] text-kuma-faint mt-1">{form.title.length} / 50</div>
            </div>

            <div>
              <label className="block text-[11.5px] font-bold text-kuma-sub mb-1.5">
                アイデアの詳細 <span className="text-kuma-accent">*</span>
                <span className="ml-2 font-normal text-kuma-faint">（500文字以内）</span>
              </label>
              <textarea
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                maxLength={500}
                rows={6}
                placeholder="具体的な方法、実施した地域での効果、参考になる事例、コスト感など。どんな小さなアイデアでもOKです。"
                className="w-full bg-kuma-field border border-kuma-line rounded-xl px-4 py-3 text-[13.5px] text-kuma-ink placeholder:text-kuma-faint focus:border-[#4ade80]/50 focus:outline-none transition-colors resize-none"
              />
              <div className="text-right text-[11px] text-kuma-faint mt-1">{form.body.length} / 500</div>
            </div>

            <div>
              <label className="block text-[11.5px] font-bold text-kuma-sub mb-1.5">
                ニックネーム
                <span className="ml-2 font-normal text-kuma-faint">（任意・20文字以内）</span>
              </label>
              <input
                value={form.author_name}
                onChange={e => setForm(f => ({ ...f, author_name: e.target.value }))}
                maxLength={20}
                placeholder="名無し"
                className="w-full bg-kuma-field border border-kuma-line rounded-xl px-4 py-3 text-[13.5px] text-kuma-ink placeholder:text-kuma-faint focus:border-[#4ade80]/50 focus:outline-none transition-colors"
              />
            </div>

            {submitResult && !submitResult.ok && (
              <p className="text-[13px] font-bold text-kuma-accent">{submitResult.msg}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setShowForm(false); setSubmitResult(null) }}
                className="flex-1 rounded-xl py-3 text-[13.5px] font-bold text-kuma-sub border border-kuma-line hover:border-kuma-faint transition-colors"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={submitting || !form.title.trim() || !form.body.trim()}
                className="flex-1 rounded-xl py-3 text-[13.5px] font-extrabold disabled:opacity-40 hover:opacity-90 transition-opacity"
                style={{ background: '#4ade80', color: '#0a0a0a' }}
              >
                {submitting ? '送信中...' : '投稿する 🌿'}
              </button>
            </div>
          </form>
        )}

        {/* カテゴリフィルタ */}
        <div className="mb-5 flex gap-2 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`shrink-0 text-[12px] font-bold rounded-full px-3.5 py-1.5 border transition-colors whitespace-nowrap ${
                category === c.key
                  ? 'bg-[#4ade80]/20 border-[#4ade80]/60 text-[#4ade80]'
                  : 'border-kuma-line text-kuma-sub hover:border-kuma-faint'
              }`}
            >
              {c.emoji} {c.key}
            </button>
          ))}
        </div>

        {/* アイデア一覧 */}
        {loading ? (
          <div className="py-20 text-center text-kuma-faint text-sm">
            <div className="text-3xl mb-3 animate-pulse">🌿</div>
            読み込み中...
          </div>
        ) : ideas.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-5xl mb-4">🌱</div>
            <p className="text-kuma-faint text-sm mb-4">
              {category === 'すべて'
                ? 'まだアイデアはありません。最初の投稿者になりましょう！'
                : `「${category}」のアイデアはまだありません。`}
            </p>
            <button
              onClick={() => { setShowForm(true); setSubmitResult(null) }}
              className="text-[#4ade80] text-sm font-bold underline underline-offset-2"
            >
              アイデアを投稿する →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {ideas.map(idea => {
              const liked = likedIds.has(idea.id)
              const likeCount = localLikes[idea.id] ?? idea.likes
              return (
                <div key={idea.id} className="bg-kuma-card border border-kuma-line rounded-2xl p-5 hover:border-kuma-faint transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                        <span
                          className="text-[11px] font-extrabold rounded-full px-2.5 py-0.5 border"
                          style={{ background: '#4ade8015', color: '#4ade80', borderColor: '#4ade8040' }}
                        >
                          {CATEGORY_EMOJI[idea.category]} {idea.category}
                        </span>
                        <span className="text-[11px] text-kuma-faint">
                          {idea.author_name} · {timeAgo(idea.created_at)}
                        </span>
                      </div>
                      <h3 className="text-[14.5px] lg:text-[15.5px] font-extrabold text-kuma-ink leading-snug">
                        {idea.title}
                      </h3>
                      <p className="text-[12.5px] lg:text-[13px] text-kuma-sub mt-2.5 leading-[1.8] whitespace-pre-wrap">
                        {idea.body}
                      </p>
                    </div>
                    <button
                      onClick={() => handleLike(idea)}
                      disabled={liked}
                      title={liked ? 'いいね済み' : 'いいね！'}
                      className={`shrink-0 flex flex-col items-center gap-1 rounded-2xl px-3.5 py-3 border transition-all ${
                        liked
                          ? 'border-[#4ade80]/40 bg-[#4ade80]/10'
                          : 'border-kuma-line hover:border-[#4ade80]/40 hover:bg-[#4ade80]/10'
                      }`}
                    >
                      <span className="text-[18px] leading-none">{liked ? '🌿' : '🤍'}</span>
                      <span className={`text-[12px] font-extrabold ${liked ? 'text-[#4ade80]' : 'text-kuma-faint'}`}>
                        {likeCount}
                      </span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* もっと見る */}
        {ideas.length < total && (
          <div className="mt-6 text-center">
            <button
              onClick={() => fetchIdeas(category, page + 1, false)}
              disabled={loadingMore}
              className="text-[13px] font-bold text-kuma-sub border border-kuma-line rounded-xl px-7 py-3 hover:border-kuma-faint transition-colors disabled:opacity-40"
            >
              {loadingMore ? '読み込み中...' : `さらに読み込む（残り ${total - ideas.length} 件）`}
            </button>
          </div>
        )}

        {/* 下部CTA */}
        <div className="mt-14 bg-kuma-card border border-kuma-line rounded-2xl p-6 lg:p-8 text-center">
          <div className="text-3xl mb-3">🐻🌿</div>
          <h2 className="text-[16px] lg:text-[18px] font-extrabold text-kuma-ink mb-2">
            くまもりは、情報共有と共存の両輪で動く。
          </h2>
          <p className="text-[12.5px] text-kuma-sub mb-5 leading-[1.75]">
            出没情報をリアルタイムで共有し、あなたのエリアに熊が現れたら即通知。
            地域の安全と共存のために、まず情報を繋げよう。
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href="/map"
              className="rounded-xl px-5 py-2.5 text-[13.5px] font-extrabold hover:opacity-90 transition-opacity"
              style={{ background: '#F5C400', color: '#1A1200' }}
            >
              🗺️ 出没地図を見る
            </Link>
            <Link
              href="/notify"
              className="rounded-xl px-5 py-2.5 text-[13.5px] font-extrabold hover:opacity-90 transition-opacity"
              style={{ background: '#F0E8D0', color: '#3D2906' }}
            >
              🔔 通知登録する
            </Link>
            <Link
              href="/guide"
              className="rounded-xl px-5 py-2.5 text-[13.5px] font-bold text-kuma-sub border border-kuma-line hover:border-kuma-faint transition-colors"
            >
              📖 安全ガイド
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
