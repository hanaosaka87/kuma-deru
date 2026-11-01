import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { extractPrefecture } from '@/lib/prefectures'

const attempts = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 60_000
const MAX_ATTEMPTS = 10

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

  const { id, posterToken, area, description, urgent } = await req.json()

  if (!id || !posterToken) {
    return NextResponse.json({ ok: false, error: '必須パラメータが不足しています' }, { status: 400 })
  }
  if (area !== undefined && typeof area !== 'string') {
    return NextResponse.json({ ok: false, error: 'area の形式が不正です' }, { status: 400 })
  }
  if (description !== undefined && typeof description !== 'string') {
    return NextResponse.json({ ok: false, error: 'description の形式が不正です' }, { status: 400 })
  }
  if (urgent !== undefined && typeof urgent !== 'boolean') {
    return NextResponse.json({ ok: false, error: 'urgent の形式が不正です' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error: selectError } = await supabase
    .from('bear_sightings')
    .select('id, poster_token')
    .eq('id', id)
    .single()

  if (selectError || !data) {
    return NextResponse.json({ ok: false, error: '投稿が見つかりません' }, { status: 404 })
  }

  if (!data.poster_token || data.poster_token !== posterToken) {
    return NextResponse.json({ ok: false, error: '編集権限がありません' }, { status: 403 })
  }

  const { error: updateError } = await supabase
    .from('bear_sightings')
    .update({
      area: area || null,
      description: description || null,
      urgent: urgent ?? false,
      prefecture: extractPrefecture(area || ''),
    })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
