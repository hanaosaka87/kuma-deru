import Link from 'next/link'
import Header from '@/components/kuma/Header'
import Bear from '@/components/kuma/Bear'

const GUIDE: { n: string; e: string; title: string; lead: string; items: string[] }[] = [
  {
    n: '01',
    e: '🥾',
    title: '登山・ハイキング時の注意',
    lead: '出会わない工夫が、いちばんの対策。',
    items: [
      '早朝・夕方は熊の活動が活発になる時間帯です。日中の明るい時間帯の行動を心がけましょう。',
      '見通しの悪いやぶ・沢沿い・カーブの先などは特に注意が必要です。',
      '単独行動は避け、複数人での行動を基本としましょう。',
      '出発前に「くま！おる！熊！」のマップで直近の目撃情報を確認しましょう。',
    ],
  },
  {
    n: '02',
    e: '🔔',
    title: '熊に出会わないための基本',
    lead: '音を出し、匂いを残さない。',
    items: [
      '熊鈴・ラジオ・声を出すなど、人の存在を知らせる音を出しながら行動すると、熊の方から離れていくことが多いとされています。',
      '食べ物・生ゴミは匂いが漏れないよう密閉して持ち帰りましょう。野外に放置しないことが重要です。',
      '新しい足跡・糞・爪痕・掘り返し跡を見つけたら、引き返すことも検討しましょう。',
    ],
  },
  {
    n: '03',
    e: '📅',
    title: '季節別の活動パターン（目安）',
    lead: '春の冬眠明けと、秋の食欲期が要注意。',
    items: [
      '春（4〜6月）：冬眠明けで食料を求めて活発に行動します。山菜採りのシーズンと重なるため注意が必要です。',
      '夏（7〜8月）：標高の高い場所へ移動する個体が多いとされますが、人里近くでの目撃も発生します。',
      '秋（9〜11月）：冬眠に備えて行動範囲が広がり、ドングリ等の不作年は人里への出没が増える傾向があります。',
      '冬（12〜3月）：多くの個体は冬眠しますが、温暖な地域や近年は冬眠しない個体の目撃例も報告されています。',
    ],
  },
  {
    n: '04',
    e: '⚠️',
    title: '遭遇してしまったときの対処',
    lead: '背を向けて走らない。落ち着いて距離をとる。',
    items: [
      'まず落ち着いて、熊との距離を確認しましょう。慌てて走って逃げると、熊が追いかける本能を刺激する場合があります。',
      '熊に背を向けず、ゆっくりと後退しながらその場を離れましょう。',
      '遠くにいる場合は、熊が気づいていなければ静かにその場を離れます。',
      '至近距離で遭遇し、熊が攻撃的な姿勢を見せた場合は、リュックなどで身を守りつつ、撃退スプレーがあれば使用しましょう。',
      '負傷した場合や危険を感じた場合は、ためらわず110番（警察）または地域の緊急ダイヤル（#9110）・自治体に連絡してください。',
    ],
  },
  {
    n: '05',
    e: '🎒',
    title: '持ち物・装備ガイド',
    lead: '入山前に、装備をひとつずつ確認。',
    items: [
      '熊鈴：定番の対策グッズ。ザックなどに取り付けて音を鳴らしながら歩きます。',
      '熊撃退スプレー（クマよけスプレー）：至近距離での緊急用。事前に使用方法を確認し、すぐに取り出せる位置に携帯しましょう。',
      'ラジオ・ホイッスル：音を出す手段として有効です。',
      '携帯電話・モバイルバッテリー：通報・連絡手段の確保のために。',
    ],
  },
]

function GuideCard({ s }: { s: typeof GUIDE[number] }) {
  return (
    <div className="bg-kuma-card border border-kuma-line rounded-2xl p-[18px] shadow-sm">
      <div className="flex items-center gap-3">
        <div className="shrink-0 w-[46px] h-[46px] rounded-2xl bg-[rgba(245,165,36,.12)] border border-kuma-line flex items-center justify-center text-[22px]">{s.e}</div>
        <div>
          <div className="text-[10.5px] font-black tracking-[.14em] text-kuma-accent font-mono">SECTION {s.n}</div>
          <div className="text-base font-extrabold text-kuma-ink mt-0.5">{s.title}</div>
        </div>
      </div>
      <p className="text-[13px] font-bold text-kuma-primary mt-3.5">{s.lead}</p>
      <div className="flex flex-col gap-2 mt-3">
        {s.items.map((it, i) => (
          <div key={i} className="flex gap-2.5 items-start">
            <span className="shrink-0 w-5 h-5 mt-0.5 rounded-full bg-kuma-field border border-kuma-line flex items-center justify-center text-[11px] font-black text-kuma-primary font-mono">{i + 1}</span>
            <span className="text-[13px] leading-[1.6] text-kuma-sub">{it}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function GuidePage() {
  return (
    <main className="min-h-screen bg-kuma-bg text-kuma-ink">
      <Header title="熊の安全ガイド" icon="📖" />

      {/* hero */}
      <div className="bg-kuma-panel border-b border-kuma-line px-5 lg:px-12 py-6 lg:py-8 lg:flex lg:items-center lg:gap-6">
        <Bear size={56} className="lg:hidden" />
        <Bear size={68} className="hidden lg:block shrink-0" />
        <div>
          <h1 className="text-[23px] lg:text-[30px] font-extrabold leading-[1.4] lg:leading-[1.3] mt-2.5 lg:mt-0">知っておけば、こわくない。</h1>
          <p className="text-[12.5px] lg:text-[14.5px] leading-[1.75] lg:leading-[1.7] text-kuma-sub mt-2">出会いを避け、もしもの時に落ち着いて動くための5つの基本。</p>
        </div>
      </div>

      <div className="max-w-[1120px] mx-auto px-5 lg:px-12 py-4 lg:py-7">
        {/* TOC（モバイルのみ） */}
        <div className="lg:hidden flex flex-col gap-1.5 mb-4">
          {GUIDE.map(s => (
            <a key={s.n} href={`#section-${s.n}`} className="flex items-center gap-2.5 bg-kuma-card border border-kuma-line rounded-xl px-3.5 py-2.5">
              <span className="text-lg">{s.e}</span>
              <span className="flex-1 text-[13px] font-extrabold text-kuma-ink">{s.title}</span>
              <span className="text-[11px] font-black text-kuma-faint font-mono">{s.n}</span>
            </a>
          ))}
        </div>

        <div className="flex flex-col gap-3.5 lg:hidden">
          {GUIDE.map(s => (
            <div key={s.n} id={`section-${s.n}`}>
              <GuideCard s={s} />
            </div>
          ))}
        </div>

        {/* デスクトップ：グリッド */}
        <div className="hidden lg:grid lg:grid-cols-3 lg:gap-5">
          {GUIDE.map(s => (
            <div key={s.n} id={`section-${s.n}`}>
              <GuideCard s={s} />
            </div>
          ))}
          <div className="bg-[rgba(255,77,77,.08)] border border-[#4d1f1f] rounded-2xl p-6 flex flex-col justify-center">
            <div className="text-[28px]">⚠️</div>
            <div className="text-base font-extrabold text-kuma-accent mt-2">緊急時は110番へ</div>
            <p className="text-[13px] leading-[1.7] text-kuma-sub mt-2">人身被害・目前での遭遇など危険が迫る場合は、ためらわず通報してください。落ち着いて、自分の安全を最優先に。</p>
          </div>
        </div>

        {/* 緊急時カード（モバイル） */}
        <div className="lg:hidden bg-[rgba(255,77,77,.08)] border border-[#4d1f1f] rounded-2xl p-4 mt-4">
          <div className="text-[12.5px] font-extrabold text-kuma-accent">⚠️ 緊急時は</div>
          <p className="text-xs leading-[1.7] text-kuma-sub mt-1.5">人身被害・目前での遭遇など危険が迫る場合は、ためらわず <b className="text-kuma-ink">110番</b> に通報してください。</p>
        </div>

        {/* 環境省の公的情報 */}
        <section className="bg-kuma-card border border-kuma-line rounded-2xl p-4 lg:p-6 mt-4 lg:mt-6 shadow-sm">
          <h2 className="font-extrabold text-base mb-2">🏛️ 環境省の公的情報・お住まいの地域の出没情報</h2>
          <ul className="space-y-1.5">
            {[
              '「山に行くみなさん！クマにご注意を！」（入山前に確認したい6項目の注意点）',
              '児童・生徒向けの被害防止動画、保護者向けリーフレット',
              'クマによる人身被害の統計分析レポート、「クマと共存するために」パンフレット',
              '北海道〜四国の各都道府県が発信する「クマ出没情報」ページへのリンク集（お住まいの地域の最新情報はこちらも確認しましょう）',
            ].map((line, i) => (
              <li key={i} className="text-[13px] text-kuma-sub leading-relaxed flex gap-2">
                <span className="text-kuma-primary shrink-0">・</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <a
            href="https://www.env.go.jp/nature/choju/effort/effort12/kuma-info-citizen.html"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 text-[13px] font-bold text-kuma-primary hover:underline"
          >
            環境省「クマに関する各種情報」を見る →
          </a>
        </section>

        <p className="text-xs text-kuma-faint bg-kuma-card border border-kuma-line rounded-xl p-3 mt-4 leading-relaxed">
          本ガイドは環境省・自治体等が公開する熊に関する一般的な注意喚起情報を参考にした参考情報であり、公式な指針・安全を保証するものではありません。実際の行動は最新の自治体情報・現地の指示に従ってください。緊急時は110番（警察）・#9110（警察相談専用電話）または自治体の窓口へご連絡ください。
        </p>

        <div className="flex gap-3 mt-4 mb-2">
          <Link href="/areas" className="flex-1 bg-kuma-card border border-kuma-line rounded-2xl py-3.5 text-center shadow-sm hover:border-kuma-primary transition-colors">
            <div className="text-xl">📊</div>
            <div className="text-[12.5px] font-extrabold text-kuma-ink mt-1.5">地域別ランキング</div>
          </Link>
          <Link href="/links" className="flex-1 bg-kuma-card border border-kuma-line rounded-2xl py-3.5 text-center shadow-sm hover:border-kuma-primary transition-colors">
            <div className="text-xl">🗾</div>
            <div className="text-[12.5px] font-extrabold text-kuma-ink mt-1.5">公式リンク集</div>
          </Link>
        </div>
      </div>
    </main>
  )
}
