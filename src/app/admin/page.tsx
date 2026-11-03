'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Bear from '@/components/kuma/Bear'

type Sighting = {
  id: number
  area: string | null
  prefecture: string | null
  status: string
  urgent: boolean
  description: string | null
  source: string
  sighted_at: string
  created_at: string
  report_count: number
  ai_size_estimate: string | null
  lat: number
  lng: number
}

type TweetQueueItem = {
  id: number
  sighting_id: number | null
  text: string
  status: string
  created_at: string
}

const STATUS_OPTIONS = ['目撃情報', '対応中', '確保済み', '駆除済み']
const STATUS_COLOR: Record<string, string> = {
  '目撃情報': '#D97706',
  '対応中': '#3B82F6',
  '確保済み': '#10B981',
  '駆除済み': '#6B7280',
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState(false)
  const [adminKey, setAdminKey] = useState('')
  const [sightings, setSightings] = useState<Sighting[]>([])
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState('全て')
  const [filterPref, setFilterPref] = useState('全て')
  const [search, setSearch] = useState('')
  const [cronRunning, setCronRunning] = useState(false)
  const [cronMsg, setCronMsg] = useState('')
  const [tweetQueue, setTweetQueue] = useState<TweetQueueItem[]>([])
  const [tweetDrafts, setTweetDrafts] = useState<Record<number, string>>({})
  const [tweetBusyId, setTweetBusyId] = useState<number | null>(null)

  const load = useCallback(async (key: string) => {
    setLoading(true)
    const res = await fetch('/api/admin/sightings', { headers: { 'x-admin-key': key } })
    const json = await res.json()
    setLoading(false)
    if (json.ok) setSightings(json.data)
  }, [])

  const loadTweetQueue = useCallback(async (key: string) => {
    const res = await fetch('/api/admin/tweet-queue', { headers: { 'x-admin-key': key } })
    const json = await res.json()
    if (json.ok) setTweetQueue(json.data)
  }, [])

  useEffect(() => {
    const saved = sessionStorage.getItem('kuma_admin_key')
    if (!saved) return
    fetch('/api/admin/sightings', { headers: { 'x-admin-key': saved } }).then(r => {
      if (r.ok) { setAuthed(true); setAdminKey(saved); load(saved); loadTweetQueue(saved) }
      else sessionStorage.removeItem('kuma_admin_key')
    })
  }, [load, loadTweetQueue])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/admin/sightings', { headers: { 'x-admin-key': password } })
    if (res.ok) {
      setAuthed(true)
      setAdminKey(password)
      sessionStorage.setItem('kuma_admin_key', password)
      load(password)
      loadTweetQueue(password)
    } else {
      setAuthError(true)
    }
  }

  const handleTweetApprove = async (item: TweetQueueItem) => {
    setTweetBusyId(item.id)
    const res = await fetch('/api/admin/tweet-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({ id: item.id, action: 'approve', text: tweetDrafts[item.id] }),
    })
    const json = await res.json()
    setTweetBusyId(null)
    if (json.ok) {
      setTweetQueue(prev => prev.filter(t => t.id !== item.id))
    } else {
      alert('X投稿に失敗しました: ' + json.error)
    }
  }

  const handleTweetReject = async (id: number) => {
    setTweetBusyId(id)
    const res = await fetch('/api/admin/tweet-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({ id, action: 'reject' }),
    })
    const json = await res.json()
    setTweetBusyId(null)
    if (json.ok) setTweetQueue(prev => prev.filter(t => t.id !== id))
  }

  const api = useCallback(async (method: string, body?: object) => {
    return fetch('/api/admin/sightings', {
      method,
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: body ? JSON.stringify(body) : undefined,
    }).then(r => r.json())
  }, [adminKey])

  const handleDelete = async (id: number) => {
    if (!confirm('この投稿を削除しますか？元に戻せません。')) return
    const json = await api('DELETE', { id })
    if (json.ok) setSightings(prev => prev.filter(s => s.id !== id))
    else alert('削除失敗: ' + json.error)
  }

  const handleStatusChange = async (id: number, status: string) => {
    const json = await api('PATCH', { id, status })
    if (json.ok) setSightings(prev => prev.map(s => s.id === id ? { ...s, status } : s))
  }

  const handleUrgentToggle = async (id: number, urgent: boolean) => {
    const json = await api('PATCH', { id, urgent: !urgent })
    if (json.ok) setSightings(prev => prev.map(s => s.id === id ? { ...s, urgent: !urgent } : s))
  }

  const runCron = async () => {
    setCronRunning(true)
    setCronMsg('')
    const res = await fetch('/api/admin/run-cron', {
      method: 'POST',
      headers: { 'x-admin-key': adminKey },
    })
    const json = await res.json()
    if (json.ok) {
      const r = json.result ?? {}
      const xNote = r.xEnabled ? `X取得${r.fetchedByOrigin?.x ?? 0}件` : 'X未設定'
      setCronMsg(`✅ ${r.inserted ?? 0}件追加（Google取得${r.fetchedByOrigin?.news ?? 0}件・Yahoo取得${r.fetchedByOrigin?.yahoo ?? 0}件・${xNote}）`)
      load(adminKey)
    } else {
      setCronMsg('❌ 失敗')
    }
    setCronRunning(false)
  }

  const prefectures = ['全て', ...Array.from(new Set(sightings.map(s => s.prefecture).filter(Boolean) as string[]))]

  const filtered = sightings.filter(s => {
    if (filterStatus === '緊急' && !s.urgent) return false
    if (filterStatus !== '全て' && filterStatus !== '緊急' && s.status !== filterStatus) return false
    if (filterPref !== '全て' && s.prefecture !== filterPref) return false
    if (search && !((s.area ?? '') + (s.description ?? '')).includes(search)) return false
    return true
  })

  const stats = {
    total: sightings.length,
    recent: sightings.filter(s => Date.now() - new Date(s.sighted_at).getTime() < 86400000).length,
    urgent: sightings.filter(s => s.urgent).length,
    news: sightings.filter(s => s.source === 'news_auto').length,
    x: sightings.filter(s => s.source === 'x_auto').length,
  }

  if (!authed) {
    return (
      <main className="min-h-screen bg-kuma-bg flex items-center justify-center px-4">
        <div className="bg-kuma-card border border-kuma-line rounded-2xl p-8 w-full max-w-sm shadow-xl">
          <div className="flex items-center gap-2.5 mb-6">
            <Bear size={32} />
            <div>
              <div className="font-extrabold text-kuma-primary text-sm">くま！おる！熊！</div>
              <div className="text-xs text-kuma-faint">管理者ログイン</div>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-bold text-kuma-ink block mb-1.5">管理者パスワード</label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setAuthError(false) }}
                placeholder="パスワードを入力"
                autoFocus
                required
                className="w-full bg-kuma-field border border-kuma-line rounded-xl px-4 py-3 text-sm text-kuma-ink placeholder-kuma-faint focus:outline-none focus:ring-2 focus:ring-kuma-primary"
              />
              {authError && <p className="text-xs text-kuma-accent mt-1.5">❌ パスワードが違います</p>}
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl font-extrabold text-sm text-kuma-primary-text bg-kuma-primary hover:opacity-90 transition-opacity"
            >
              ログイン
            </button>
          </form>
          <div className="mt-5 text-center">
            <Link href="/" className="text-xs text-kuma-faint hover:text-kuma-ink">← トップに戻る</Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-kuma-bg text-kuma-ink">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-kuma-bg/95 backdrop-blur-sm border-b border-kuma-line px-4 py-3 flex items-center justify-between" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-2">
          <Bear size={26} />
          <span className="font-extrabold text-kuma-primary text-[13px]">管理者ダッシュボード</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { load(adminKey); loadTweetQueue(adminKey) }}
            className="text-xs text-kuma-sub hover:text-kuma-ink px-2.5 py-1.5 rounded-lg border border-kuma-line"
          >
            🔄 再読込
          </button>
          <Link href="/map" className="text-xs text-kuma-primary font-bold px-2.5 py-1.5">← マップ</Link>
          <button
            onClick={() => { sessionStorage.removeItem('kuma_admin_key'); setAuthed(false); setAdminKey('') }}
            className="text-xs text-kuma-faint hover:text-kuma-accent"
          >
            ログアウト
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5 space-y-4">
        {/* 統計カード */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: '総投稿数', value: stats.total, color: '#6B7A98' },
            { label: '直近24h', value: stats.recent, color: '#D97706' },
            { label: '緊急中', value: stats.urgent, color: '#EF4444' },
            { label: 'ニュース自動', value: stats.news, color: '#3B82F6' },
            { label: 'X自動', value: stats.x, color: '#10B981' },
          ].map(c => (
            <div key={c.label} className="bg-kuma-card border border-kuma-line rounded-2xl p-4">
              <div className="text-xs text-kuma-faint mb-1">{c.label}</div>
              <div className="text-2xl font-extrabold" style={{ color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* ニュース手動集計 */}
        <div className="bg-kuma-card border border-kuma-line rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-sm font-bold text-kuma-ink">📰 ニュース集計（手動実行）</div>
            <div className="text-xs text-kuma-faint mt-0.5">Google News RSSから熊出没情報を取得・DB登録します（通常は毎日15:00 JSTに自動実行）</div>
          </div>
          <div className="flex items-center gap-2">
            {cronMsg && <span className="text-xs font-bold text-green-400">{cronMsg}</span>}
            <button
              onClick={runCron}
              disabled={cronRunning}
              className="text-xs font-bold px-4 py-2 rounded-lg bg-kuma-primary text-kuma-primary-text hover:opacity-90 disabled:opacity-50 transition-opacity whitespace-nowrap"
            >
              {cronRunning ? '実行中…' : '今すぐ実行'}
            </button>
          </div>
        </div>

        {/* Xツイート承認待ち */}
        <div className="bg-kuma-card border border-kuma-line rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="text-sm font-bold text-kuma-ink">📣 X投稿承認待ち</div>
            {tweetQueue.length > 0 && (
              <span className="text-[10px] font-extrabold bg-kuma-accent text-white px-1.5 py-0.5 rounded-full">{tweetQueue.length}</span>
            )}
          </div>
          <div className="text-xs text-kuma-faint mb-3">ニュース自動集約で生成された速報文です。内容を確認し、承認するとX（@hana_build）に投稿されます。</div>
          {tweetQueue.length === 0 ? (
            <div className="text-xs text-kuma-faint py-2">承認待ちのツイートはありません</div>
          ) : (
            <div className="space-y-3">
              {tweetQueue.map(item => (
                <div key={item.id} className="border border-kuma-line rounded-lg p-3">
                  <textarea
                    value={tweetDrafts[item.id] ?? item.text}
                    onChange={e => setTweetDrafts(prev => ({ ...prev, [item.id]: e.target.value }))}
                    rows={4}
                    className="w-full bg-kuma-field border border-kuma-line rounded-lg px-2.5 py-2 text-xs text-kuma-ink focus:outline-none focus:ring-1 focus:ring-kuma-primary"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-kuma-faint">{new Date(item.created_at).toLocaleString('ja-JP')}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleTweetReject(item.id)}
                        disabled={tweetBusyId === item.id}
                        className="text-[11px] font-bold px-3 py-1.5 rounded border border-kuma-line text-kuma-faint hover:text-kuma-ink disabled:opacity-50"
                      >
                        却下
                      </button>
                      <button
                        onClick={() => handleTweetApprove(item)}
                        disabled={tweetBusyId === item.id}
                        className="text-[11px] font-bold px-3 py-1.5 rounded bg-kuma-primary text-kuma-primary-text hover:opacity-90 disabled:opacity-50"
                      >
                        {tweetBusyId === item.id ? '投稿中…' : '投稿する'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* フィルター */}
        <div className="bg-kuma-card border border-kuma-line rounded-2xl p-4">
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="エリア・説明を検索…"
              className="bg-kuma-field border border-kuma-line rounded-lg px-3 py-1.5 text-sm text-kuma-ink placeholder-kuma-faint focus:outline-none focus:ring-1 focus:ring-kuma-primary min-w-[160px] flex-1"
            />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-kuma-field border border-kuma-line rounded-lg px-3 py-1.5 text-sm text-kuma-ink"
            >
              {['全て', '緊急', ...STATUS_OPTIONS].map(s => <option key={s}>{s}</option>)}
            </select>
            <select
              value={filterPref}
              onChange={e => setFilterPref(e.target.value)}
              className="bg-kuma-field border border-kuma-line rounded-lg px-3 py-1.5 text-sm text-kuma-ink"
            >
              {prefectures.map(p => <option key={p ?? ''}>{p}</option>)}
            </select>
            <span className="text-xs text-kuma-faint whitespace-nowrap">{filtered.length} / {sightings.length} 件</span>
          </div>
        </div>

        {/* 投稿一覧 */}
        {loading ? (
          <div className="text-center py-16 text-kuma-faint text-sm animate-pulse">読込中…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-kuma-faint text-sm">該当する投稿がありません</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(s => (
              <div
                key={s.id}
                className={`bg-kuma-card border rounded-xl p-4 transition-colors ${
                  s.urgent ? 'border-kuma-accent/50 bg-[#2a0e0e]/60' : 'border-kuma-line'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* 情報カラム */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      {s.urgent && (
                        <span className="text-[10px] font-extrabold bg-kuma-accent text-white px-1.5 py-0.5 rounded">
                          🆘 緊急
                        </span>
                      )}
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{
                          background: `${STATUS_COLOR[s.status] ?? '#6B7280'}22`,
                          color: STATUS_COLOR[s.status] ?? '#6B7280',
                        }}
                      >
                        {s.status}
                      </span>
                      {s.source === 'news_auto' && (
                        <span className="text-[10px] text-kuma-faint border border-kuma-line px-1.5 py-0.5 rounded">
                          📰 自動
                        </span>
                      )}
                      {s.source === 'x_auto' && (
                        <span className="text-[10px] text-kuma-faint border border-kuma-line px-1.5 py-0.5 rounded">
                          🐦 自動
                        </span>
                      )}
                      <span className="text-[10px] text-kuma-faint font-mono">#{s.id}</span>
                    </div>
                    <div className="font-bold text-sm text-kuma-ink">{s.area || '場所未設定'}</div>
                    {s.description && (
                      <div className="text-xs text-kuma-sub mt-0.5 line-clamp-2">{s.description}</div>
                    )}
                    {s.ai_size_estimate && (
                      <div className="text-xs text-kuma-primary mt-0.5">🤖 {s.ai_size_estimate}</div>
                    )}
                    <div className="text-[10px] text-kuma-faint mt-1.5 flex flex-wrap gap-2">
                      <span>🕐 {new Date(s.sighted_at).toLocaleString('ja-JP')}</span>
                      <span>📋 通報{s.report_count}件</span>
                      <span>📍 {s.lat.toFixed(4)}, {s.lng.toFixed(4)}</span>
                    </div>
                  </div>

                  {/* 操作カラム */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => handleUrgentToggle(s.id, s.urgent)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded border transition-colors ${
                        s.urgent
                          ? 'bg-kuma-accent text-white border-kuma-accent'
                          : 'bg-kuma-field text-kuma-faint border-kuma-line hover:border-kuma-accent hover:text-kuma-accent'
                      }`}
                    >
                      🆘 {s.urgent ? '解除' : '緊急'}
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-[10px] font-bold px-2.5 py-1 rounded border border-kuma-accent/60 text-kuma-accent bg-kuma-field hover:bg-kuma-accent hover:text-white transition-colors"
                    >
                      🗑️ 削除
                    </button>
                  </div>
                </div>

                {/* ステータス変更 */}
                <div className="flex gap-1 mt-2.5 flex-wrap">
                  {STATUS_OPTIONS.map(st => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(s.id, st)}
                      className="text-[10px] px-2.5 py-0.5 rounded border transition-colors font-bold"
                      style={
                        s.status === st
                          ? { background: STATUS_COLOR[st], borderColor: STATUS_COLOR[st], color: '#fff' }
                          : { background: 'var(--color-kuma-field)', borderColor: 'var(--color-kuma-line)', color: 'var(--color-kuma-faint)' }
                      }
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
