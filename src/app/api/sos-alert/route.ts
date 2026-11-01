import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

// 簡易レート制限（インメモリ・サーバーレス再起動でリセットされる想定の軽い抑止）
const attempts = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 60_000
const MAX_ATTEMPTS = 5

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  entry.count += 1
  return entry.count > MAX_ATTEMPTS
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ ok: false, error: 'リクエストが多すぎます。しばらくしてから再試行してください。' }, { status: 429 })
  }

  const { lat, lng, address, contactEmail } = await req.json()

  if (!contactEmail || typeof contactEmail !== 'string' || !EMAIL_RE.test(contactEmail)) {
    return NextResponse.json({ ok: false, error: '緊急連絡先が未登録です' }, { status: 400 })
  }
  if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ ok: false, error: '位置情報が不正です' }, { status: 400 })
  }
  if (address !== undefined && typeof address !== 'string') {
    return NextResponse.json({ ok: false, error: '住所の形式が不正です' }, { status: 400 })
  }

  const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`
  const now = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_ADDRESS,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })

  await transporter.sendMail({
    from: `"くま！おる！熊！ SOS" <${process.env.GMAIL_ADDRESS}>`,
    to: contactEmail,
    subject: `🆘【緊急SOS】熊による緊急事態の可能性 ${now}`,
    text: [
      '【緊急】くま！おる！熊！のSOSボタンが押されました。',
      '',
      `発信日時：${now}`,
      `現在地住所：${address || '取得中'}`,
      `GPS座標：緯度 ${lat}、経度 ${lng}`,
      '',
      `📍 Google マップで現在地を確認：`,
      mapsUrl,
      '',
      '至急連絡を取ってください。',
      '警察への通報は 110番 まで。',
      '',
      '※ このメールはくま！おる！熊！アプリのSOSボタンから自動送信されました。',
      'https://kuma-oru.hana.trickster.biz',
    ].join('\n'),
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#1a0000;color:#fff;padding:24px;border-radius:12px;">
        <h1 style="color:#FF4444;font-size:24px;margin:0 0 8px;">🆘 緊急SOS</h1>
        <p style="color:#ffaaaa;margin:0 0 20px;font-size:14px;">くま！おる！熊！のSOSボタンが押されました。至急確認してください。</p>
        <div style="background:#2d0000;border:2px solid #FF4444;border-radius:8px;padding:16px;margin-bottom:20px;">
          <p style="margin:4px 0;font-size:13px;color:#ccc;">📅 発信日時：<strong style="color:#fff;">${now}</strong></p>
          <p style="margin:4px 0;font-size:13px;color:#ccc;">📍 住所：<strong style="color:#fff;">${address || '取得中'}</strong></p>
          <p style="margin:4px 0;font-size:13px;color:#ccc;">🌐 GPS：<strong style="color:#fff;">緯度 ${lat}、経度 ${lng}</strong></p>
        </div>
        <a href="${mapsUrl}" style="display:block;background:#FF4444;color:#fff;text-align:center;padding:14px;border-radius:8px;font-weight:bold;font-size:16px;text-decoration:none;margin-bottom:16px;">
          📍 Google マップで現在地を確認する
        </a>
        <p style="color:#ff8888;font-size:13px;text-align:center;">警察への通報は <strong>110番</strong> まで</p>
        <hr style="border-color:#440000;margin:20px 0;">
        <p style="color:#666;font-size:11px;text-align:center;">このメールはくま！おる！熊！アプリから自動送信されました</p>
      </div>
    `,
  })

  return NextResponse.json({ ok: true })
}
