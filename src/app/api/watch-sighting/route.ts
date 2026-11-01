import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// 投稿者がこの投稿の対応状況の変化（対応中／確保済み／駆除済み）を個別のPush通知で受け取れるよう紐付ける
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ ok: false, error: 'リクエストが多すぎます。しばらくしてから再試行してください。' }, { status: 429 })
  }

  const { sightingId, subscription } = await req.json()
  if (!sightingId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ ok: false, error: 'invalid params' }, { status: 400 })
  }

  const supabase = getSupabase()

  // 実在する投稿であることを確認してから紐付ける
  const { data: sighting } = await supabase
    .from('bear_sightings')
    .select('id')
    .eq('id', sightingId)
    .maybeSingle()
  if (!sighting) {
    return NextResponse.json({ ok: false, error: 'sighting not found' }, { status: 404 })
  }

  const { error: upsertError } = await supabase.from('push_subscriptions').upsert({
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  }, { onConflict: 'endpoint' })
  if (upsertError) return NextResponse.json({ ok: false, error: upsertError.message }, { status: 500 })

  const { error: watchError } = await supabase.from('bear_sighting_watchers').upsert({
    sighting_id: sightingId,
    endpoint: subscription.endpoint,
  }, { onConflict: 'sighting_id,endpoint' })
  if (watchError) return NextResponse.json({ ok: false, error: watchError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
