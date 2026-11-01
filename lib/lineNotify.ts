const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push'
const LINE_REPLY_URL = 'https://api.line.me/v2/bot/message/reply'

async function callLineApi(url: string, body: object): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    console.error('LINE API error', res.status, await res.text())
  }
}

export function pushLineMessage(userId: string, text: string): Promise<void> {
  return callLineApi(LINE_PUSH_URL, { to: userId, messages: [{ type: 'text', text }] })
}

export function replyLineMessage(replyToken: string, text: string): Promise<void> {
  return callLineApi(LINE_REPLY_URL, { replyToken, messages: [{ type: 'text', text }] })
}
