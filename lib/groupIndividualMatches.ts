export type MatchPair = { sighting_id: number; matched_sighting_id: number; confidence: 'high' | 'medium'; reason?: string | null }

/**
 * bear_individual_matches のペア関係（sighting_id ⇔ matched_sighting_id）から
 * Union-Findで同一個体と推定されるグループを作る。座標クラスタリング（analyzeRoute.ts）とは
 * 別ロジックであり、テキスト特徴の類似判定結果のみに基づく点に注意。
 */
export function groupMatches(matches: MatchPair[]): number[][] {
  const parent = new Map<number, number>()

  const find = (x: number): number => {
    if (!parent.has(x)) parent.set(x, x)
    let root = x
    while (parent.get(root) !== root) root = parent.get(root)!
    let cur = x
    while (parent.get(cur) !== root) {
      const next = parent.get(cur)!
      parent.set(cur, root)
      cur = next
    }
    return root
  }

  const union = (a: number, b: number) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }

  matches.forEach(m => union(m.sighting_id, m.matched_sighting_id))

  const groups = new Map<number, Set<number>>()
  parent.forEach((_, id) => {
    const root = find(id)
    if (!groups.has(root)) groups.set(root, new Set())
    groups.get(root)!.add(id)
  })

  return Array.from(groups.values())
    .map(set => Array.from(set))
    .filter(g => g.length >= 2)
}
