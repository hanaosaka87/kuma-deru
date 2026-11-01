// 警察・自治体・猟友会向けの通報テキスト生成。マップ詳細パネルと投稿直後の案内の両方から使う。
export type ReportableSighting = {
  area: string | null
  sighted_at: string
  description: string | null
  urgent: boolean
  ai_size_estimate?: string | null
}

export function buildReportText(s: ReportableSighting): string {
  const place = s.area || '場所不明'
  const dt = new Date(s.sighted_at).toLocaleString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  const urgentLine = s.urgent ? '【緊急】今まさに近くにいる可能性があります。' : ''
  const desc = s.description ? `【状況】${s.description}` : ''
  const ai = s.ai_size_estimate ? `【AI推定サイズ】${s.ai_size_estimate}` : ''
  return [
    '熊の目撃情報をご報告します。',
    '',
    `【目撃場所】${place}`,
    `【目撃日時】${dt}`,
    desc,
    ai,
    urgentLine,
    '',
    '※ 安全マップアプリ「くま！おる！熊！」を通じてご報告しています。',
    '  https://kuma-oru.hana.trickster.biz',
  ].filter(l => l !== undefined && l !== null && (l !== '' || true)).join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
