'use client'

import { useState } from 'react'

type Mode = 'menu' | 'review' | 'feedback'

const CATEGORIES = [
  { value: 'bug', label: '🐛 バグ報告' },
  { value: 'request', label: '💡 改善要望' },
  { value: 'other', label: '💬 その他' },
]

const btnPrimary: React.CSSProperties = {
  width: '100%', padding: '12px', borderRadius: '999px', border: 'none',
  background: 'linear-gradient(135deg, #7C3AED, #4C1D95)',
  color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
}
const btnMenu: React.CSSProperties = {
  width: '100%', padding: '14px', borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.05)',
  color: '#fff7ed', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem',
  textAlign: 'left',
}
const textareaStyle: React.CSSProperties = {
  width: '100%', borderRadius: '12px', padding: '10px 14px',
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff7ed', resize: 'none', fontSize: '0.875rem',
  fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
}

export default function FeedbackWidget({ appName }: { appName: string }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('menu')
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [category, setCategory] = useState('request')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const reset = () => {
    setOpen(false); setMode('menu'); setRating(0); setHover(0)
    setComment(''); setCategory('request'); setBody(''); setDone(false)
  }

  const submitReview = async () => {
    if (rating === 0) return
    setLoading(true)
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'review', appName, rating, comment }),
    }).catch(() => {})
    setLoading(false); setDone(true)
  }

  const submitFeedback = async () => {
    if (!body.trim()) return
    setLoading(true)
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'feedback', appName, category, body: body.trim() }),
    }).catch(() => {})
    setLoading(false); setDone(true)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="レビュー・フィードバック"
        style={{
          position: 'fixed', bottom: '20px', left: '16px', zIndex: 9999,
          padding: '4px 11px', borderRadius: '999px',
          background: 'linear-gradient(135deg, #7C3AED, #4C1D95)',
          border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', gap: '5px',
          color: '#fff', fontWeight: 700,
        }}
      >
        <span style={{ fontSize: '10px' }}>💬</span>
        <span style={{ display: 'flex', flexDirection: 'column', fontSize: '0.52rem', lineHeight: 1.45, whiteSpace: 'nowrap' }}>
          <span>レビュー・</span>
          <span>フィードバック</span>
        </span>
      </button>

      {open && (
        <div
          onClick={reset}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#1c1410', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '360px',
              color: '#fff7ed',
            }}
          >
            {done ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <p style={{ fontSize: '2rem', marginBottom: '12px' }}>🙏</p>
                <p style={{ fontWeight: 700, marginBottom: '8px' }}>ありがとうございます！</p>
                <p style={{ color: 'rgba(255,247,237,0.55)', fontSize: '0.85rem', marginBottom: '20px' }}>
                  {mode === 'review' ? 'レビューを受け付けました。' : 'フィードバックを受け付けました。'}
                </p>
                <button onClick={reset} style={btnPrimary}>閉じる</button>
              </div>
            ) : mode === 'menu' ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <p style={{ fontWeight: 700 }}>ご意見をお聞かせください</p>
                  <button onClick={reset} style={{ background: 'none', border: 'none', color: 'rgba(255,247,237,0.4)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button onClick={() => setMode('review')} style={btnMenu}>⭐ レビュー（星で評価）</button>
                  <button onClick={() => setMode('feedback')} style={btnMenu}>💬 フィードバック（改善要望・バグ）</button>
                </div>
              </>
            ) : mode === 'review' ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <p style={{ fontWeight: 700 }}>⭐ レビュー</p>
                  <button onClick={() => setMode('menu')} style={{ background: 'none', border: 'none', color: 'rgba(255,247,237,0.4)', cursor: 'pointer', fontSize: '0.8rem' }}>← もどる</button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
                  {[1,2,3,4,5].map(s => (
                    <button key={s} onClick={() => setRating(s)}
                      onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '2rem' }}>
                      {s <= (hover || rating) ? '⭐' : '☆'}
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p style={{ textAlign: 'center', color: 'rgba(255,247,237,0.55)', fontSize: '0.8rem', marginBottom: '12px' }}>
                    {['','もう少し頑張ります','改善します','普通','良かった！','最高！'][rating]}
                  </p>
                )}
                <textarea value={comment} onChange={e => setComment(e.target.value)}
                  placeholder="コメント（任意）" rows={3}
                  style={{ ...textareaStyle, marginBottom: '16px' }} />
                <button onClick={submitReview} disabled={rating === 0 || loading} style={{ ...btnPrimary, opacity: rating === 0 || loading ? 0.5 : 1 }}>
                  {loading ? '送信中...' : '送信する'}
                </button>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <p style={{ fontWeight: 700 }}>💬 フィードバック</p>
                  <button onClick={() => setMode('menu')} style={{ background: 'none', border: 'none', color: 'rgba(255,247,237,0.4)', cursor: 'pointer', fontSize: '0.8rem' }}>← もどる</button>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  {CATEGORIES.map(c => (
                    <button key={c.value} onClick={() => setCategory(c.value)}
                      style={{
                        flex: 1, padding: '8px 4px', borderRadius: '10px', border: '1px solid',
                        borderColor: category === c.value ? '#7C3AED' : 'rgba(255,255,255,0.1)',
                        background: category === c.value ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.05)',
                        color: category === c.value ? '#C4B5FD' : 'rgba(255,247,237,0.55)',
                        cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600,
                      }}>
                      {c.label}
                    </button>
                  ))}
                </div>
                <textarea value={body} onChange={e => setBody(e.target.value)}
                  placeholder="内容を入力してください" rows={4}
                  style={{ ...textareaStyle, marginBottom: '16px' }} />
                <button onClick={submitFeedback} disabled={!body.trim() || loading} style={{ ...btnPrimary, opacity: !body.trim() || loading ? 0.5 : 1 }}>
                  {loading ? '送信中...' : '送信する'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
