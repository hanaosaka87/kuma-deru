import Link from 'next/link'
import Header from '@/components/kuma/Header'
import { OFFICIAL_LINKS, type RegionLinks } from '@/lib/officialLinks'

const REGION_COLOR: Record<string, string> = {
  sky: '#0EA5E9',
  emerald: '#10B981',
  violet: '#8B5CF6',
  cyan: '#22D3EE',
  rose: '#EC4899',
  indigo: '#6366F1',
  orange: '#F97316',
  amber: '#F59E0B',
}

function RegionCard({ region }: { region: RegionLinks }) {
  const color = REGION_COLOR[region.accent] ?? '#F5A524'
  return (
    <details className="group bg-kuma-card border border-kuma-line rounded-2xl shadow-sm overflow-hidden" open>
      <summary
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden"
        style={{ borderLeft: `5px solid ${color}` }}
      >
        <span className="text-[14.5px] font-extrabold text-kuma-ink">{region.emoji} {region.region}</span>
        <span className="text-[10.5px] font-extrabold rounded px-2 py-0.5" style={{ color, background: `${color}1f`, border: `1px solid ${color}55` }}>
          {region.prefectures.length}件
        </span>
        <span className="ml-auto text-base text-kuma-faint group-open:rotate-90 transition-transform">›</span>
      </summary>
      <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {region.prefectures.map(pref => (
          <div key={pref.name} className="rounded-xl border border-kuma-line p-3">
            <div className="text-xs font-extrabold text-kuma-ink mb-2">{pref.name}</div>
            <div className="flex flex-wrap gap-1.5">
              {pref.links.map(link => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11.5px] font-bold rounded-full px-2.5 py-1 border transition-opacity hover:opacity-80"
                  style={{ color, borderColor: `${color}55`, background: `${color}14` }}
                >
                  {link.label}<span style={{ color }}>↗</span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </details>
  )
}

export default function LinksPage() {
  const totalPrefs = OFFICIAL_LINKS.reduce((sum, r) => sum + r.prefectures.length, 0)

  return (
    <main className="min-h-screen bg-kuma-bg text-kuma-ink">
      <Header title="公式リンク集" icon="🗾" />

      <div className="max-w-[1120px] mx-auto px-5 lg:px-12 py-5 lg:py-10 space-y-5 lg:space-y-6">
        <div>
          <h1 className="text-[21px] lg:text-[28px] font-extrabold leading-[1.4]">公式情報に、まっすぐ。</h1>
          <p className="text-[12.5px] lg:text-sm leading-[1.7] text-kuma-sub mt-2">
            各都道府県・自治体が公開しているクマ出没情報マップ・お知らせページへの直リンク集です（全47都道府県掲載）。
            お住まいの地域や登山・お出かけ先の最新情報は、リンク先の公式情報をあわせてご確認ください。
            九州・沖縄地方はツキノワグマの生息域外のため、各県の野生動物担当ページを掲載しています。
          </p>
        </div>

        {/* モバイル：縦並び */}
        <div className="lg:hidden flex flex-col gap-2.5">
          {OFFICIAL_LINKS.map(region => (
            <RegionCard key={region.region} region={region} />
          ))}
        </div>

        {/* デスクトップ：2列グリッド */}
        <div className="hidden lg:grid lg:grid-cols-2 lg:gap-[18px]">
          {OFFICIAL_LINKS.map(region => (
            <RegionCard key={region.region} region={region} />
          ))}
        </div>

        {/* 環境省統計リンク */}
        <a
          href="https://www.env.go.jp/nature/choju/effort/effort12/effort12.html"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 bg-kuma-card border border-kuma-line rounded-2xl px-4 py-3.5 hover:border-kuma-primary transition-colors"
        >
          <span className="text-xl">🏛️</span>
          <span className="flex-1">
            <span className="block text-[13px] font-extrabold text-kuma-ink">環境省「クマ類の出没情報」</span>
            <span className="block text-[11px] text-kuma-faint">全国の公的統計・出典はこちら</span>
          </span>
          <span className="text-base text-kuma-primary">›</span>
        </a>

        <div className="flex gap-3 pt-2">
          <Link href="/areas" className="flex-1 bg-kuma-card border border-kuma-line rounded-2xl py-3.5 text-center shadow-sm hover:border-kuma-primary transition-colors">
            <div className="text-xl">📊</div>
            <div className="text-[12.5px] font-extrabold text-kuma-ink mt-1.5">地域別ランキング</div>
          </Link>
          <Link href="/guide" className="flex-1 bg-kuma-card border border-kuma-line rounded-2xl py-3.5 text-center shadow-sm hover:border-kuma-primary transition-colors">
            <div className="text-xl">📖</div>
            <div className="text-[12.5px] font-extrabold text-kuma-ink mt-1.5">安全ガイド</div>
          </Link>
        </div>
      </div>
    </main>
  )
}
