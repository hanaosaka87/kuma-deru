import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  const { org, division, name, email, orgType, message } = await req.json()

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_ADDRESS, pass: process.env.GMAIL_APP_PASSWORD },
  })

  await transporter.sendMail({
    from: `"くま！おる！熊！" <${process.env.GMAIL_ADDRESS}>`,
    to: 'hana@trickster.biz',
    subject: `【行政連携問い合わせ】${org} / ${orgType}`,
    text: [
      '行政・猟友会からの連携問い合わせがありました。',
      '',
      `組織名: ${org}`,
      `担当部署: ${division}`,
      `担当者名: ${name}`,
      `メール: ${email}`,
      `種別: ${orgType}`,
      `問い合わせ内容:\n${message}`,
    ].join('\n'),
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}
