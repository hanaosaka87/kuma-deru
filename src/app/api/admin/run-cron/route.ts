import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const key = req.headers.get('x-admin-key') ?? ''
  if (!key || key !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kuma-oru.hana.trickster.biz'
  const res = await fetch(`${base}/api/cron/aggregate-news`, {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET ?? ''}` },
  })
  const json = await res.json()
  return NextResponse.json(json)
}
