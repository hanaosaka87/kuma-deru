import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { replyLineMessage } from '@/lib/lineNotify'

type LineEvent = {
  type: string
  replyToken?: string
  source?: { userId?: string }
  message?: { type: string; text?: string }
}

const TYPE_PREFIXES: { prefix: string; type: string }[] = [
  { prefix: '自治体', type: '自治体・行政' },
  { prefix: '行政', type: '自治体・行政' },
  { prefix: '学校', type: '学校・教育機関' },
]

function parseMessage(text: string): { area: string; subscriberType: string } | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  for (const { prefix, type } of TYPE_PREFIXES) {
    if (trimmed.startsWith(prefix)) {
      const rest = trimmed.slice(prefix.length).replace(/^[\s:：]+/, '').trim()
      if (rest) return { area: rest, subscriberType: type }
    }
  }

  return { area: trimmed, subscriberType: '個人' }
}

const WELCOME_TEXT = '友だち追加ありがとうございます🐻\n\nお住まいのエリア（市区町村名など）を送信すると、そのエリアで熊の目撃情報が投稿された際にLINEでお知らせします。\n\n例：「札幌市南区」\n\n学校・自治体の方は先頭に「学校」または「自治体」をつけて送信してください（例：「学校 札幌市南区」）。\n\n登録解除は「解除」と送信してください。'

export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-line-signature') ?? ''
  const body = await req.text()

  const hash = crypto
    .createHmac('sha256', process.env.LINE_CHANNEL_SECRET ?? '')
    .update(body)
    .digest('base64')

  if (hash !== signature) {
    return NextResponse.json({ ok: false, error: 'invalid signature' }, { status: 401 })
  }

  const { events } = JSON.parse(body) as { events: LineEvent[] }

  await Promise.allSettled(
    (events ?? []).map(async (event) => {
      const userId = event.source?.userId
      if (!userId) return

      if (event.type === 'follow' && event.replyToken) {
        await replyLineMessage(event.replyToken, WELCOME_TEXT)
        return
      }

      if (event.type === 'message' && event.message?.type === 'text' && event.replyToken) {
        const text = event.message.text ?? ''

        if (text.trim() === '解除' || text.trim() === '登録解除') {
          await supabaseAdmin.from('bear_area_subscriptions').delete().eq('line_user_id', userId)
          await replyLineMessage(event.replyToken, '登録を解除しました。')
          return
        }

        const parsed = parseMessage(text)
        if (!parsed) return

        const { error } = await supabaseAdmin.from('bear_area_subscriptions').upsert(
          { line_user_id: userId, area: parsed.area, subscriber_type: parsed.subscriberType },
          { onConflict: 'line_user_id,area' }
        )

        if (error) {
          console.error('LINE registration upsert error', error)
          await replyLineMessage(event.replyToken, '登録に失敗しました。時間をおいて再度お試しください。')
          return
        }

        await replyLineMessage(
          event.replyToken,
          `エリア「${parsed.area}」を登録しました🔔\n今後このエリアで熊の目撃情報があった場合にお知らせします。\n\n登録解除は「解除」と送信してください。`
        )
      }
    })
  )

  return NextResponse.json({ ok: true })
}
