import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

// 投稿者への個別通知文言（テスターフィードバック対応・2026-10-19：捕獲・駆除等の結果を投稿者に知らせる）
const WATCHER_STATUS_MESSAGE: Record<string, string> = {
  '対応中': 'が「対応中」になりました。自治体・猟友会が確認を進めています。',
  '確保済み': 'の熊が確保されました。ご協力ありがとうございました。',
  '駆除済み': 'について対応が完了しました（駆除済み）。ご協力ありがとうございました。',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- このプロジェクトにSupabaseのDB型定義がないため、他ファイルと同様に未型付けで扱う
async function notifyWatchers(supabase: any, sightingId: number, area: string | null, status: string) {
  const message = WATCHER_STATUS_MESSAGE[status]
  if (!message) return

  const { data: watchers } = await supabase
    .from('bear_sighting_watchers')
    .select('endpoint')
    .eq('sighting_id', sightingId)
  if (!watchers?.length) return

  const endpoints = watchers.map((w: { endpoint: string }) => w.endpoint)
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('endpoint', endpoints)
  if (!subs?.length) return

  webpush.setVapidDetails(
    process.env.VAPID_EMAIL ?? 'mailto:hana@trickster.biz',
    process.env.VAPID_PUBLIC_KEY ?? '',
    process.env.VAPID_PRIVATE_KEY ?? ''
  )

  const payload = JSON.stringify({
    title: '🐻 あなたの目撃情報が更新されました',
    body: `${area || 'あなたが報告した目撃情報'}${message}`,
    url: '/map',
  })

  const staleEndpoints: string[] = []
  await Promise.allSettled(
    subs.map(async (sub: { endpoint: string; p256dh: string; auth: string }) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'statusCode' in err) {
          const code = (err as { statusCode: number }).statusCode
          if (code === 410 || code === 404) staleEndpoints.push(sub.endpoint)
        }
      }
    })
  )

  if (staleEndpoints.length) {
    await supabase.from('push_subscriptions').delete().in('endpoint', staleEndpoints)
  }
}

const attempts = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 60_000
const MAX_ATTEMPTS = 20

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  entry.count += 1
  return entry.count > MAX_ATTEMPTS
}

const VALID_STATUSES = ['目撃情報', '対応中', '確保済み', '駆除済み']

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ ok: false, error: 'リクエストが多すぎます。しばらくしてから再試行してください。' }, { status: 429 })
  }

  const { id, status, urgent } = await req.json()

  if (!id || (status === undefined && urgent === undefined)) {
    return NextResponse.json({ ok: false, error: '必須パラメータが不足しています' }, { status: 400 })
  }
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ ok: false, error: 'status の値が不正です' }, { status: 400 })
  }
  if (urgent !== undefined && typeof urgent !== 'boolean') {
    return NextResponse.json({ ok: false, error: 'urgent の形式が不正です' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: existing, error: selectError } = await supabase
    .from('bear_sightings')
    .select('id, area')
    .eq('id', id)
    .maybeSingle()

  if (selectError || !existing) {
    return NextResponse.json({ ok: false, error: '投稿が見つかりません' }, { status: 404 })
  }

  const update: { status?: string; urgent?: boolean } = {}
  if (status !== undefined) update.status = status
  if (urgent !== undefined) update.urgent = urgent

  const { error: updateError } = await supabase
    .from('bear_sightings')
    .update(update)
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 })
  }

  if (status !== undefined) {
    notifyWatchers(supabase, id, existing.area as string | null, status).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
