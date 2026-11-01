import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function checkAuth(req: NextRequest) {
  const key = req.headers.get('x-admin-key') ?? ''
  return key.length > 0 && key === process.env.ADMIN_PASSWORD
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ ok: false }, { status: 401 })

  const { data, error } = await getSupabase()
    .from('bear_sightings')
    .select('id,area,prefecture,status,urgent,description,source,sighted_at,created_at,report_count,ai_size_estimate,lat,lng')
    .order('sighted_at', { ascending: false })
    .limit(300)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data })
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ ok: false }, { status: 401 })

  const { id } = await req.json()
  const { error } = await getSupabase().from('bear_sightings').delete().eq('id', id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ ok: false }, { status: 401 })

  const { id, status, urgent } = await req.json()
  const update: Record<string, unknown> = {}
  if (status !== undefined) update.status = status
  if (urgent !== undefined) update.urgent = urgent

  const { error } = await getSupabase().from('bear_sightings').update(update).eq('id', id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
