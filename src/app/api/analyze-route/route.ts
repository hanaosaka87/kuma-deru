import { NextResponse } from 'next/server'
import { clusterSightings, estimateCurrentPosition, analyzeRoute, RouteSighting } from '@/lib/analyzeRoute'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const sightings: RouteSighting[] = body.sightings

    if (!sightings || sightings.length < 2) {
      return NextResponse.json({ error: '目撃情報が2件以上必要です' }, { status: 400 })
    }

    const groups = clusterSightings(sightings)

    if (groups.length === 0) {
      return NextResponse.json({ error: '同一個体とみられるグループが見つかりませんでした' }, { status: 404 })
    }

    const results = await Promise.all(
      groups.map(async (group) => {
        const estimate = estimateCurrentPosition(group)
        const analysis = await analyzeRoute(group)
        return { sightings: group, estimate, analysis }
      })
    )

    return NextResponse.json({ groups: results })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '分析中にエラーが発生しました' }, { status: 500 })
  }
}
