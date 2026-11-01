import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { postToX } from '@/lib/postX'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (
    process.env.SCHEDULED_POST_SECRET &&
    authHeader !== `Bearer ${process.env.SCHEDULED_POST_SECRET}`
  ) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json() as { type?: string; tweet_text?: string }
  const { type, tweet_text } = body

  let textToPost: string
  if (tweet_text) {
    textToPost = tweet_text
  } else if (type === 'kuma') {
    textToPost = await generateKumaTweet()
  } else {
    return NextResponse.json(
      { ok: false, error: 'tweet_text または type=kuma が必要です' },
      { status: 400 }
    )
  }

  const result = await postToX(textToPost)
  return NextResponse.json({ ok: true, tweet_id: result.id, url: result.url, text: textToPost })
}

async function generateKumaTweet(): Promise<string> {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data } = await supabaseAdmin
    .from('bear_sightings')
    .select('prefecture, urgent, source')
    .gte('sighted_at', since24h)
    .order('sighted_at', { ascending: false })

  const sightings = data ?? []
  const total = sightings.length
  const urgentCount = sightings.filter(s => s.urgent).length

  const prefMap: Record<string, number> = {}
  for (const s of sightings) {
    const pref = (s as { prefecture?: string }).prefecture
    if (pref) prefMap[pref] = (prefMap[pref] ?? 0) + 1
  }
  const topPrefs = Object.entries(prefMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([p, n]) => `${p}${n}件`)
    .join('・')

  const dataDesc =
    total === 0
      ? '直近24時間の新規目撃情報はありません'
      : `直近24時間に${total}件${urgentCount > 0 ? `（うち緊急${urgentCount}件）` : ''}の目撃情報を収集。${topPrefs ? `上位：${topPrefs}` : ''}`

  const client = new Anthropic()
  const msg = await client.messages.create({
    model: 'claude-haiku-5-5',
    max_tokens: 300,
    thinking: { type: 'disabled' },
    messages: [
      {
        role: 'user',
        content: [
          'X（旧Twitter）への投稿文を1件だけ作成してください。',
          `データ：${dataDesc}`,
          '条件：',
          '・280文字以内（厳守・URL含む）',
          '・末尾にURL「https://kuma-oru.hana.trickster.biz」を入れる',
          '・ハッシュタグは「#クマ出没」のみ1個',
          '・「くま！おる！熊！」アプリの紹介を自然に含める',
          '・絵文字は1〜2個まで',
          '・投稿文のみ出力（前置き不要）',
        ].join('\n'),
      },
    ],
  })

  return ((msg.content[0] as { type: string; text: string }).text ?? '').trim()
}
