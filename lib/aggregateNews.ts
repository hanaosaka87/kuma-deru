import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from './supabase-admin'
import { PREFECTURES, getPrefectureCoords } from './prefectures'
import { sendAreaAlert } from './areaAlert'

const client = new Anthropic()

const DEFAULT_QUERY = '(クマ OR 熊) (出没 OR 目撃 OR 被害)'
const DEFAULT_MAX_ITEMS = 15

function buildNewsRssUrl(query: string): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ja&gl=JP&ceid=JP:ja`
}

/** Yahoo!ニュースは記事単位のキーワード検索RSSを提供していないため、Google NewsのRSS検索をnews.yahoo.co.jpドメインに絞ることで「Yahoo!ニュースに掲載されたクマ関連記事」のみを取得する */
function buildYahooNewsRssUrl(query: string): string {
  return buildNewsRssUrl(`site:news.yahoo.co.jp ${query}`)
}

const X_SEARCH_QUERY = '(#熊出没情報 OR (熊 出没) OR (熊 目撃) OR (クマ 出没) OR (クマ 目撃)) -is:retweet lang:ja'

type NewsItem = {
  title: string
  link: string
  pubDate: string | null
  origin: 'news' | 'yahoo' | 'x'
}

type XApiTweet = { id: string; text: string; created_at?: string }

/** X API v2 recent search で直近のクマ目撃・出没ポストを取得する（X_BEARER_TOKEN未設定時は空配列を返しスキップする） */
async function fetchXPosts(maxResults: number): Promise<NewsItem[]> {
  const token = process.env.X_BEARER_TOKEN
  if (!token) return []
  try {
    const count = Math.min(Math.max(maxResults, 10), 100)
    const url = `https://api.x.com/2/tweets/search/recent?query=${encodeURIComponent(X_SEARCH_QUERY)}&max_results=${count}&tweet.fields=created_at`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) {
      console.error('[aggregateNews] X API error:', res.status, await res.text().catch(() => ''))
      return []
    }
    const data = await res.json()
    const tweets: XApiTweet[] = data.data ?? []
    return tweets.map(t => ({
      title: t.text,
      link: `https://x.com/i/web/status/${t.id}`,
      pubDate: t.created_at ?? null,
      origin: 'x' as const,
    }))
  } catch {
    return []
  }
}

type ExtractResult = {
  is_bear_news: boolean
  prefecture: string | null
  city: string | null
  summary: string | null
  urgent: boolean
}

const PREFECTURE_NAMES = new Set(PREFECTURES.map(p => p.name))

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function parseRss(xml: string): NewsItem[] {
  const items: NewsItem[] = []
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? []
  for (const block of itemBlocks) {
    const title = block.match(/<title>([\s\S]*?)<\/title>/)?.[1]
    const link = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]
    const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? null
    if (title && link) {
      items.push({ title: stripTags(title), link: stripTags(link), pubDate, origin: 'news' })
    }
  }
  return items
}

/** 記事リンク文字列から決定論的な小さな緯度経度オフセットを算出する（同一地点の複数ピンが完全に重ならないようにするため） */
function hashOffset(seed: string, range: number): { dLat: number; dLng: number } {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0
  }
  const positive = (n: number) => ((n % 1000) + 1000) % 1000
  const a = (positive(h) / 1000) * range * 2 - range
  const b = (positive(h >> 8) / 1000) * range * 2 - range
  return { dLat: a, dLng: b }
}

const PREFECTURE_CAPITAL_JITTER = 0.15 // 県庁所在地フォールバック用（約±15km）
const GEOCODE_JITTER = 0.01 // Geocoding成功時の重複回避用（約±1km）

/** 「都道府県 市区町村」をGoogle Maps Geocoding APIで実座標に変換する（市区町村単位で位置を特定するため） */
async function geocodeArea(area: string): Promise<{ lat: number; lng: number } | null> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!key) return null
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(area)}&region=jp&key=${key}`
    const res = await fetch(url)
    const data = await res.json()
    const loc = data.results?.[0]?.geometry?.location
    if (typeof loc?.lat === 'number' && typeof loc?.lng === 'number') {
      return { lat: loc.lat, lng: loc.lng }
    }
    return null
  } catch {
    return null
  }
}

async function extractBearInfo(item: NewsItem): Promise<ExtractResult | null> {
  const label = item.origin === 'x' ? 'X（旧Twitter）の投稿本文' : 'ニュース記事の見出し'
  const prompt = `以下は日本の${label}です。この内容が「日本国内での実際のクマ（ツキノワグマ・ヒグマ等）の目撃・出没・被害」を報じているかを判定し、以下のJSON形式のみで回答してください（前後に説明文をつけないこと）。

本文: ${item.title}

{
  "is_bear_news": 実際の熊の目撃・出没・被害について述べている場合true。熊に関係ない内容（例: 「くまのプーさん」、商品名、人名、スポーツチーム名、過去のまとめ・コラム記事、個人の感想のみで具体的な目撃情報を含まないもの等）の場合はfalse,
  "prefecture": 出没した都道府県名（例: "秋田県"）。判別できない場合はnull,
  "city": 市区町村名（例: "鹿角市"）。判別できない場合はnull,
  "summary": 内容を50字程度で要約したもの。判別できない場合はnull,
  "urgent": 人身被害（けが・死亡）が報じられている場合true、それ以外はfalse
}`

  try {
    const res = await client.messages.create({
      model: 'claude-haiku-5-5',
      max_tokens: 300,
      thinking: { type: 'disabled' },
      messages: [{ role: 'user', content: prompt }],
    })
    const text = (res.content[0] as { text: string }).text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[0])
    return {
      is_bear_news: !!parsed.is_bear_news,
      prefecture: typeof parsed.prefecture === 'string' && PREFECTURE_NAMES.has(parsed.prefecture) ? parsed.prefecture : null,
      city: typeof parsed.city === 'string' ? parsed.city : null,
      summary: typeof parsed.summary === 'string' ? parsed.summary : null,
      urgent: !!parsed.urgent,
    }
  } catch {
    return null
  }
}

export type AggregateResult = {
  fetched: number
  fetchedByOrigin: { news: number; yahoo: number; x: number }
  xEnabled: boolean
  inserted: number
  insertedByOrigin: { news: number; yahoo: number; x: number }
  skippedDuplicate: number
  skippedIrrelevant: number
  skippedNoLocation: number
  errors: number
}

/**
 * Google News RSS（全体検索＋news.yahoo.co.jpドメイン限定検索）とX API（#熊出没情報等の検索）からクマ関連の記事・投稿を取得し、
 * Claudeで内容を抽出した上で都道府県が判別できたものを bear_sightings に登録する（ニュースは source='news_auto'、Xは source='x_auto'）。
 * 位置は「都道府県+市区町村」をGoogle Maps Geocoding APIで実座標化したものを優先し、
 * 取得できない場合は都道府県庁所在地付近（記事リンクから決定論的に算出した小さなオフセット付き）にフォールバックする。
 * 登録時にはユーザー投稿と同様にエリア通知（sendAreaAlert）も送信する。
 */
export async function aggregateNewsSightings(options?: { query?: string; maxItems?: number }): Promise<AggregateResult> {
  const result: AggregateResult = {
    fetched: 0,
    fetchedByOrigin: { news: 0, yahoo: 0, x: 0 },
    xEnabled: !!process.env.X_BEARER_TOKEN,
    inserted: 0,
    insertedByOrigin: { news: 0, yahoo: 0, x: 0 },
    skippedDuplicate: 0,
    skippedIrrelevant: 0,
    skippedNoLocation: 0,
    errors: 0,
  }

  const query = options?.query ?? DEFAULT_QUERY
  const maxItems = options?.maxItems ?? DEFAULT_MAX_ITEMS

  const [googleRes, yahooRes] = await Promise.allSettled([
    fetch(buildNewsRssUrl(query)),
    fetch(buildYahooNewsRssUrl(query)),
  ])
  const xPosts = await fetchXPosts(maxItems)

  const allItems: NewsItem[] = []
  if (googleRes.status === 'fulfilled' && googleRes.value.ok) {
    const xml = await googleRes.value.text()
    allItems.push(...parseRss(xml).slice(0, maxItems))
  } else {
    console.error('[aggregateNews] Google News fetch failed:', googleRes.status === 'fulfilled' ? googleRes.value.status : googleRes.reason)
  }
  if (yahooRes.status === 'fulfilled' && yahooRes.value.ok) {
    const xml = await yahooRes.value.text()
    allItems.push(...parseRss(xml).slice(0, maxItems).map(i => ({ ...i, origin: 'yahoo' as const })))
  } else {
    console.error('[aggregateNews] Yahoo News fetch failed:', yahooRes.status === 'fulfilled' ? yahooRes.value.status : yahooRes.reason)
  }
  allItems.push(...xPosts)

  // リンクで重複排除してmaxItems件に絞る
  const seen = new Set<string>()
  const items = allItems.filter(item => {
    if (seen.has(item.link)) return false
    seen.add(item.link)
    return true
  }).slice(0, maxItems * 3)

  result.fetched = items.length
  for (const item of items) {
    result.fetchedByOrigin[item.origin]++
  }

  for (const item of items) {
    try {
      const info = await extractBearInfo(item)
      if (!info || !info.is_bear_news) {
        result.skippedIrrelevant++
        continue
      }
      if (!info.prefecture) {
        result.skippedNoLocation++
        continue
      }
      const area = [info.prefecture, info.city].filter(Boolean).join(' ')
      const geocoded = await geocodeArea(area)

      let coords: { lat: number; lng: number }
      let locationNote: string
      if (geocoded) {
        const { dLat, dLng } = hashOffset(item.link, GEOCODE_JITTER)
        coords = { lat: geocoded.lat + dLat, lng: geocoded.lng + dLng }
        locationNote = `位置は${area}付近の概算です`
      } else {
        const base = getPrefectureCoords(info.prefecture)
        if (!base) {
          result.skippedNoLocation++
          continue
        }
        const { dLat, dLng } = hashOffset(item.link, PREFECTURE_CAPITAL_JITTER)
        coords = { lat: base.lat + dLat, lng: base.lng + dLng }
        locationNote = `位置は${info.prefecture}庁所在地付近の概算です`
      }
      const sightedAt = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()
      const source = item.origin === 'x' ? 'x_auto' : 'news_auto'
      // 出典URLはYahoo!ニュース由来でもGoogle News経由のリンク形式（news.google.com/...）になり見た目で区別できないため、
      // 説明文に取得元を明記して判別できるようにする
      const originLabel =
        item.origin === 'x' ? 'X（旧Twitter）の投稿をもとに'
        : item.origin === 'yahoo' ? 'Yahoo!ニュースの報道をもとに'
        : 'Google Newsで検出したニュース報道をもとに'

      const { data: insertedRow, error } = await supabaseAdmin.from('bear_sightings').insert({
        lat: coords.lat,
        lng: coords.lng,
        photo_url: null,
        description: `${info.summary ?? item.title}\n\n（${originLabel}AIが自動登録した情報です。${locationNote}）\n出典: ${item.link}`,
        area,
        prefecture: info.prefecture,
        urgent: info.urgent,
        status: '目撃情報',
        report_count: 1,
        source,
        source_url: item.link,
        sighted_at: sightedAt,
      }).select('id').single()

      if (error) {
        // source_urlのユニーク制約違反は重複記事として扱う
        if (error.code === '23505') {
          result.skippedDuplicate++
        } else {
          console.error('[aggregateNews] insert error:', error.message)
          result.errors++
        }
        continue
      }
      result.inserted++
      result.insertedByOrigin[item.origin]++
      const sightingId = insertedRow?.id ?? null
      await sendAreaAlert({ area, description: info.summary ?? item.title, urgent: info.urgent, source, sightingId }).catch(() => {})

      // Web Push通知（ユーザー投稿経路の/api/area-alertと同じ内容。ニュース/X自動登録時のみ抜けていたため追加）
      const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kuma-oru.hana.trickster.biz'
      fetch(`${base}/api/push/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${info.urgent ? '【緊急】' : ''}🐻 ${area}で熊の目撃情報（${item.origin === 'x' ? 'X' : 'ニュース'}より）`,
          body: (info.summary ?? item.title).slice(0, 60),
          url: '/map',
          prefecture: info.prefecture,
        }),
      }).catch(() => {})

      // Xくまおるくま速報bot（承認キュー）: ニュース由来（news_auto）のみ対象。
      // X由来の投稿(x_auto)を再度Xへ投稿するとプラットフォームの自動化ポリシーに抵触しうるため対象外とする。
      if (source === 'news_auto') {
        const urgentPrefix = info.urgent ? '【緊急】' : ''
        const tweetText = `${urgentPrefix}🐻 ${area}で熊の目撃情報\n\n${info.summary ?? item.title}\n\n詳細・エリア通知登録はこちら\nhttps://kuma-oru.hana.trickster.biz/map\n\n#熊出没情報 #くまおるくま`
        await supabaseAdmin.from('bear_tweet_queue').insert({
          sighting_id: sightingId,
          text: tweetText,
          status: 'pending',
        })
      }
    } catch {
      result.errors++
    }
  }

  return result
}
