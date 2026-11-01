import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { id } = await req.json()
  if (!id || typeof id !== 'number') {
    return NextResponse.json({ ok: false, error: 'invalid id' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error: fetchError } = await supabase
    .from('bear_sightings')
    .select('report_count')
    .eq('id', id)
    .single()

  if (fetchError || !data) {
    return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 })
  }

  const newCount = (data.report_count ?? 1) + 1
  const { error } = await supabase
    .from('bear_sightings')
    .update({ report_count: newCount })
    .eq('id', id)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, report_count: newCount })
}
