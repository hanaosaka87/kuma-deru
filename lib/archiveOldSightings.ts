import { supabaseAdmin } from './supabase-admin'
import { extractPrefecture } from './prefectures'

const RETENTION_DAYS = 90

export type ArchiveResult = {
  scanned: number
  archived: number
  deleted: number
  errors: number
}

/**
 * sighted_atが90日（約3ヶ月）より古いbear_sightingsを都道府県別に集計し、
 * bear_sighting_archive_statsへ加算したうえで個別レコード（写真含む）を削除する。
 * 観光地が「熊が出る場所」として地図上に恒久的に残ることを避けるための処理。
 */
export async function archiveOldSightings(): Promise<ArchiveResult> {
  const result: ArchiveResult = { scanned: 0, archived: 0, deleted: 0, errors: 0 }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: rows, error } = await supabaseAdmin
    .from('bear_sightings')
    .select('id, prefecture, area, photo_url, report_count, sighted_at')
    .lt('sighted_at', cutoff)

  if (error || !rows || rows.length === 0) return result
  result.scanned = rows.length

  const counts = new Map<string, number>()
  for (const row of rows) {
    const pref = row.prefecture ?? extractPrefecture(row.area)
    if (!pref) continue
    counts.set(pref, (counts.get(pref) ?? 0) + (row.report_count ?? 1))
  }

  // 集計テーブルへの加算が一件でも失敗した場合（テーブル未作成等）は、
  // 詳細データを失わないよう削除処理ごと中断する
  for (const [prefecture, count] of counts) {
    const { data: existing, error: selectError } = await supabaseAdmin
      .from('bear_sighting_archive_stats')
      .select('archived_count')
      .eq('prefecture', prefecture)
      .maybeSingle()

    if (selectError) {
      result.errors++
      return result
    }

    const { error: upsertError } = await supabaseAdmin
      .from('bear_sighting_archive_stats')
      .upsert({
        prefecture,
        archived_count: (existing?.archived_count ?? 0) + count,
        updated_at: new Date().toISOString(),
      })

    if (upsertError) {
      result.errors++
      return result
    }
    result.archived += count
  }

  for (const row of rows) {
    if (row.photo_url) {
      const match = row.photo_url.match(/bear-images\/(.+)$/)
      if (match) {
        await supabaseAdmin.storage.from('bear-images').remove([match[1]])
      }
    }
    const { error: deleteError } = await supabaseAdmin.from('bear_sightings').delete().eq('id', row.id)
    if (!deleteError) result.deleted++
  }

  return result
}
