// 都道府県マスタ（代表座標は県庁所在地周辺）。ニュース自動集約時の位置補完や、
// area文字列（"都道府県 市区町村 地区" の空白区切り）からの都道府県抽出に利用する。
export const PREFECTURES: { name: string; lat: number; lng: number }[] = [
  { name: '北海道', lat: 43.0642, lng: 141.3469 },
  { name: '青森県', lat: 40.8244, lng: 140.7400 },
  { name: '岩手県', lat: 39.7036, lng: 141.1527 },
  { name: '宮城県', lat: 38.2688, lng: 140.8721 },
  { name: '秋田県', lat: 39.7186, lng: 140.1024 },
  { name: '山形県', lat: 38.2404, lng: 140.3633 },
  { name: '福島県', lat: 37.7503, lng: 140.4676 },
  { name: '茨城県', lat: 36.3418, lng: 140.4468 },
  { name: '栃木県', lat: 36.5658, lng: 139.8836 },
  { name: '群馬県', lat: 36.3911, lng: 139.0608 },
  { name: '埼玉県', lat: 35.8569, lng: 139.6489 },
  { name: '千葉県', lat: 35.6047, lng: 140.1233 },
  { name: '東京都', lat: 35.6895, lng: 139.6917 },
  { name: '神奈川県', lat: 35.4478, lng: 139.6425 },
  { name: '新潟県', lat: 37.9026, lng: 139.0232 },
  { name: '富山県', lat: 36.6953, lng: 137.2113 },
  { name: '石川県', lat: 36.5947, lng: 136.6256 },
  { name: '福井県', lat: 36.0652, lng: 136.2216 },
  { name: '山梨県', lat: 35.6642, lng: 138.5685 },
  { name: '長野県', lat: 36.6513, lng: 138.1810 },
  { name: '岐阜県', lat: 35.3912, lng: 136.7223 },
  { name: '静岡県', lat: 34.9769, lng: 138.3831 },
  { name: '愛知県', lat: 35.1802, lng: 136.9066 },
  { name: '三重県', lat: 34.7303, lng: 136.5086 },
  { name: '滋賀県', lat: 35.0045, lng: 135.8686 },
  { name: '京都府', lat: 35.0212, lng: 135.7556 },
  { name: '大阪府', lat: 34.6863, lng: 135.5200 },
  { name: '兵庫県', lat: 34.6913, lng: 135.1830 },
  { name: '奈良県', lat: 34.6851, lng: 135.8049 },
  { name: '和歌山県', lat: 34.2261, lng: 135.1675 },
  { name: '鳥取県', lat: 35.5039, lng: 134.2381 },
  { name: '島根県', lat: 35.4723, lng: 133.0505 },
  { name: '岡山県', lat: 34.6618, lng: 133.9344 },
  { name: '広島県', lat: 34.3966, lng: 132.4596 },
  { name: '山口県', lat: 34.1859, lng: 131.4714 },
  { name: '徳島県', lat: 34.0658, lng: 134.5593 },
  { name: '香川県', lat: 34.3401, lng: 134.0434 },
  { name: '愛媛県', lat: 33.8417, lng: 132.7657 },
  { name: '高知県', lat: 33.5597, lng: 133.5311 },
  { name: '福岡県', lat: 33.6064, lng: 130.4181 },
  { name: '佐賀県', lat: 33.2494, lng: 130.2989 },
  { name: '長崎県', lat: 32.7448, lng: 129.8737 },
  { name: '熊本県', lat: 32.7898, lng: 130.7417 },
  { name: '大分県', lat: 33.2382, lng: 131.6126 },
  { name: '宮崎県', lat: 31.9111, lng: 131.4239 },
  { name: '鹿児島県', lat: 31.5602, lng: 130.5581 },
  { name: '沖縄県', lat: 26.2125, lng: 127.6809 },
]

const PREFECTURE_NAMES = new Set(PREFECTURES.map(p => p.name))

/**
 * "都道府県 市区町村 地区" の空白区切り文字列（地図クリック時のジオコーディング結果）から
 * 都道府県名を抽出する。先頭トークンが都道府県名と一致しない場合はnullを返す。
 */
export function extractPrefecture(area: string | null | undefined): string | null {
  if (!area) return null
  const first = area.trim().split(/\s+/)[0]
  return PREFECTURE_NAMES.has(first) ? first : null
}

/**
 * "都道府県 市区町村 地区" から市区町村部分（先頭の都道府県を除いた残り）を抽出する。
 */
export function extractCity(area: string | null | undefined): string | null {
  if (!area) return null
  const parts = area.trim().split(/\s+/)
  if (parts.length < 2) return null
  return PREFECTURE_NAMES.has(parts[0]) ? parts.slice(1).join(' ') : area
}

export function getPrefectureCoords(name: string): { lat: number; lng: number } | null {
  return PREFECTURES.find(p => p.name === name) ?? null
}

export type RiskLevel = '高' | '中' | '低' | '情報なし'

export const RISK_LEVEL_STYLE: Record<RiskLevel, { color: string; bg: string }> = {
  '高': { color: '#B91C1C', bg: '#FEE2E2' },
  '中': { color: '#B45309', bg: '#FEF3C7' },
  '低': { color: '#15803D', bg: '#DCFCE7' },
  '情報なし': { color: '#6B7280', bg: '#F3F4F6' },
}

/**
 * 直近30日間の出没件数に基づく簡易リスクレベル。
 * 公的な統計に基づくものではなく、自社投稿データのみを用いた目安。
 */
export function calcRiskLevel(recentCount: number): RiskLevel {
  if (recentCount >= 10) return '高'
  if (recentCount >= 3) return '中'
  if (recentCount >= 1) return '低'
  return '情報なし'
}

export function isWithinDays(isoDate: string, days: number): boolean {
  const target = new Date(isoDate).getTime()
  const threshold = Date.now() - days * 24 * 60 * 60 * 1000
  return target >= threshold
}

export type ActivityLevel = '活発' | 'やや活発' | '低調' | 'データ不足'

export const ACTIVITY_LEVEL_STYLE: Record<ActivityLevel, { color: string; bg: string }> = {
  '活発': { color: '#B91C1C', bg: '#FEE2E2' },
  'やや活発': { color: '#B45309', bg: '#FEF3C7' },
  '低調': { color: '#15803D', bg: '#DCFCE7' },
  'データ不足': { color: '#6B7280', bg: '#F3F4F6' },
}

/**
 * 直近30日の投稿頻度から算出する簡易「出没頻度指数」。
 * あくまで市民投稿ベースの参考値であり、環境省が新たに開始した
 * 「胸模様カメラによる個体識別＋通過頻度」を用いた全国統一の個体数調査とは
 * 手法・精度が異なる点に注意（画面上でも必ず明記すること）。
 */
export function estimateActivityLevel(recent30: number): ActivityLevel {
  if (recent30 === 0) return 'データ不足'
  if (recent30 >= 8) return '活発'
  if (recent30 >= 3) return 'やや活発'
  return '低調'
}
