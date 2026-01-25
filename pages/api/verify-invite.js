import { createClient } from '@supabase/supabase-js'

// サーバーサイドでService Roleキーを使用してRLSをバイパス
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userId } = req.query

  if (!userId) {
    return res.status(400).json({ error: 'ユーザーIDは必須です' })
  }

  try {
    // Service Roleでユーザー情報を取得（RLSをバイパス）
    const { data: userData, error } = await supabaseAdmin
      .from('users')
      .select('id, name, email, role, status')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('User fetch error:', error)
      return res.status(404).json({ error: 'ユーザーが見つかりません' })
    }

    if (!userData) {
      return res.status(404).json({ error: 'ユーザーが見つかりません' })
    }

    if (userData.status === 'active') {
      return res.status(400).json({
        error: 'このアカウントはすでに有効化されています',
        alreadyActive: true
      })
    }

    if (userData.status !== 'pending') {
      return res.status(400).json({ error: '無効な招待リンクです' })
    }

    // 招待が有効な場合、必要な情報のみ返す
    return res.status(200).json({
      success: true,
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role
      }
    })
  } catch (err) {
    console.error('Verify invite error:', err)
    return res.status(500).json({ error: 'サーバーエラーが発生しました' })
  }
}
