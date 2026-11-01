import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  const { media, name, email, purpose, message } = await req.json()

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_ADDRESS, pass: process.env.GMAIL_APP_PASSWORD },
  })

  await transporter.sendMail({
    from: `"くま！おる！熊！" <${process.env.GMAIL_ADDRESS}>`,
    to: 'hana@trickster.biz',
    subject: `【取材申し込み】${media} / ${purpose}`,
    text: `取材・掲載のお問い合わせがありました。\n\n媒体名: ${media}\n担当者: ${name}\nメール: ${email}\n目的: ${purpose}\n取材内容:\n${message}`,
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}
