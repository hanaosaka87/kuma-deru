import Anthropic from '@anthropic-ai/sdk'

export type RouteSighting = {
  id: number
  lat: number
  lng: number
  area: string | null
  prefecture: string | null
  sighted_at: string
  description: string | null
  urgent: boolean
}

export type RouteAnalysis = {
  direction: string
  currentEstimate: string
  nextRiskArea: string
  behavior: string
  confidence: string
}

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// 同一県内 かつ 半径10km以内 かつ 24時間以内でグルーピング
export function clusterSightings(sightings: RouteSighting[]): RouteSighting[][] {
  const sorted = [...sightings].sort(
    (a, b) => new Date(a.sighted_at).getTime() - new Date(b.sighted_at).getTime()
  )
  const groups: RouteSighting[][] = []
  const used = new Set<number>()

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(i)) continue
    const group = [sorted[i]]
    used.add(i)

    for (let j = i + 1; j < sorted.length; j++) {
      if (used.has(j)) continue
      const prev = group[group.length - 1]
      const curr = sorted[j]
      const timeDiffHours = (new Date(curr.sighted_at).getTime() - new Date(prev.sighted_at).getTime()) / 3_600_000
      const dist = haversineDistance(prev.lat, prev.lng, curr.lat, curr.lng)
      // 都道府県をまたがない（どちらかが不明な場合は許容）
      const samePref = !prev.prefecture || !curr.prefecture || prev.prefecture === curr.prefecture
      if (timeDiffHours <= 24 && dist <= 10 && samePref) {
        group.push(curr)
        used.add(j)
      }
    }

    if (group.length >= 2) groups.push(group)
  }

  return groups
}

// 最後の移動ベクトルを延長して現在地を推測（最後の目撃から12時間以内のみ）
export function estimateCurrentPosition(sightings: RouteSighting[]): { lat: number; lng: number } | null {
  if (sightings.length < 2) return null
  const last = sightings[sightings.length - 1]
  const prev = sightings[sightings.length - 2]
  const elapsedHours = (Date.now() - new Date(last.sighted_at).getTime()) / 3_600_000
  if (elapsedHours > 12) return null

  const dLat = last.lat - prev.lat
  const dLng = last.lng - prev.lng
  const len = Math.sqrt(dLat ** 2 + dLng ** 2)
  if (len === 0) return null

  // 平均移動速度 2km/h（里山での通常移動） / 111km per degree
  const moveDeg = (2 * elapsedHours) / 111
  return {
    lat: last.lat + (dLat / len) * moveDeg,
    lng: last.lng + (dLng / len) * moveDeg,
  }
}

// Claude Haiku でルート分析
export async function analyzeRoute(sightings: RouteSighting[]): Promise<RouteAnalysis> {
  const client = new Anthropic()

  const sightingText = sightings.map((s, i) =>
    `[${i + 1}] ${new Date(s.sighted_at).toLocaleString('ja-JP')} | エリア:${s.area ?? '不明'} | 座標:(${s.lat.toFixed(4)},${s.lng.toFixed(4)})${s.urgent ? ' 【緊急】' : ''} | 状況:${s.description ?? 'なし'}`
  ).join('\n')

  const prompt = `以下は同一個体の可能性があるクマの目撃情報（時系列順）です。移動ルートと現在地を推測してください。

${sightingText}

JSON形式のみで回答してください（余分なテキスト不要）：
{
  "direction": "移動方向の推測（例：北東方向に移動中）",
  "currentEstimate": "現在のおおよその位置の推測（例：○○山周辺の森林帯）",
  "nextRiskArea": "次に出没が懸念されるエリア（例：△△集落東側の農地付近）",
  "behavior": "行動パターンの特徴と推測（例：採食行動中と推測。朝夕に活発化するパターン）",
  "confidence": "推測の確信度と理由（例：中 / 2地点のみで経路の精度に限界あり）"
}`

  const response = await client.messages.create({
    model: 'claude-haiku-5-5',
    max_tokens: 600,
    thinking: { type: 'disabled' },
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return {
      direction: '推測不可',
      currentEstimate: '情報不足のため推測できません',
      nextRiskArea: '特定困難',
      behavior: '詳細な情報が不足しています',
      confidence: '低',
    }
  }
  return JSON.parse(jsonMatch[0]) as RouteAnalysis
}
