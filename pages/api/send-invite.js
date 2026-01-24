import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, name, role, inviterName } = req.body

  if (!email || !name) {
    return res.status(400).json({ error: 'メールアドレスと名前は必須です' })
  }

  const roleLabel = {
    owner: '責任者',
    admin: '担当者',
    staff: '確認者'
  }[role] || '確認者'

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tokutei-ginou-app.vercel.app'

  try {
    const { data, error } = await resend.emails.send({
      from: '特定技能 受入れ管理 <noreply@resend.dev>',
      to: email,
      subject: `【特定技能 受入れ管理】${inviterName}さんから招待が届いています`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #14b8a6;">特定技能 受入れ管理システム</h2>
          <p>${name}さん</p>
          <p>${inviterName}さんから「特定技能 受入れ管理システム」への招待が届いています。</p>
          <div style="background: #f1f5f9; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <p style="margin: 0;"><strong>あなたの役職:</strong> ${roleLabel}</p>
          </div>
          <p>以下のリンクからログインしてください：</p>
          <a href="${appUrl}" style="display: inline-block; background: linear-gradient(to right, #14b8a6, #10b981); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            アプリを開く
          </a>
          <p style="margin-top: 30px; color: #64748b; font-size: 14px;">
            ※このメールに心当たりがない場合は、無視してください。
          </p>
        </div>
      `
    })

    if (error) {
      console.error('Resend error:', error)
      return res.status(500).json({ error: 'メール送信に失敗しました' })
    }

    return res.status(200).json({ success: true, messageId: data?.id })
  } catch (err) {
    console.error('Send invite error:', err)
    return res.status(500).json({ error: 'メール送信に失敗しました' })
  }
}
