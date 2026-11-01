import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from './supabase-admin'

const client = new Anthropic()

type MatchInput = {
  sightingId: number | string
  prefecture: string | null
  aiIndividualId: string | null
}

type MatchCandidate = {
  id: number
  area: string | null
  sighted_at: string
  ai_individual_id: string
}

type ClaudeMatch = { id: number; confidence: 'high' | 'medium'; reason: string }

/**
 * 新規投稿の個体特徴テキスト(ai_individual_id)を、同一都道府県・直近30日以内の
 * 既存投稿の特徴テキストと比較し、同一個体の可能性が高いものを bear_individual_matches に記録する。
 * 埋め込みベクトルや画像特徴量は使わず、自由記述テキスト同士をClaudeに1回だけ比較させる設計。
 * 候補が無い場合・ai_individual_idがnullの場合はClaude呼び出し自体を発生させずコストをゼロに抑える。
 */
export async function matchIndividual({ sightingId, prefecture, aiIndividualId }: MatchInput): Promise<void> {
  if (!aiIndividualId || !prefecture) return

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: candidates } = await supabaseAdmin
    .from('bear_sightings')
    .select('id, area, sighted_at, ai_individual_id')
    .eq('prefecture', prefecture)
    .not('ai_individual_id', 'is', null)
    .neq('id', sightingId)
    .gte('sighted_at', thirtyDaysAgo)
    .order('sighted_at', { ascending: false })
    .limit(8)

  const list = (candidates ?? []) as MatchCandidate[]
  if (list.length === 0) return

  const candidateLines = list
    .map((c, i) => `[候補${i + 1}] id=${c.id} (${c.area ?? '地域不明'}): "${c.ai_individual_id}"`)
    .join('\n')

  const prompt = `以下は熊の目撃投稿から得られた個体の特徴記述です。[新規]の記述と、各[候補]の記述を比較し、
同一個体である可能性が高い/中程度と判断できるものだけをJSON形式で回答してください（前後に説明文をつけないこと）。

[新規] id=${sightingId}: "${aiIndividualId}"

${candidateLines}

{
  "matches": [
    { "id": 候補のid（数値）, "confidence": "high"または"medium", "reason": "一致すると考えた理由を30字程度で" }
  ]
}
低い/根拠が薄いと判断したものは配列に含めないこと。曖昧な場合はconfidenceを"medium"にすること。一致するものが無ければ空配列にすること。`

  try {
    const res = await client.messages.create({
      model: 'claude-haiku-5-5',
      max_tokens: 500,
      thinking: { type: 'disabled' },
      messages: [{ role: 'user', content: prompt }],
    })
    const text = (res.content[0] as { text: string }).text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return
    const parsed = JSON.parse(jsonMatch[0])
    const matches: ClaudeMatch[] = Array.isArray(parsed.matches) ? parsed.matches : []

    const validIds = new Set(list.map(c => c.id))
    const rows = matches
      .filter(m => validIds.has(m.id) && (m.confidence === 'high' || m.confidence === 'medium'))
      .map(m => ({
        sighting_id: sightingId,
        matched_sighting_id: m.id,
        confidence: m.confidence,
        reason: typeof m.reason === 'string' ? m.reason : null,
      }))

    if (rows.length === 0) return

    await supabaseAdmin.from('bear_individual_matches').upsert(rows, { onConflict: 'sighting_id,matched_sighting_id' })
  } catch {
    // マッチング失敗は投稿フロー自体に影響させないため握りつぶす
  }
}
