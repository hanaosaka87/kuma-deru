import Link from 'next/link'
import Header from '@/components/kuma/Header'

const RAKUTEN_AFF = '5501b187.bf7d1193.54fa4233.1bb11a0a'
const RAKUTEN_UT = 'eyJwYWdlIjoidXJsIiwidHlwZSI6InRleHQiLCJjb2wiOjF9'
const VC_SID = '3773661'
const VC_PID = '892639044'

const rakutenUrl = (searchUrl: string) =>
  `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFF}/?pc=${encodeURIComponent(searchUrl)}&link_type=text&ut=${RAKUTEN_UT}`

const yahooUrl = (keyword: string) =>
  `https://ck.jp.ap.valuecommerce.com/servlet/referral?sid=${VC_SID}&pid=${VC_PID}&vc_url=${encodeURIComponent(`https://shopping.yahoo.co.jp/search?p=${keyword}`)}`

const KUMA_ITEMS = [
  {
    name: 'クマ撃退スプレー',
    desc: '遭遇時に噴射するだけで撃退。有効距離5〜9m、安全ピン付き。山・農作業・キャンプに最重要アイテム。',
    tags: ['最重要', '即効性あり'],
    amazon: 'https://www.amazon.co.jp/s?k=熊撃退スプレー&i=sporting&tag=hanakuma22-22',
    rakuten: rakutenUrl('https://search.rakuten.co.jp/search/mall/熊撃退スプレー/'),
    yahoo: yahooUrl('熊撃退スプレー'),
  },
  {
    name: 'クマ鈴（大型・高音）',
    desc: '歩くたびに鳴り、クマを寄せ付けない。大型で音量が大きいものを選ぶこと。カラビナ付き。',
    tags: ['予防効果', '軽量'],
    amazon: 'https://www.amazon.co.jp/s?k=熊鈴+登山+大型+高音&tag=hanakuma22-22',
    rakuten: rakutenUrl('https://search.rakuten.co.jp/search/mall/熊鈴+登山+大型/'),
    yahoo: yahooUrl('熊鈴 登山 大型'),
  },
  {
    name: '緊急ホイッスル',
    desc: '110dB超の大音量で人を呼べる。緊急時・クマ遭遇時の両方に対応。防水・軽量。',
    tags: ['緊急用', 'コンパクト'],
    amazon: 'https://www.amazon.co.jp/s?k=緊急ホイッスル+登山+防水&tag=hanakuma22-22',
    rakuten: rakutenUrl('https://search.rakuten.co.jp/search/mall/緊急ホイッスル+登山/'),
    yahoo: yahooUrl('緊急ホイッスル 登山'),
  },
  {
    name: '高視認性ベスト（蛍光・反射材）',
    desc: '蛍光カラーと反射材で視認性を高める。ハンターとの誤認防止にも有効。',
    tags: ['高視認性', '誤認防止'],
    amazon: 'https://www.amazon.co.jp/s?k=高視認性ベスト+登山+蛍光+反射&tag=hanakuma22-22',
    rakuten: rakutenUrl('https://search.rakuten.co.jp/search/mall/高視認性ベスト+登山/'),
    yahoo: yahooUrl('高視認性ベスト 蛍光'),
  },
  {
    name: '登山用ファーストエイドキット',
    desc: '傷の応急処置から骨折固定まで対応。山岳用に厳選された最小限のセット。',
    tags: ['コンパクト', '必需品'],
    amazon: 'https://www.amazon.co.jp/s?k=登山+救急キット+ファーストエイド&tag=hanakuma22-22',
    rakuten: rakutenUrl('https://search.rakuten.co.jp/search/mall/登山+救急キット+ファーストエイド/'),
    yahoo: yahooUrl('登山 救急キット ファーストエイド'),
  },
  {
    name: 'エマージェンシーシート',
    desc: '体温保持・防風に効果的な緊急用保温シート。遭難時・低体温症の予防に必携。',
    tags: ['超軽量', '防水・防風'],
    amazon: 'https://www.amazon.co.jp/s?k=エマージェンシーシート+登山+サバイバル&tag=hanakuma22-22',
    rakuten: rakutenUrl('https://search.rakuten.co.jp/search/mall/エマージェンシーシート+登山/'),
    yahoo: yahooUrl('エマージェンシーシート 登山'),
  },
]

const HIKING_ITEMS = [
  {
    name: 'トレッキングシューズ（防水）',
    desc: 'ゴアテックス防水・ハイカットで足首を守る。山岳地帯での安定歩行に必須。',
    tags: ['防水', 'ハイカット'],
    amazon: 'https://www.amazon.co.jp/s?k=トレッキングシューズ+防水+ゴアテックス+ハイカット&tag=hanakuma22-22',
    rakuten: rakutenUrl('https://search.rakuten.co.jp/search/mall/トレッキングシューズ+防水+ゴアテックス/'),
    yahoo: yahooUrl('トレッキングシューズ 防水 ハイカット'),
  },
  {
    name: 'トレッキングポール',
    desc: '登下山の膝への負担を軽減。音出しによるクマ対策にも活用可能。軽量アルミ製。',
    tags: ['膝保護', '折りたたみ式'],
    amazon: 'https://www.amazon.co.jp/s?k=トレッキングポール+折りたたみ+軽量&tag=hanakuma22-22',
    rakuten: rakutenUrl('https://search.rakuten.co.jp/search/mall/トレッキングポール+軽量/'),
    yahoo: yahooUrl('トレッキングポール 軽量'),
  },
  {
    name: 'LEDヘッドライト（防水）',
    desc: '両手が使える高輝度ヘッドライト。暗がりでの視界確保・緊急時に。防水IPX4以上。',
    tags: ['300lm以上', '防水'],
    amazon: 'https://www.amazon.co.jp/s?k=ヘッドライト+登山+防水+LED+300ルーメン&tag=hanakuma22-22',
    rakuten: rakutenUrl('https://search.rakuten.co.jp/search/mall/ヘッドライト+登山+防水+LED/'),
    yahoo: yahooUrl('ヘッドライト 登山 防水 LED'),
  },
]

function ItemCard({ item }: { item: typeof KUMA_ITEMS[0] }) {
  return (
    <div className="bg-kuma-card border border-kuma-line rounded-2xl p-5 flex flex-col gap-3 shadow-sm">
      <div className="flex-1">
        <div className="flex gap-1.5 flex-wrap mb-2">
          {item.tags.map(t => (
            <span
              key={t}
              className="text-[10.5px] font-extrabold bg-kuma-primary/15 text-kuma-primary border border-kuma-primary/30 rounded-full px-2.5 py-0.5"
            >
              {t}
            </span>
          ))}
        </div>
        <h3 className="text-[15px] font-extrabold text-kuma-ink">{item.name}</h3>
        <p className="text-[12.5px] text-kuma-sub mt-2 leading-[1.7]">{item.desc}</p>
      </div>
      <div className="flex gap-1.5">
        <a
          href={item.amazon}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="flex-1 text-center text-[11.5px] font-extrabold bg-[#FF9900] text-black rounded-xl py-2.5 hover:opacity-85 transition-opacity"
        >
          🛒 Amazon
        </a>
        <a
          href={item.rakuten}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="flex-1 text-center text-[11.5px] font-extrabold bg-[#BF0000] text-white rounded-xl py-2.5 hover:opacity-85 transition-opacity"
        >
          🛒 楽天
        </a>
        <a
          href={item.yahoo}
          target="_blank"
          rel="nofollow noopener noreferrer sponsored"
          className="flex-1 text-center text-[11.5px] font-extrabold text-white rounded-xl py-2.5 hover:opacity-85 transition-opacity"
          style={{ background: '#FF5500' }}
        >
          🛒 Yahoo!
        </a>
      </div>
    </div>
  )
}

export default function GearPage() {
  return (
    <main className="min-h-screen bg-kuma-bg text-kuma-ink">
      <Header title="クマ対策グッズガイド" icon="🛡️" />

      <div className="max-w-[1120px] mx-auto px-5 lg:px-12 py-6 lg:py-10">
        {/* ヘッダー */}
        <div className="mb-6 lg:mb-8">
          <h1 className="text-[22px] lg:text-[30px] font-extrabold">🐻 クマ対策グッズ完全ガイド</h1>
          <p className="text-sm text-kuma-sub mt-2 leading-[1.7]">
            出没情報が増える今こそ備えを。Amazon・楽天・Yahoo!ショッピングの高評価品から厳選しました。
          </p>
          <div className="mt-3 inline-flex items-center gap-2 bg-[#2A0E0E] border border-[#4d1f1f] rounded-xl px-4 py-2 text-xs text-kuma-accent">
            <span>⚠️</span>
            <span>本ページのリンクはアフィリエイトリンクを含みます。購入価格に変わりはありません。</span>
          </div>
        </div>

        {/* バナー3社 */}
        <div className="mb-4 bg-[#FF9900]/10 border border-[#FF9900]/40 rounded-2xl p-5 lg:p-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">🛒</span>
            <div>
              <p className="text-sm lg:text-base font-extrabold text-kuma-ink">クマ対策グッズを全部まとめて見る</p>
              <p className="text-xs text-kuma-sub mt-0.5">Amazonで「クマ対策グッズ」100件以上を一覧で検索</p>
            </div>
          </div>
          <a
            href="https://www.amazon.co.jp/s?k=クマ対策グッズ&tag=hanakuma22-22"
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="block w-full text-center text-sm font-extrabold bg-[#FF9900] text-black rounded-xl py-3 hover:opacity-85 transition-opacity"
          >
            🛒 Amazonでクマ対策グッズを検索する →
          </a>
          <p className="text-[11px] text-kuma-faint mt-2 text-center">アフィリエイトリンク｜購入価格は変わりません</p>
        </div>

        <div className="mb-4 bg-[#BF0000]/10 border border-[#BF0000]/40 rounded-2xl p-5 lg:p-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">🛒</span>
            <div>
              <p className="text-sm lg:text-base font-extrabold text-kuma-ink">クマ対策グッズを楽天で見る</p>
              <p className="text-xs text-kuma-sub mt-0.5">楽天市場で「クマ対策グッズ」をまとめて検索</p>
            </div>
          </div>
          <a
            href={rakutenUrl('https://search.rakuten.co.jp/search/mall/熊対策グッズ/')}
            target="_blank"
            rel="nofollow noopener noreferrer sponsored"
            className="block w-full text-center text-sm font-extrabold bg-[#BF0000] text-white rounded-xl py-3 hover:opacity-85 transition-opacity"
          >
            🛒 楽天市場でクマ対策グッズを検索する →
          </a>
          <p className="text-[11px] text-kuma-faint mt-2 text-center">アフィリエイトリンク｜購入価格は変わりません</p>
        </div>

        <div className="mb-10 border rounded-2xl p-5 lg:p-6" style={{ background: 'rgba(255,80,0,0.08)', borderColor: 'rgba(255,80,0,0.35)' }}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">🛒</span>
            <div>
              <p className="text-sm lg:text-base font-extrabold text-kuma-ink">クマ対策グッズをYahoo!ショッピングで見る</p>
              <p className="text-xs text-kuma-sub mt-0.5">Yahoo!ショッピングで「クマ対策グッズ」をまとめて検索</p>
            </div>
          </div>
          <a
            href={yahooUrl('クマ対策グッズ')}
            target="_blank"
            rel="nofollow noopener noreferrer sponsored"
            className="block w-full text-center text-sm font-extrabold text-white rounded-xl py-3 hover:opacity-85 transition-opacity"
            style={{ background: '#FF5500' }}
          >
            🛒 Yahoo!ショッピングでクマ対策グッズを検索する →
          </a>
          <p className="text-[11px] text-kuma-faint mt-2 text-center">アフィリエイトリンク｜購入価格は変わりません</p>
        </div>

        {/* クマ対策グッズ */}
        <section className="mb-12">
          <h2 className="text-[17px] lg:text-[20px] font-extrabold mb-1 pb-2 border-b-2 border-kuma-accent flex items-center gap-2">
            🧨 クマ対策グッズ・緊急装備
            <span className="text-xs font-bold text-kuma-accent bg-kuma-accent/10 border border-kuma-accent/30 rounded-full px-2.5 py-0.5">必携</span>
          </h2>
          <p className="text-xs text-kuma-sub mb-4">山・農作業・キャンプ・通勤路など、クマ出没エリアに入るなら必ず用意してください。</p>
          <div className="grid lg:grid-cols-3 gap-4">
            {KUMA_ITEMS.map(item => <ItemCard key={item.name} item={item} />)}
          </div>
        </section>

        {/* 登山装備 */}
        <section className="mb-10">
          <h2 className="text-[17px] lg:text-[19px] font-extrabold mb-1 pb-2 border-b border-kuma-line flex items-center gap-2">
            🥾 登山装備
            <span className="text-xs font-bold text-kuma-sub bg-kuma-field border border-kuma-line rounded-full px-2.5 py-0.5">あわせて備えよう</span>
          </h2>
          <p className="text-xs text-kuma-sub mb-4">クマ対策と合わせて揃えておきたい登山・アウトドア基本装備です。</p>
          <div className="grid lg:grid-cols-3 gap-4">
            {HIKING_ITEMS.map(item => <ItemCard key={item.name} item={item} />)}
          </div>
        </section>

        {/* 安全ガイドへの誘導 */}
        <div className="mt-6 bg-kuma-card border border-kuma-line rounded-2xl p-6 text-center">
          <p className="text-sm font-bold text-kuma-ink mb-2">🐻 クマに遭遇したときの正しい対処法も確認しよう</p>
          <Link
            href="/guide"
            className="inline-block text-sm font-extrabold text-kuma-primary hover:underline"
          >
            熊の安全ガイドを読む →
          </Link>
        </div>
      </div>
    </main>
  )
}
