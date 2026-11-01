import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { postToX } from '@/lib/postX'

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
    .from('bear_tweet_queue')
    .select('id, sighting_id, text, status, created_at, posted_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data })
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ ok: false }, { status: 401 })

  const { id, action, text } = await req.json()
  const supabase = getSupabase()

  if (action === 'reject') {
    const { error } = await supabase.from('bear_tweet_queue').update({ status: 'rejected' }).eq('id', id)
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'approve') {
    try {
      const tweetText = typeof text === 'string' && text.trim() ? text : undefined
      if (tweetText) {
        await supabase.from('bear_tweet_queue').update({ text: tweetText }).eq('id', id)
      }
      const { data: row } = await supabase.from('bear_tweet_queue').select('text').eq('id', id).single()
      if (!row) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 })

      const result = await postToX(row.text)
      await supabase.from('bear_tweet_queue').update({ status: 'posted', posted_at: new Date().toISOString() }).eq('id', id)
      return NextResponse.json({ ok: true, url: result.url })
    } catch (e) {
      return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'X投稿に失敗しました' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: false, error: 'invalid action' }, { status: 400 })
}
