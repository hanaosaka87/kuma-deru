import { NextRequest, NextResponse } from 'next/server'
import { analyzeBearPhoto } from '@/lib/analyzeBear'

export async function POST(req: NextRequest) {
  const { photoUrl, urgent } = await req.json()

  if (!photoUrl || typeof photoUrl !== 'string') {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const result = await analyzeBearPhoto(photoUrl, !!urgent)
  return NextResponse.json({ ok: true, result })
}
