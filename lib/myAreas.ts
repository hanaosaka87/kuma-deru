// 「自分のエリア」登録（localStorage）の読み取り・判定を一元化する。
// MapField/MyAreaPanel/マップページで同じロジックを使うため共通化。
export const MY_AREAS_STORAGE_KEY = 'kuma_my_areas'

export function getMyAreas(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(MY_AREAS_STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export function matchesMyAreas(sightingArea: string | null, myAreas: string[]): boolean {
  if (!sightingArea) return false
  return myAreas.some(a => sightingArea === a || sightingArea.includes(a) || a.includes(sightingArea))
}
