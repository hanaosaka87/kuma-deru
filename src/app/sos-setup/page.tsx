'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/kuma/Header'

const STORAGE_KEY = 'kuma_sos_contact'

export default function SosSetupPage() {
  const [email, setEmail] = useState('')
  const [saved, setSaved] = useState(false)
  const [current, setCurrent] = useState<string | null>(null)

  useEffect(() => {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v) setCurrent(v)
  }, [])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    localStorage.setItem(STORAGE_KEY, email)
    setCurrent(email)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleDelete = () => {
    localStorage.removeItem(STORAGE_KEY)
    setCurrent(null)
    setEmail('')
  }

  return (
    <main className="min-h-screen bg-kuma-bg text-kuma-ink">
      <Header title="SOS緊急連絡先の設定" icon="🆘" />

      <div className="max-w-lg mx-auto px-5 py-8">
        {/* 説明 */}
        <div className="bg-[#2d0000] border border-[#FF4444]/40 rounded-2xl p-5 mb-6">
          <h2 className="text-base font-extrabold text-[#FF4444] mb-2">🆘 SOSとは</h2>
          <p className="text-sm text-kuma-sub leading-relaxed">
            マップ画面の🆘SOSボタンを押すと、登録した緊急連絡先に現在地（GPS）付きのメールが自動送信されます。
            山・農作業・キャンプなど、熊が出没するエリアに行く前に登録してください。
          </p>
          <ul className="mt-3 space-y-1 text-xs text-kuma-faint">
            <li>✅ 110番ワンタップ発信</li>
            <li>✅ GPS位置情報を大画面表示（口頭で伝えやすく）</li>
            <li>✅ 登録した連絡先にGoogle マップURLつきメール自動送信</li>
            <li>✅ LINEへの位置情報シェア</li>
          </ul>
        </div>

        {/* 現在の登録 */}
        {current && (
          <div className="bg-kuma-card border border-green-600/40 rounded-2xl p-4 mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-green-400 font-bold mb-0.5">✅ 緊急連絡先 登録済み</p>
              <p className="text-sm text-kuma-ink font-bold">{current}</p>
            </div>
            <button
              onClick={handleDelete}
              className="text-xs text-kuma-accent hover:text-red-400 transition-colors ml-4 shrink-0"
            >
              削除
            </button>
          </div>
        )}

        {/* 登録フォーム */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-sm font-bold text-kuma-ink block mb-1.5">
              緊急連絡先のメールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="family@example.com"
              required
              className="w-full bg-kuma-field border border-kuma-line rounded-xl px-4 py-3 text-sm text-kuma-ink placeholder-kuma-faint focus:outline-none focus:ring-2 focus:ring-[#FF4444]"
            />
            <p className="text-xs text-kuma-faint mt-1.5">
              家族・友人など、緊急時にすぐ連絡できる方のアドレスを入力してください。
              このアドレスはこの端末にのみ保存され、外部に送信されません。
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl font-extrabold text-sm text-white transition-opacity hover:opacity-85"
            style={{ background: 'linear-gradient(135deg, #CC0000, #FF4444)' }}
          >
            {saved ? '✅ 保存しました！' : '🆘 緊急連絡先を登録する'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link
            href="/map"
            className="text-sm text-kuma-primary hover:underline"
          >
            ← マップに戻る
          </Link>
        </div>

        {/* 注意書き */}
        <div className="mt-8 bg-kuma-field border border-kuma-line rounded-xl p-4 text-xs text-kuma-faint space-y-1.5 leading-relaxed">
          <p>⚠️ このアプリは公式の緊急通報システムではありません。</p>
          <p>⚠️ 緊急時は必ず <strong className="text-kuma-ink">110番</strong>（警察）または <strong className="text-kuma-ink">119番</strong>（救急）に通報してください。</p>
          <p>⚠️ メール送信にはインターネット接続が必要です。</p>
        </div>
      </div>
    </main>
  )
}
