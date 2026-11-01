import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const CATEGORIES = ['農業・農地対策', '生活圏対策', '観察・研究', '教育・啓発', 'テクノロジー活用', '地域連携', 'その他']

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = 20
  const offset = (page - 1) * limit

  let query = supabaseAdmin
    .from('coexist_ideas')
    .select('*', { count: 'exact' })
    .order('likes', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (category && category !== 'すべて') {
    query = query.eq('category', category)
  }

  const { data, error, count } = await query
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, ideas: data ?? [], total: count ?? 0 })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { title, body: content, category, author_name } = body

  if (!title?.trim() || !content?.trim() || !category) {
    return NextResponse.json({ ok: false, error: '必須項目が未入力です' }, { status: 400 })
  }
  if (title.trim().length > 50) {
    return NextResponse.json({ ok: false, error: 'タイトルは50文字以内' }, { status: 400 })
  }
  if (content.trim().length > 500) {
    return NextResponse.json({ ok: false, error: '本文は500文字以内' }, { status: 400 })
  }
  if (!CATEGORIES.includes(category)) {
    return NextResponse.json({ ok: false, error: 'カテゴリが不正です' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('coexist_ideas')
    .insert({
      title: title.trim(),
      body: content.trim(),
      category,
      author_name: (author_name?.trim() || '名無し').slice(0, 20),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, idea: data })
}
