import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

// Supabaseクライアント（サーバーサイド用）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Resendクライアント（なければnodemailerにフォールバック）
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// フォールバック用nodemailer
let nodemailerTransporter = null
if (!resend && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  const nodemailer = require('nodemailer')
  nodemailerTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  })
}

// HTMLエスケープ関数
function escapeHtml(text) {
  if (!text) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// メールアドレス形式検証
function isValidEmail(email) {
  if (!email) return true // メールは任意
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// レート制限用（簡易版：メモリベース）
const rateLimitMap = new Map()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1分
const RATE_LIMIT_MAX = 3 // 1分あたり3回まで

function checkRateLimit(ip) {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record) {
    rateLimitMap.set(ip, { count: 1, startTime: now })
    return true
  }

  if (now - record.startTime > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { count: 1, startTime: now })
    return true
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false
  }

  record.count++
  return true
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // レート制限チェック
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: 'リクエストが多すぎます。しばらくしてから再試行してください。' })
  }

  // 認証チェック：Authorizationヘッダーからトークンを取得
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '認証が必要です' })
  }

  const token = authHeader.replace('Bearer ', '')

  // トークンを検証してユーザー情報を取得
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return res.status(401).json({ error: '認証に失敗しました' })
  }

  const { content, userName, userEmail } = req.body

  // 入力検証
  if (!content) {
    return res.status(400).json({ error: 'フィードバック内容は必須です' })
  }

  if (content.length > 5000) {
    return res.status(400).json({ error: 'フィードバックは5000文字以内で入力してください' })
  }

  if (userName && userName.length > 100) {
    return res.status(400).json({ error: '名前は100文字以内で入力してください' })
  }

  if (userEmail && !isValidEmail(userEmail)) {
    return res.status(400).json({ error: '有効なメールアドレスを入力してください' })
  }

  // 責任者のメールアドレス（環境変数から取得）
  const ownerEmail = process.env.OWNER_EMAIL || process.env.GMAIL_USER
  const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.GMAIL_USER
  const fromName = '特定技能 受入れ管理'

  // HTMLエスケープを適用
  const safeContent = escapeHtml(content)
  const safeUserName = escapeHtml(userName) || '匿名'
  const safeUserEmail = escapeHtml(userEmail)

  const htmlContent = `
    <div style="font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 30px; border-radius: 16px 16px 0 0;">
        <h1 style="color: #14b8a6; margin: 0; font-size: 24px;">フィードバックが届きました</h1>
        <p style="color: #94a3b8; margin: 10px 0 0 0; font-size: 14px;">特定技能 受入れ管理システム</p>
      </div>
      <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: #f1f5f9; padding: 20px; border-radius: 12px; margin: 0 0 20px 0;">
          <p style="margin: 0 0 10px 0; color: #475569;"><strong>送信者:</strong> ${safeUserName}</p>
          ${safeUserEmail ? `<p style="margin: 0 0 10px 0; color: #475569;"><strong>メール:</strong> ${safeUserEmail}</p>` : ''}
          <p style="margin: 0; color: #475569;"><strong>日時:</strong> ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</p>
        </div>
        <div style="background: #ffffff; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <p style="margin: 0; color: #334155; white-space: pre-wrap; line-height: 1.6;">${safeContent}</p>
        </div>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
          特定技能 受入れ管理システムより自動送信
        </p>
      </div>
    </div>
  `

  try {
    if (resend) {
      // Resendで送信（推奨）
      await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: ownerEmail,
        subject: `【フィードバック】${safeUserName}さんからのご意見`,
        html: htmlContent
      })
    } else if (nodemailerTransporter) {
      // フォールバック：nodemailerで送信
      await nodemailerTransporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: ownerEmail,
        subject: `【フィードバック】${safeUserName}さんからのご意見`,
        html: htmlContent
      })
    } else {
      return res.status(500).json({ error: 'メール送信の設定がされていません' })
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('Email send error:', err.message)
    return res.status(500).json({ error: 'メール送信に失敗しました' })
  }
}
