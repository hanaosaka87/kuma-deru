import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export type BearAnalysis = {
  ai_species_confidence: number | null
  ai_size_estimate: string | null
  ai_individual_id: string | null
}

const EMPTY_ANALYSIS: BearAnalysis = {
  ai_species_confidence: null,
  ai_size_estimate: null,
  ai_individual_id: null,
}

const SUPPORTED_MEDIA_TYPES: Record<string, 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
}

const PROMPT = `この画像を分析し、以下のJSON形式のみで回答してください（前後に説明文をつけないこと）。

{
  "species_confidence": この画像にツキノワグマ・ヒグマ等の熊が写っている確信度を0〜1の数値で（熊以外・判別不能な場合は低い値にする）,
  "size_estimate": "推定体長と成獣・亜成獣・子熊の別（例: 推定体長120cm・成獣の可能性）。判別できない場合はnull",
  "individual_features": "同一個体の追跡照合に役立つ特徴を60字程度で。特に、立ち上がった際に見える胸の白斑模様（月の輪）の形状（三日月型/V字型/円形/不定形等）・位置（中央寄り/左右どちらかに偏り等）・大きさの記述を最優先し、次いで毛色・体格・耳や尻尾の欠け・傷などを補足する。胸の模様が写っていない場合はその他の特徴のみ記述。判別できない場合はnull"
}`

/**
 * 熊の目撃写真をClaude Vision APIで分析する。
 * urgent時はSonnet 4.6（高精度）、それ以外はHaiku 4.5（低コスト）を使うハイブリッド運用。
 */
export async function analyzeBearPhoto(photoUrl: string, urgent: boolean): Promise<BearAnalysis> {
  try {
    const ext = photoUrl.split('?')[0].split('.').pop()?.toLowerCase() ?? ''
    const mediaType = SUPPORTED_MEDIA_TYPES[ext]
    if (!mediaType) return EMPTY_ANALYSIS

    const imgRes = await fetch(photoUrl)
    if (!imgRes.ok) return EMPTY_ANALYSIS
    const buffer = await imgRes.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    const model = urgent ? 'claude-sonnet-4-6' : 'claude-haiku-5-5'

    const res = await client.messages.create({
      model,
      max_tokens: 500,
      thinking: { type: 'disabled' },
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: PROMPT },
        ],
      }],
    })

    const text = (res.content[0] as { text: string }).text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return EMPTY_ANALYSIS

    const parsed = JSON.parse(jsonMatch[0])
    return {
      ai_species_confidence: typeof parsed.species_confidence === 'number' ? parsed.species_confidence : null,
      ai_size_estimate: typeof parsed.size_estimate === 'string' ? parsed.size_estimate : null,
      ai_individual_id: typeof parsed.individual_features === 'string' ? parsed.individual_features : null,
    }
  } catch {
    return EMPTY_ANALYSIS
  }
}
