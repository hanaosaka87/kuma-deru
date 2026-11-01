import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { id, posterToken } = await req.json()

  if (!id || !posterToken) {
    return NextResponse.json({ ok: false, error: '必須パラメータが不足しています' }, { status: 400 })
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
    return NextResponse.json({ ok: false, error: '削除権限がありません' }, { status: 403 })
  }

  const { error: deleteError } = await supabase
    .from('bear_sightings')
    .delete()
    .eq('id', id)

  if (deleteError) {
    return NextResponse.json({ ok: false, error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
