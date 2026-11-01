import { NextRequest, NextResponse } from 'next/server'
import { sendAreaAlert } from '@/lib/areaAlert'
import { extractPrefecture } from '@/lib/prefectures'
import { supabaseAdmin } from '@/lib/supabase-admin'

// 簡易レート制限（インメモリ・サーバーレス再起動でリセットされる想定の軽い抑止）
const attempts = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 60_000
const MAX_ATTEMPTS = 5

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

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ ok: false, error: 'リクエストが多すぎます。しばらくしてから再試行してください。' }, { status: 429 })
  }

  const { area, description, urgent, sightingId } = await req.json()

  if (!area || typeof area !== 'string') {
    return NextResponse.json({ ok: true, notified: 0 })
  }
  if (description !== undefined && typeof description !== 'string') {
    return NextResponse.json({ ok: false, error: 'invalid description' }, { status: 400 })
  }
  if (!sightingId) {
    return NextResponse.json({ ok: false, error: 'sightingId required' }, { status: 400 })
  }

  // 実際にDBへ保存された投稿であることを確認してから通知する（偽の緊急通知の送りつけ防止）
  const { data: sighting } = await supabaseAdmin
    .from('bear_sightings')
    .select('id, area')
    .eq('id', sightingId)
    .maybeSingle()

  if (!sighting || sighting.area !== area) {
    return NextResponse.json({ ok: false, error: 'sighting not found' }, { status: 404 })
  }

  const result = await sendAreaAlert({ area, description, urgent, sightingId, source: 'user' })

  // Web Push 通知
  const prefecture = extractPrefecture(area)
  const urgentPrefix = urgent ? '【緊急】' : ''
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kuma-oru.hana.trickster.biz'
  fetch(`${base}/api/push/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: `${urgentPrefix}🐻 ${area}で熊が目撃されました`,
      body: description ? description.slice(0, 60) : '安全マップで詳細を確認してください',
      url: '/map',
      prefecture,
    }),
  }).catch(() => {})

  return NextResponse.json({ ok: true, ...result })
}
