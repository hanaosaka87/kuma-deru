import { NextRequest, NextResponse } from 'next/server'
import { aggregateNewsSightings } from '@/lib/aggregateNews'
import { archiveOldSightings } from '@/lib/archiveOldSightings'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const result = await aggregateNewsSightings()
  const archive = await archiveOldSightings()
  return NextResponse.json({ ok: true, result, archive })
}
