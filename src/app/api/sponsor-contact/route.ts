import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  const { company, name, email, plan, message } = await req.json()

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_ADDRESS, pass: process.env.GMAIL_APP_PASSWORD },
  })

  await transporter.sendMail({
    from: `"くま！おる！熊！" <${process.env.GMAIL_ADDRESS}>`,
    to: 'hana@trickster.biz',
    subject: `【スポンサー申し込み】${company}（${plan}）`,
    text: `スポンサー申し込みがありました。\n\n会社名: ${company}\n担当者: ${name}\nメール: ${email}\n希望プラン: ${plan}\nメッセージ:\n${message}`,
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}
