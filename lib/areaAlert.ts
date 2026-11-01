import nodemailer from 'nodemailer'
import { supabaseAdmin } from './supabase-admin'
import { pushLineMessage } from './lineNotify'

type AreaAlertParams = {
  area: string
  description?: string | null
  urgent?: boolean
  sightingId?: string | number | null
  source?: 'user' | 'news_auto' | 'x_auto'
}

/**
 * 登録エリアと一致する住民・学校・自治体へ熊出没の通知（メール or LINE）を送る。
 * ユーザー投稿時だけでなく、ニュース自動集約（news_auto）・X自動集約（x_auto）でも同じ経路で通知する。
 */
// 種別ごとの対応参考情報（学校・自治体向けは初動対応の検討材料を追記する）
const SUBSCRIBER_TYPE_NOTE: Record<string, string> = {
  '学校・教育機関': '\n\n【学校・教育機関の方へ】\n登下校時間帯の見守り強化や付き添い・集団下校のご検討、保護者・地域への注意喚起をご検討ください。',
  '自治体・行政': '\n\n【自治体・行政の方へ】\n防災行政無線等での周辺住民への注意喚起、関係部署（猟友会・教育委員会等）との情報共有をご検討ください。',
}

export async function sendAreaAlert({ area, description, urgent, sightingId, source = 'user' }: AreaAlertParams): Promise<{ notified: number }> {
  if (!area) return { notified: 0 }

  const { data: subs } = await supabaseAdmin
    .from('bear_area_subscriptions')
    .select('email, area, subscriber_type, line_user_id')

  const matched = (subs ?? []).filter(
    (s) => s.area && (s.area === area || area.includes(s.area) || s.area.includes(area))
  )

  if (matched.length === 0) return { notified: 0 }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_ADDRESS,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })

  const subject = urgent
    ? `【緊急】${area}付近で熊の目撃情報があります`
    : `【くま！おる！熊！】${area}付近で熊の目撃情報があります`

  const sourceNote =
    source === 'news_auto' ? '\n\n※この情報はニュース報道をAIが分析し自動登録したものです。'
    : source === 'x_auto' ? '\n\n※この情報はX（旧Twitter）の投稿をAIが分析し自動登録したものです。'
    : ''

  await Promise.allSettled(
    matched.map((s) => {
      const typeNote = SUBSCRIBER_TYPE_NOTE[s.subscriber_type ?? ''] ?? ''
      const text = `登録エリア「${area}」付近で熊の目撃情報が投稿されました。\n\n内容: ${description || '（説明なし）'}${sourceNote}${typeNote}\n\nアプリで詳細を確認してください。\nhttps://kuma-oru.hana.trickster.biz/map\n\n---\nこの通知は「くま！おる！熊！」でエリア登録された方に送信しています。\n通知の停止をご希望の場合はアプリ内のフィードバックよりご連絡ください。\nsightingId: ${sightingId ?? ''}`

      if (s.line_user_id) {
        return pushLineMessage(s.line_user_id, text)
      }

      return transporter.sendMail({
        from: `"くま！おる！熊！" <${process.env.GMAIL_ADDRESS}>`,
        to: s.email,
        subject,
        text,
      })
    })
  )

  // 緊急投稿は管理者にも通知（自治体・猟友会への人力連絡バックアップ）
  if (urgent && source === 'user') {
    await transporter.sendMail({
      from: `"くま！おる！熊！" <${process.env.GMAIL_ADDRESS}>`,
      to: process.env.GMAIL_ADDRESS!,
      subject: `【要確認・緊急】${area}で熊の緊急目撃情報`,
      text: `緊急の目撃情報が投稿されました。自治体・猟友会への連絡をご確認ください。\n\nエリア: ${area}\n内容: ${description || '（説明なし）'}\nsightingId: ${sightingId ?? ''}\n\n登録者への通知件数: ${matched.length}件\n\nhttps://kuma-oru.hana.trickster.biz/map`,
    }).catch(() => {})
  }

  return { notified: matched.length }
}
