import Link from 'next/link'
import Bear from './Bear'

const NAV = [
  { href: '/timeline', label: 'タイムライン', icon: '📰' },
  { href: '/areas', label: '地域別ランキング', icon: '📊' },
  { href: '/guide', label: '安全ガイド', icon: '📖' },
  { href: '/coexist', label: '共存アイデア', icon: '🌿' },
  { href: '/links', label: '公式リンク集', icon: '🗾' },
]

export default function Header({ title, icon }: { title: string; icon: string }) {
  return (
    <>
      {/* モバイル */}
      <div className="lg:hidden flex items-center gap-2.5 px-4 py-3.5 bg-kuma-bg/90 backdrop-blur-sm border-b border-kuma-line sticky top-0 z-10">
        <Link href="/" className="text-lg text-kuma-ink leading-none">‹</Link>
        <span className="font-extrabold text-[15px] text-kuma-ink">{icon} {title}</span>
      </div>

      {/* デスクトップ */}
      <div className="hidden lg:flex items-center justify-between px-4 xl:px-8 h-[60px] bg-kuma-bg/90 backdrop-blur-sm border-b border-kuma-line sticky top-0 z-10">
        <div className="flex items-center gap-2.5 shrink-0">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Bear size={30} />
            <span className="font-extrabold text-[15px] text-kuma-primary whitespace-nowrap">くま！おる！熊！</span>
          </Link>
          <span className="text-sm font-extrabold text-kuma-ink ml-4 whitespace-nowrap">{icon} {title}</span>
        </div>
        <div className="flex items-center gap-3 xl:gap-5 shrink-0">
          {NAV.map(n => (
            <Link key={n.href} href={n.href} className="text-[13px] font-bold text-kuma-sub hover:text-kuma-ink transition-colors whitespace-nowrap">{n.icon} {n.label}</Link>
          ))}
          <Link href="/notify" className="rounded-xl px-4 py-2 text-[13px] font-extrabold bg-kuma-primary text-kuma-primary-text hover:opacity-90 transition-opacity whitespace-nowrap">🔔 通知登録</Link>
        </div>
      </div>
    </>
  )
}
