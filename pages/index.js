import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Head from 'next/head'

// チェックリスト定義
const checklistDefinitions = {
  preparation: {
    title: '受入れ準備', icon: '📋',
    items: [
      { id: 'p1', text: '外国人材の資格要件を確認した' },
      { id: 'p2', text: '協議会に入会申請した' },
      { id: 'p3', text: '入会証明書を取得した' },
      { id: 'p4', text: '事業所が証明書に登録されている' },
      { id: 'p5', text: '登録支援機関と契約した' },
      { id: 'p6', text: '雇用契約書を作成した' },
      { id: 'p7', text: '支援計画を策定した' },
      { id: 'p8', text: '事前ガイダンスを実施した' },
      { id: 'p9', text: '住居確保を支援した' },
    ]
  },
  entry: {
    title: '入社時届出', icon: '🚀',
    items: [
      { id: 'e1', text: '入管への届出を行った' },
      { id: 'e2', text: '協議会への登録を行った' },
      { id: 'e3', text: 'ハローワークへ届出した' },
      { id: 'e4', text: '社会保険手続きを行った' },
      { id: 'e5', text: '生活オリエンテーションを実施した' },
      { id: 'e6', text: '銀行口座開設を支援した' },
      { id: 'e7', text: '住民登録を支援した' },
    ]
  },
  ongoing: {
    title: '在籍中', icon: '📅',
    items: [
      { id: 'o1', text: '定期面談を実施した（3ヶ月に1回）' },
      { id: 'o2', text: '定期届出を行った（年1回：4〜5月）' },
      { id: 'o3', text: '協議会証明書の期限を確認した' },
      { id: 'o4', text: '在留カードの期限を確認した' },
    ]
  },
  renewal: {
    title: '在留更新', icon: '🔄',
    items: [
      { id: 'r1', text: '在留期限を確認した' },
      { id: 'r2', text: '協議会証明書の期限を確認した' },
      { id: 'r3', text: '必要書類を準備した' },
      { id: 'r4', text: '入管へ申請した' },
      { id: 'r5', text: '新しい在留カードを受領した' },
    ]
  },
  visitCare: {
    title: '訪問系サービス', icon: '🏠',
    items: [
      { id: 'v1', text: '初任者研修を修了している' },
      { id: 'v2', text: '実務経験1年以上ある' },
      { id: 'v3', text: '研修計画を作成した' },
      { id: 'v4', text: '同行訪問計画を作成した' },
      { id: 'v5', text: 'キャリアアップ計画を作成した' },
      { id: 'v6', text: '相談窓口を設置した' },
      { id: 'v7', text: 'ICT環境を整備した' },
      { id: 'v8', text: 'JICWELSに申請した' },
      { id: 'v9', text: '適合確認書を取得した' },
      { id: 'v10', text: '入管に届出した' },
      { id: 'v11', text: '協議会情報を更新した' },
      { id: 'v12', text: '利用者に説明し同意を得た' },
    ]
  },
  exit: {
    title: '退職手続き', icon: '👋',
    items: [
      { id: 'x1', text: '退職日を確定した' },
      { id: 'x2', text: '入管へ届出した（14日以内）' },
      { id: 'x3', text: '受入れ困難の届出をした' },
      { id: 'x4', text: '協議会へ報告した' },
      { id: 'x5', text: 'ハローワークへ届出した（10日以内）' },
      { id: 'x6', text: '社会保険の資格喪失届を提出した' },
    ]
  }
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  
  const [staffList, setStaffList] = useState([])
  const [facilities, setFacilities] = useState([])
  const [selectedStaffId, setSelectedStaffId] = useState(null)
  const [showAddStaff, setShowAddStaff] = useState(false)
  const [showArchive, setShowArchive] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [pendingChanges, setPendingChanges] = useState({})
  
  const [interviews, setInterviews] = useState([])
  const [showAddInterview, setShowAddInterview] = useState(false)
  const [newInterview, setNewInterview] = useState({ date: '', content: '', next_actions: '' })
  
  const [activityLogs, setActivityLogs] = useState([])
  const [feedbackContent, setFeedbackContent] = useState('')
  const [feedbackSent, setFeedbackSent] = useState(false)

  const [newStaff, setNewStaff] = useState({
    name: '', name_kana: '', nationality: 'ネパール',
    entry_date: '', facility_id: ''
  })

  // 初期化・認証チェック
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('auth_id', session.user.id)
          .single()
        
        if (userData) {
          setCurrentUser(userData)
          setIsLoggedIn(true)
          loadData()
        }
      }
    } catch (error) {
      console.error('Auth check error:', error)
    }
    setIsLoading(false)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError('')
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword
      })
      
      if (error) throw error
      
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', data.user.id)
        .single()
      
      if (userData) {
        setCurrentUser(userData)
        setIsLoggedIn(true)
        loadData()
      } else {
        setLoginError('ユーザー情報が見つかりません')
      }
    } catch (error) {
      setLoginError('ログインに失敗しました: ' + error.message)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsLoggedIn(false)
    setCurrentUser(null)
  }

  const loadData = async () => {
    // スタッフ一覧
    const { data: staffData } = await supabase
      .from('foreign_staff')
      .select('*')
      .order('created_at', { ascending: false })
    if (staffData) setStaffList(staffData)

    // 事業所一覧
    const { data: facilityData } = await supabase
      .from('facilities')
      .select('*')
    if (facilityData) setFacilities(facilityData)

    // 操作履歴
    const { data: logData } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (logData) setActivityLogs(logData)
  }

  // スタッフ選択時に面談記録とチェックリストを読み込み
  useEffect(() => {
    if (selectedStaffId) {
      loadStaffDetails(selectedStaffId)
    }
  }, [selectedStaffId])

  const loadStaffDetails = async (staffId) => {
    const { data: interviewData } = await supabase
      .from('interviews')
      .select('*')
      .eq('staff_id', staffId)
      .order('interview_date', { ascending: false })
    if (interviewData) setInterviews(interviewData)
  }

  // 操作ログ記録
  const logActivity = async (actionType, targetTable, targetId, targetName, oldValue, newValue, description) => {
    await supabase.from('activity_logs').insert({
      user_id: currentUser?.id,
      user_name: currentUser?.name,
      action_type: actionType,
      target_table: targetTable,
      target_id: targetId,
      target_name: targetName,
      old_value: oldValue,
      new_value: newValue,
      description: description
    })
  }

  // スタッフ追加
  const handleAddStaff = async () => {
    if (!newStaff.name || !newStaff.entry_date) return
    
    const entryDate = new Date(newStaff.entry_date)
    const residenceExpiry = new Date(entryDate)
    residenceExpiry.setFullYear(residenceExpiry.getFullYear() + 1)
    
    const staffData = {
      ...newStaff,
      residence_expiry: residenceExpiry.toISOString().split('T')[0],
      status: 'active',
      current_phase: 'preparation'
    }
    
    const { data, error } = await supabase.from('foreign_staff').insert(staffData).select()
    
    if (!error && data) {
      await logActivity('create', 'foreign_staff', data[0].id, newStaff.name, null, staffData, `${newStaff.name}さんを追加`)
      loadData()
      setShowAddStaff(false)
      setNewStaff({ name: '', name_kana: '', nationality: 'ネパール', entry_date: '', facility_id: '' })
    }
  }

  // 面談記録追加
  const handleAddInterview = async () => {
    if (!newInterview.date || !newInterview.content) return
    
    const interviewData = {
      staff_id: selectedStaffId,
      interview_date: newInterview.date,
      content: newInterview.content,
      next_actions: newInterview.next_actions,
      interviewer_id: currentUser?.id,
      created_by: currentUser?.id
    }
    
    const { error } = await supabase.from('interviews').insert(interviewData)
    
    if (!error) {
      const staff = staffList.find(s => s.id === selectedStaffId)
      await logActivity('create', 'interviews', selectedStaffId, staff?.name, null, interviewData, `${staff?.name}さんの面談記録を追加`)
      loadStaffDetails(selectedStaffId)
      setShowAddInterview(false)
      setNewInterview({ date: '', content: '', next_actions: '' })
    }
  }

  // フィードバック送信
  const handleSendFeedback = async () => {
    if (!feedbackContent.trim()) return
    
    const { error } = await supabase.from('feedback').insert({
      user_id: currentUser?.id,
      user_name: currentUser?.name,
      content: feedbackContent,
      feedback_type: 'suggestion'
    })
    
    if (!error) {
      setFeedbackSent(true)
      setFeedbackContent('')
      setTimeout(() => setFeedbackSent(false), 3000)
    }
  }

  // ユーティリティ
  const getDaysUntil = (dateStr) => {
    if (!dateStr) return 999
    return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
  }

  const getFacilityName = (facilityId) => {
    const facility = facilities.find(f => f.id === facilityId)
    return facility?.name || '未設定'
  }

  const activeStaff = staffList.filter(s => s.status !== 'archived')
  const archivedStaff = staffList.filter(s => s.status === 'archived')
  const selectedStaff = staffList.find(s => s.id === selectedStaffId)

  // ローディング画面
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">読み込み中...</p>
        </div>
      </div>
    )
  }

  // ログイン画面
  if (!isLoggedIn) {
    return (
      <>
        <Head>
          <title>ログイン | 特定技能 受入れ管理システム</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8 w-full max-w-md">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-3xl mx-auto mb-4">🏥</div>
              <h1 className="text-2xl font-bold text-white">特定技能 受入れ管理</h1>
              <p className="text-slate-400 mt-2">介護分野</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">メールアドレス</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-teal-500 focus:outline-none"
                  placeholder="your@email.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">パスワード</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-teal-500 focus:outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
              
              {loginError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {loginError}
                </div>
              )}
              
              <button
                type="submit"
                className="w-full py-3 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold hover:shadow-lg hover:shadow-teal-500/30 transition-all"
              >
                ログイン
              </button>
            </form>
            
            <p className="text-center text-slate-500 text-sm mt-6">
              アカウントは管理者にお問い合わせください
            </p>
          </div>
        </div>
      </>
    )
  }

  // メインアプリ
  return (
    <>
      <Head>
        <title>特定技能 受入れ管理システム</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
        {/* ヘッダー */}
        <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-xl">🏥</div>
                <div>
                  <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">特定技能 受入れ管理</h1>
                  <p className="text-xs text-slate-500">介護分野</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <nav className="flex gap-1">
                  {[
                    { id: 'dashboard', icon: '📊', label: 'ダッシュボード' },
                    { id: 'staff', icon: '👥', label: 'スタッフ' },
                    { id: 'logs', icon: '📜', label: '操作履歴' },
                    { id: 'feedback', icon: '💬', label: 'フィードバック' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id); setSelectedStaffId(null) }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span className="text-sm">{tab.label}</span>
                    </button>
                  ))}
                </nav>
                
                <div className="flex items-center gap-3 pl-4 border-l border-slate-700">
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-200">{currentUser?.name}</p>
                    <p className="text-xs text-slate-500">{currentUser?.role === 'owner' ? 'オーナー' : currentUser?.role === 'admin' ? '管理者' : '事務員'}</p>
                  </div>
                  <button onClick={handleLogout} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
                    🚪
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6">
          {/* ダッシュボード */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-teal-500/20 to-teal-600/10 border border-teal-500/30 rounded-2xl p-5">
                  <div className="text-3xl font-bold text-teal-400">{activeStaff.length}</div>
                  <div className="text-sm text-slate-400 mt-1">在籍人数</div>
                </div>
                <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-2xl p-5">
                  <div className="text-3xl font-bold text-amber-400">
                    {activeStaff.filter(s => getDaysUntil(s.residence_expiry) <= 90 && getDaysUntil(s.residence_expiry) > 0).length}
                  </div>
                  <div className="text-sm text-slate-400 mt-1">更新期限90日以内</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-2xl p-5">
                  <div className="text-3xl font-bold text-purple-400">{activeStaff.filter(s => s.visit_care_ready).length}</div>
                  <div className="text-sm text-slate-400 mt-1">訪問系対応可</div>
                </div>
                <div className="bg-gradient-to-br from-rose-500/20 to-rose-600/10 border border-rose-500/30 rounded-2xl p-5">
                  <div className="text-3xl font-bold text-rose-400">{activeStaff.filter(s => s.status === 'exiting').length}</div>
                  <div className="text-sm text-slate-400 mt-1">退職手続き中</div>
                </div>
              </div>

              <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700/50">
                <h2 className="text-lg font-bold mb-4">⚠️ 対応が必要なスタッフ</h2>
                <div className="space-y-3">
                  {activeStaff
                    .filter(s => getDaysUntil(s.residence_expiry) <= 90)
                    .map(staff => (
                      <div
                        key={staff.id}
                        onClick={() => { setSelectedStaffId(staff.id); setActiveTab('staffDetail') }}
                        className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl cursor-pointer hover:bg-amber-500/20 transition-all"
                      >
                        <div>
                          <p className="font-semibold text-white">{staff.name}</p>
                          <p className="text-sm text-slate-400">{getFacilityName(staff.facility_id)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-amber-400 font-semibold">在留期限まで{getDaysUntil(staff.residence_expiry)}日</p>
                          <p className="text-sm text-slate-500">{staff.residence_expiry}</p>
                        </div>
                      </div>
                    ))}
                  {activeStaff.filter(s => getDaysUntil(s.residence_expiry) <= 90).length === 0 && (
                    <p className="text-slate-500 text-center py-4">現在、緊急の対応事項はありません</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* スタッフ一覧 */}
          {activeTab === 'staff' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">スタッフ一覧</h2>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowArchive(!showArchive)}
                    className={`px-4 py-2 rounded-xl border transition-all ${showArchive ? 'border-slate-500 bg-slate-800' : 'border-slate-700 text-slate-400'}`}
                  >
                    📦 アーカイブ ({archivedStaff.length})
                  </button>
                  <button onClick={() => setShowAddStaff(true)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold">
                    + スタッフ追加
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {(showArchive ? archivedStaff : activeStaff).map(staff => (
                  <div
                    key={staff.id}
                    onClick={() => { setSelectedStaffId(staff.id); setActiveTab('staffDetail') }}
                    className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 cursor-pointer hover:border-teal-500/50 transition-all"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-bold">{staff.name}</h3>
                        <p className="text-sm text-slate-400">{getFacilityName(staff.facility_id)}</p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs bg-slate-700">{staff.nationality}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-slate-500">入社日</span>
                        <p>{staff.entry_date}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">在留期限</span>
                        <p className={getDaysUntil(staff.residence_expiry) <= 90 ? 'text-amber-400 font-semibold' : ''}>
                          {staff.residence_expiry}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* スタッフ詳細 */}
          {activeTab === 'staffDetail' && selectedStaff && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-4">
                <button onClick={() => setActiveTab('staff')} className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
                  ← 戻る
                </button>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">{selectedStaff.name}</h2>
                  <p className="text-slate-400">{getFacilityName(selectedStaff.facility_id)}</p>
                </div>
                <button
                  onClick={() => setEditMode(!editMode)}
                  className={`px-4 py-2 rounded-lg border ${editMode ? 'border-teal-500 bg-teal-500/20 text-teal-400' : 'border-slate-600 text-slate-400'}`}
                >
                  {editMode ? '✓ 編集中' : '✏️ 編集'}
                </button>
              </div>

              {/* 基本情報 */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <div className="text-sm text-slate-500 mb-1">国籍</div>
                  <div className="text-lg font-semibold">{selectedStaff.nationality}</div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <div className="text-sm text-slate-500 mb-1">入社日</div>
                  <div className="text-lg font-semibold">{selectedStaff.entry_date}</div>
                </div>
                <div className={`rounded-xl p-4 border ${getDaysUntil(selectedStaff.residence_expiry) <= 90 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-800/50 border-slate-700/50'}`}>
                  <div className="text-sm text-slate-500 mb-1">在留期限</div>
                  <div className={`text-lg font-semibold ${getDaysUntil(selectedStaff.residence_expiry) <= 90 ? 'text-amber-400' : ''}`}>
                    {selectedStaff.residence_expiry}
                    <span className="text-sm font-normal ml-2">（残{getDaysUntil(selectedStaff.residence_expiry)}日）</span>
                  </div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <div className="text-sm text-slate-500 mb-1">ステータス</div>
                  <div className="text-lg font-semibold">
                    {selectedStaff.status === 'active' ? '在籍中' : selectedStaff.status === 'exiting' ? '退職手続き中' : 'アーカイブ'}
                  </div>
                </div>
              </div>

              {/* 面談記録 */}
              <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700/50">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold">📝 面談記録</h3>
                  <button onClick={() => setShowAddInterview(true)} className="px-4 py-2 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
                    + 面談記録を追加
                  </button>
                </div>
                <div className="space-y-3">
                  {interviews.map(interview => (
                    <div key={interview.id} className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold">{interview.interview_date}</span>
                        <span className="text-sm text-slate-500">記録者: {interview.interviewer_id ? '担当者' : '不明'}</span>
                      </div>
                      <p className="text-slate-300">{interview.content}</p>
                      {interview.next_actions && (
                        <p className="mt-2 text-sm text-teal-400">次のアクション: {interview.next_actions}</p>
                      )}
                    </div>
                  ))}
                  {interviews.length === 0 && (
                    <p className="text-slate-500 text-center py-4">面談記録はありません</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 操作履歴 */}
          {activeTab === 'logs' && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-xl font-bold">📜 操作履歴</h2>
              <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-800/50">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm text-slate-400">日時</th>
                      <th className="text-left px-4 py-3 text-sm text-slate-400">操作者</th>
                      <th className="text-left px-4 py-3 text-sm text-slate-400">操作</th>
                      <th className="text-left px-4 py-3 text-sm text-slate-400">対象</th>
                      <th className="text-left px-4 py-3 text-sm text-slate-400">詳細</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityLogs.map(log => (
                      <tr key={log.id} className="border-t border-slate-700/50">
                        <td className="px-4 py-3 text-sm">{new Date(log.created_at).toLocaleString('ja-JP')}</td>
                        <td className="px-4 py-3 text-sm">{log.user_name || '不明'}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs ${
                            log.action_type === 'create' ? 'bg-green-500/20 text-green-400' :
                            log.action_type === 'update' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {log.action_type === 'create' ? '作成' : log.action_type === 'update' ? '更新' : '削除'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{log.target_name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-400">{log.description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {activityLogs.length === 0 && (
                  <p className="text-slate-500 text-center py-8">操作履歴はありません</p>
                )}
              </div>
            </div>
          )}

          {/* フィードバック */}
          {activeTab === 'feedback' && (
            <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
              <h2 className="text-xl font-bold">💬 フィードバック</h2>
              <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700/50">
                <p className="text-slate-400 mb-4">
                  アプリの使い方でわからないこと、改善してほしい機能などがあればお知らせください。
                  <br />
                  ※アップデートの反映にはお時間をいただく場合があります。
                </p>
                <textarea
                  value={feedbackContent}
                  onChange={(e) => setFeedbackContent(e.target.value)}
                  placeholder="フィードバックを入力してください..."
                  className="w-full h-32 px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-teal-500 focus:outline-none resize-none"
                />
                <div className="flex justify-end mt-4">
                  <button
                    onClick={handleSendFeedback}
                    className="px-6 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold"
                  >
                    送信
                  </button>
                </div>
                {feedbackSent && (
                  <p className="text-center text-teal-400 mt-4">✓ フィードバックを送信しました</p>
                )}
              </div>
            </div>
          )}
        </main>

        {/* スタッフ追加モーダル */}
        {showAddStaff && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700">
              <h3 className="text-xl font-bold mb-4">スタッフ追加</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">氏名 *</label>
                  <input
                    type="text"
                    value={newStaff.name}
                    onChange={(e) => setNewStaff(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">国籍</label>
                  <select
                    value={newStaff.nationality}
                    onChange={(e) => setNewStaff(prev => ({ ...prev, nationality: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-teal-500 focus:outline-none"
                  >
                    <option>ネパール</option>
                    <option>ベトナム</option>
                    <option>フィリピン</option>
                    <option>インドネシア</option>
                    <option>ミャンマー</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">入社日 *</label>
                  <input
                    type="date"
                    value={newStaff.entry_date}
                    onChange={(e) => setNewStaff(prev => ({ ...prev, entry_date: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">配属事業所</label>
                  <select
                    value={newStaff.facility_id}
                    onChange={(e) => setNewStaff(prev => ({ ...prev, facility_id: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-teal-500 focus:outline-none"
                  >
                    <option value="">選択してください</option>
                    {facilities.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowAddStaff(false)} className="flex-1 px-4 py-2 rounded-lg border border-slate-600 text-slate-400">
                  キャンセル
                </button>
                <button onClick={handleAddStaff} className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold">
                  追加
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 面談記録追加モーダル */}
        {showAddInterview && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700">
              <h3 className="text-xl font-bold mb-4">面談記録を追加</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">面談日 *</label>
                  <input
                    type="date"
                    value={newInterview.date}
                    onChange={(e) => setNewInterview(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">面談内容 *</label>
                  <textarea
                    value={newInterview.content}
                    onChange={(e) => setNewInterview(prev => ({ ...prev, content: e.target.value }))}
                    className="w-full h-24 px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-teal-500 focus:outline-none resize-none"
                    placeholder="面談の内容を記録..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">次のアクション</label>
                  <input
                    type="text"
                    value={newInterview.next_actions}
                    onChange={(e) => setNewInterview(prev => ({ ...prev, next_actions: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-teal-500 focus:outline-none"
                    placeholder="次回までにやること..."
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowAddInterview(false)} className="flex-1 px-4 py-2 rounded-lg border border-slate-600 text-slate-400">
                  キャンセル
                </button>
                <button onClick={handleAddInterview} className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold">
                  追加
                </button>
              </div>
            </div>
          </div>
        )}

        <footer className="border-t border-slate-800 mt-12 py-6">
          <div className="max-w-7xl mx-auto px-4 text-center text-sm text-slate-500">
            <p>特定技能外国人 受入れ管理システム v1.0</p>
          </div>
        </footer>
      </div>
    </>
  )
}
