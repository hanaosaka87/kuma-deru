import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

const APP_LABELS: Record<string, string> = {
  'kuma-deru': 'くま！おる！熊！',
}
const CAT_LABELS: Record<string, string> = {
  bug: 'バグ報告', request: '改善要望', other: 'その他',
}

export async function POST(req: NextRequest) {
  const payload = await req.json()
  const { type, appName, rating, comment, category, body } = payload

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_ADDRESS,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })

  const label = APP_LABELS[appName] ?? appName
  let subject = ''
  let text = ''

  if (type === 'review') {
    const stars = '⭐'.repeat(rating) + '☆'.repeat(5 - rating)
    subject = `【レビュー】${label} ${stars}`
    text = `アプリ: ${label}\n評価: ${stars} (${rating}/5)\nコメント: ${comment || 'なし'}\n受信日時: ${new Date().toLocaleString('ja-JP')}`
  } else {
    const catLabel = CAT_LABELS[category] ?? category
    subject = `【フィードバック・${catLabel}】${label}`
    text = `アプリ: ${label}\nカテゴリ: ${catLabel}\n内容:\n${body}\n受信日時: ${new Date().toLocaleString('ja-JP')}`
  }

  await transporter.sendMail({
    from: `"株式会社華" <${process.env.GMAIL_ADDRESS}>`,
    to: 'hana@trickster.biz',
    subject,
    text,
  })

  return NextResponse.json({ ok: true })
}
