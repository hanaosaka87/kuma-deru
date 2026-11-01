import { TwitterApi } from 'twitter-api-v2'

function getXClient(): TwitterApi {
  const { X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET } = process.env
  if (!X_API_KEY || !X_API_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_SECRET) {
    throw new Error('X APIの書き込み用認証情報（X_API_KEY/X_API_SECRET/X_ACCESS_TOKEN/X_ACCESS_SECRET）が未設定です')
  }
  return new TwitterApi({
    appKey: X_API_KEY,
    appSecret: X_API_SECRET,
    accessToken: X_ACCESS_TOKEN,
    accessSecret: X_ACCESS_SECRET,
  })
}

/** 承認済みの速報文をXへ投稿する（sns-automation/post-x.jsと同じOAuth1.0a User Contextパターン） */
export async function postToX(text: string): Promise<{ id: string; url: string }> {
  const client = getXClient()
  const tweet = await client.v2.tweet(text)
  return { id: tweet.data.id, url: `https://x.com/i/web/status/${tweet.data.id}` }
}
