import { NextRequest, NextResponse } from 'next/server'
import { matchIndividual } from '@/lib/matchIndividual'

export async function POST(req: NextRequest) {
  const { sightingId, prefecture, aiIndividualId } = await req.json()

  if (!sightingId) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  await matchIndividual({ sightingId, prefecture: prefecture ?? null, aiIndividualId: aiIndividualId ?? null })
  return NextResponse.json({ ok: true })
}
