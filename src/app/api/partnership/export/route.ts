import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// admin画面の x-admin-key とは別の鍵。エクスポートは閲覧のみの弱い権限のため、
// 削除・ステータス変更が可能な管理画面の権限とは分離する。
function checkAuth(req: NextRequest) {
  const key = req.headers.get('x-partner-key') ?? ''
  return key.length > 0 && key === process.env.PARTNERSHIP_EXPORT_PASSWORD
}

const COLUMNS = ['photo_url', 'lat', 'lng', 'area', 'prefecture', 'sighted_at', 'ai_size_estimate', 'ai_individual_id', 'source'] as const

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ ok: false }, { status: 401 })

  // description・poster_token・report_count・statusは個人情報混入や内部運用情報につながるため除外
  const { data, error } = await getSupabase()
    .from('bear_sightings')
    .select(COLUMNS.join(','))
    .order('sighted_at', { ascending: false })

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const rows = (data ?? []) as unknown as Record<string, unknown>[]
  const header = COLUMNS.join(',')
  const body = rows.map(row => COLUMNS.map(c => csvEscape(row[c])).join(',')).join('\n')
  const csv = `﻿${header}\n${body}`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="kuma_oru_export_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
