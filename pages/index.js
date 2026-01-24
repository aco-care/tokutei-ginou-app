import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Head from 'next/head'

// 国籍リスト（フェーズ2: 国籍マスタ管理）
const defaultNationalities = [
  'ネパール', 'ベトナム', 'フィリピン', 'インドネシア', 'ミャンマー',
  'カンボジア', 'タイ', '中国', 'モンゴル', 'スリランカ', 'バングラデシュ'
]

// 資格リスト（フェーズ2: 資格取得状況管理）
const qualificationTypes = [
  { id: 'shoninsya', name: '初任者研修', required_for_visit: true },
  { id: 'jitsumukensyu', name: '実務者研修', required_for_visit: false },
  { id: 'kaigofukushishi', name: '介護福祉士', required_for_visit: false },
]

// チェックリスト定義（フェーズ5: 一度きり項目のロック対応）
const checklistDefinitions = {
  preparation: {
    title: '受入れ準備', icon: '📋',
    lockOnComplete: true, // 一度きり項目：完了後ロック
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
    lockOnComplete: true, // 一度きり項目：完了後ロック
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
    title: '在籍中（定期）', icon: '📅',
    lockOnComplete: false, // 定期的な項目：ロックしない
    items: [
      { id: 'o1', text: '定期面談を実施した（3ヶ月に1回）' },
      { id: 'o2', text: '定期届出を行った（年1回：4〜5月）' },
      { id: 'o3', text: '協議会証明書の期限を確認した' },
      { id: 'o4', text: '在留カードの期限を確認した' },
    ]
  },
  renewal: {
    title: '在留期間更新', icon: '🔄',
    lockOnComplete: false, // 複数回実施可能
    items: [
      { id: 'r1', text: '在留期限を確認した' },
      { id: 'r2', text: '協議会証明書の期限を確認した' },
      { id: 'r3', text: '必要書類を準備した' },
      { id: 'r4', text: '入管へ申請した' },
      { id: 'r5', text: '新しい在留カードを受領した' },
    ]
  },
  visitCare: {
    title: '訪問系サービス従事', icon: '🏠',
    lockOnComplete: true, // 一度きり項目
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
    lockOnComplete: true, // 一度きり項目
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
  
  // 1-2: ログアウトメッセージ表示用
  const [showLogoutMessage, setShowLogoutMessage] = useState(false)
  
  // 1-3: パスワードプレビュー用
  const [showPassword, setShowPassword] = useState(false)
  
  const [staffList, setStaffList] = useState([])
  const [facilities, setFacilities] = useState([])
  const [selectedStaffId, setSelectedStaffId] = useState(null)
  const [showAddStaff, setShowAddStaff] = useState(false)
  const [showArchive, setShowArchive] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [pendingChanges, setPendingChanges] = useState({})
  
  const [interviews, setInterviews] = useState([])
  const [showAddInterview, setShowAddInterview] = useState(false)
  const [newInterview, setNewInterview] = useState({
    date: '',
    content: '',
    next_actions: '',
    interview_type: 'regular', // フェーズ6: 面談種類
    supervisor_interview: false // 監督者面談も同時記録
  })
  
  // チェックリスト関連
  const [staffChecklists, setStaffChecklists] = useState({})
  const [expandedPhase, setExpandedPhase] = useState(null)
  const [checklistEditMode, setChecklistEditMode] = useState(false)
  const [pendingChecklistChanges, setPendingChecklistChanges] = useState({})
  // フェーズ5: 個別フェーズ編集モード
  const [editingPhase, setEditingPhase] = useState(null)
  
  const [activityLogs, setActivityLogs] = useState([])
  const [feedbackContent, setFeedbackContent] = useState('')
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [feedbackList, setFeedbackList] = useState([]) // 責任者用: 届いたフィードバック一覧

  // スタッフメモ
  const [staffMemo, setStaffMemo] = useState('')
  const [memoEditMode, setMemoEditMode] = useState(false)

  // フェーズ2: スタッフ編集モード
  const [showEditStaff, setShowEditStaff] = useState(false)
  const [editingStaff, setEditingStaff] = useState(null)

  // フェーズ2: 事業所管理
  const [showFacilityManager, setShowFacilityManager] = useState(false)
  const [newFacilityName, setNewFacilityName] = useState('')
  const [newFacilityAddress, setNewFacilityAddress] = useState('')

  // フェーズ2: 国籍管理
  const [nationalities, setNationalities] = useState(defaultNationalities)
  const [showNationalityManager, setShowNationalityManager] = useState(false)
  const [newNationality, setNewNationality] = useState('')

  // フェーズ2: 在留期限更新履歴
  const [residenceHistory, setResidenceHistory] = useState([])
  const [showResidenceUpdate, setShowResidenceUpdate] = useState(false)
  const [newResidenceExpiry, setNewResidenceExpiry] = useState('')

  // フェーズ2: 資格取得状況
  const [staffQualifications, setStaffQualifications] = useState({})
  const [showQualificationDatePicker, setShowQualificationDatePicker] = useState(null) // 資格ID
  const [qualificationDate, setQualificationDate] = useState('')

  // フェーズ4: メンバー管理
  const [showMemberManager, setShowMemberManager] = useState(false)
  const [members, setMembers] = useState([])
  const [showInviteMember, setShowInviteMember] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('staff')

  // フェーズ7: ヘルプ・チャット相談
  const [helpStep, setHelpStep] = useState('main') // main, procedure, manual
  const [selectedProcedure, setSelectedProcedure] = useState(null)
  const [selectedProcedureStaff, setSelectedProcedureStaff] = useState(null)

  // フェーズ7: 連絡先管理
  const [contacts, setContacts] = useState([
    { id: 1, name: '行政書士 山田事務所', role: '行政書士', phone: '03-1234-5678', email: 'yamada@example.com', note: '在留資格関連' },
    { id: 2, name: '社会保険労務士 佐藤事務所', role: '社労士', phone: '03-2345-6789', email: 'sato@example.com', note: '労務・社保関連' },
  ])
  const [showContactManager, setShowContactManager] = useState(false)
  const [newContact, setNewContact] = useState({ name: '', role: '', phone: '', email: '', note: '' })

  const [newStaff, setNewStaff] = useState({
    name: '', name_kana: '', nationality: 'ネパール',
    entry_date: '', facility_id: '', facility_ids: []
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
        setShowLogoutMessage(false) // ログイン時にメッセージをリセット
        loadData()
      } else {
        setLoginError('ユーザー情報が見つかりません')
      }
    } catch (error) {
      setLoginError('ログインに失敗しました: ' + error.message)
    }
  }

  // 1-2: ログアウト表示改善
  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsLoggedIn(false)
    setCurrentUser(null)
    setLoginEmail('')
    setLoginPassword('')
    setShowLogoutMessage(true)
    // 3秒後にメッセージを非表示
    setTimeout(() => setShowLogoutMessage(false), 3000)
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

    // フェーズ4: メンバー一覧
    const { data: memberData } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    if (memberData) setMembers(memberData)
  }

  // スタッフ選択時に面談記録とチェックリストを読み込み
  useEffect(() => {
    if (selectedStaffId) {
      loadStaffDetails(selectedStaffId)
    }
  }, [selectedStaffId])

  const loadStaffDetails = async (staffId) => {
    // 面談記録
    const { data: interviewData } = await supabase
      .from('interviews')
      .select('*')
      .eq('staff_id', staffId)
      .order('interview_date', { ascending: false })
    if (interviewData) setInterviews(interviewData)

    // チェックリスト状態
    const { data: checklistData } = await supabase
      .from('staff_checklists')
      .select('*')
      .eq('staff_id', staffId)
    
    if (checklistData) {
      const checklistMap = {}
      checklistData.forEach(item => {
        checklistMap[item.item_id] = {
          completed: item.completed,
          completed_at: item.completed_at,
          completed_by: item.completed_by
        }
      })
      setStaffChecklists(checklistMap)
    } else {
      setStaffChecklists({})
    }

    // スタッフメモ
    const staff = staffList.find(s => s.id === staffId)
    setStaffMemo(staff?.memo || '')

    // フェーズ2: 在留期限更新履歴
    const { data: historyData } = await supabase
      .from('residence_history')
      .select('*')
      .eq('staff_id', staffId)
      .order('created_at', { ascending: false })
    if (historyData) setResidenceHistory(historyData)

    // フェーズ2: 資格取得状況
    const { data: qualData } = await supabase
      .from('staff_qualifications')
      .select('*')
      .eq('staff_id', staffId)
    if (qualData) {
      const qualMap = {}
      qualData.forEach(q => {
        qualMap[q.qualification_id] = {
          acquired: q.acquired,
          acquired_date: q.acquired_date
        }
      })
      setStaffQualifications(qualMap)
    } else {
      setStaffQualifications({})
    }
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
    // ログを再読み込み
    const { data: logData } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (logData) setActivityLogs(logData)
  }

  // スタッフ追加
  const handleAddStaff = async () => {
    if (!newStaff.name || !newStaff.entry_date) {
      alert('氏名と入社日は必須です')
      return
    }

    const entryDate = new Date(newStaff.entry_date)
    const residenceExpiry = new Date(entryDate)
    residenceExpiry.setFullYear(residenceExpiry.getFullYear() + 1)

    const staffData = {
      name: newStaff.name,
      name_kana: newStaff.name_kana,
      nationality: newStaff.nationality,
      entry_date: newStaff.entry_date,
      facility_id: newStaff.facility_id,
      facility_ids: newStaff.facility_ids || [],
      residence_expiry: residenceExpiry.toISOString().split('T')[0],
      status: 'active',
      current_phase: 'preparation'
    }

    const { data, error } = await supabase.from('foreign_staff').insert(staffData).select()

    if (error) {
      alert('エラー: ' + error.message)
      return
    }

    if (data) {
      await logActivity('create', 'foreign_staff', data[0].id, newStaff.name, null, staffData, `${newStaff.name}さんを追加`)
      loadData()
      setShowAddStaff(false)
      setNewStaff({ name: '', name_kana: '', nationality: 'ネパール', entry_date: '', facility_id: '', facility_ids: [] })
    }
  }

  // フェーズ2: スタッフ編集
  const handleEditStaff = async () => {
    if (!editingStaff?.name || !editingStaff?.entry_date) {
      alert('氏名と入社日は必須です')
      return
    }

    const oldStaff = staffList.find(s => s.id === editingStaff.id)

    const { error } = await supabase
      .from('foreign_staff')
      .update({
        name: editingStaff.name,
        name_kana: editingStaff.name_kana,
        nationality: editingStaff.nationality,
        entry_date: editingStaff.entry_date,
        facility_id: editingStaff.facility_id,
        facility_ids: editingStaff.facility_ids || [],
        visit_care_ready: editingStaff.visit_care_ready
      })
      .eq('id', editingStaff.id)

    if (error) {
      alert('エラー: ' + error.message)
      return
    }

    await logActivity('update', 'foreign_staff', editingStaff.id, editingStaff.name, oldStaff, editingStaff, `${editingStaff.name}さんの情報を更新`)
    loadData()
    setShowEditStaff(false)
    setEditingStaff(null)
  }

  // フェーズ2: 事業所追加
  const handleAddFacility = async () => {
    if (!newFacilityName.trim()) {
      alert('事業所名を入力してください')
      return
    }

    const { data, error } = await supabase.from('facilities').insert({
      name: newFacilityName,
      address: newFacilityAddress
    }).select()

    if (error) {
      alert('エラー: ' + error.message)
      return
    }

    if (data) {
      await logActivity('create', 'facilities', data[0].id, newFacilityName, null, { name: newFacilityName }, `事業所「${newFacilityName}」を追加`)
      loadData()
      setNewFacilityName('')
      setNewFacilityAddress('')
    }
  }

  // フェーズ2: 国籍追加
  const handleAddNationality = () => {
    if (!newNationality.trim()) return
    if (nationalities.includes(newNationality)) {
      alert('この国籍は既に登録されています')
      return
    }
    setNationalities([...nationalities, newNationality])
    setNewNationality('')
  }

  // フェーズ2: 在留期限更新
  const handleUpdateResidenceExpiry = async () => {
    if (!newResidenceExpiry) {
      alert('新しい在留期限を入力してください')
      return
    }

    const staff = staffList.find(s => s.id === selectedStaffId)
    const oldExpiry = staff?.residence_expiry

    // 履歴に保存
    await supabase.from('residence_history').insert({
      staff_id: selectedStaffId,
      old_expiry: oldExpiry,
      new_expiry: newResidenceExpiry,
      updated_by: currentUser?.id,
      updated_by_name: currentUser?.name
    })

    // スタッフ情報を更新
    await supabase
      .from('foreign_staff')
      .update({ residence_expiry: newResidenceExpiry })
      .eq('id', selectedStaffId)

    await logActivity('update', 'foreign_staff', selectedStaffId, staff?.name, { residence_expiry: oldExpiry }, { residence_expiry: newResidenceExpiry }, `${staff?.name}さんの在留期限を更新`)

    loadData()
    loadStaffDetails(selectedStaffId)
    setShowResidenceUpdate(false)
    setNewResidenceExpiry('')
  }

  // フェーズ2: 資格取得状況の更新
  const handleQualificationToggle = async (qualId, acquired, acquiredDate = null) => {
    const staff = staffList.find(s => s.id === selectedStaffId)

    const existing = staffQualifications[qualId]

    if (existing) {
      await supabase
        .from('staff_qualifications')
        .update({
          acquired,
          acquired_date: acquired ? (acquiredDate || new Date().toISOString().split('T')[0]) : null
        })
        .eq('staff_id', selectedStaffId)
        .eq('qualification_id', qualId)
    } else {
      await supabase.from('staff_qualifications').insert({
        staff_id: selectedStaffId,
        qualification_id: qualId,
        acquired,
        acquired_date: acquired ? (acquiredDate || new Date().toISOString().split('T')[0]) : null
      })
    }

    // 初任者研修を取得した場合、訪問系対応可を確認
    if (qualId === 'shoninsya' && acquired) {
      const staff = staffList.find(s => s.id === selectedStaffId)
      const entryDate = new Date(staff?.entry_date)
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

      if (entryDate <= oneYearAgo) {
        await supabase
          .from('foreign_staff')
          .update({ visit_care_ready: true })
          .eq('id', selectedStaffId)
        loadData()
      }
    }

    await logActivity('update', 'staff_qualifications', selectedStaffId, staff?.name, null, { qualification: qualId, acquired }, `${staff?.name}さんの資格情報を更新`)

    loadStaffDetails(selectedStaffId)
  }

  // フェーズ4: メンバー招待
  const [inviteSending, setInviteSending] = useState(false)

  const handleInviteMember = async () => {
    if (!inviteEmail || !inviteName) {
      alert('メールアドレスと名前は必須です')
      return
    }

    setInviteSending(true)

    try {
      // ユーザーテーブルに仮登録
      const { data, error } = await supabase.from('users').insert({
        email: inviteEmail,
        name: inviteName,
        role: inviteRole,
        status: 'pending' // 招待中
      }).select()

      if (error) {
        alert('エラー: ' + error.message)
        setInviteSending(false)
        return
      }

      await logActivity('create', 'users', data[0].id, inviteName, null, { email: inviteEmail, role: inviteRole }, `${inviteName}さんを招待`)

      // 招待URLをクリップボードにコピー
      const inviteUrl = `${window.location.origin}?invite=${data[0].id}`
      await navigator.clipboard.writeText(inviteUrl)
      alert(`${inviteName}さんを追加しました。\n\n招待URLをクリップボードにコピーしました。\nLINEやメールで相手に送ってください。`)
      loadData()
      setShowInviteMember(false)
      setInviteEmail('')
      setInviteName('')
      setInviteRole('staff')
    } catch (err) {
      console.error('Invite error:', err)
      alert('招待処理中にエラーが発生しました')
    } finally {
      setInviteSending(false)
    }
  }

  // フェーズ4: メンバーの権限変更
  const handleChangeRole = async (memberId, newRole) => {
    const member = members.find(m => m.id === memberId)
    if (!member) return

    await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', memberId)

    await logActivity('update', 'users', memberId, member.name, { role: member.role }, { role: newRole }, `${member.name}さんの権限を${newRole}に変更`)
    loadData()
  }

  // フェーズ4: アカウント無効化/有効化
  const handleToggleAccountStatus = async (memberId) => {
    const member = members.find(m => m.id === memberId)
    if (!member) return

    const newStatus = member.status === 'active' ? 'disabled' : 'active'

    await supabase
      .from('users')
      .update({ status: newStatus })
      .eq('id', memberId)

    await logActivity('update', 'users', memberId, member.name, { status: member.status }, { status: newStatus }, `${member.name}さんのアカウントを${newStatus === 'active' ? '有効化' : '無効化'}`)
    loadData()
  }

  // フェーズ4: 招待中メンバー削除
  const handleDeletePendingMember = async (memberId) => {
    const member = members.find(m => m.id === memberId)
    if (!member) return

    if (!confirm(`${member.name}さんの招待を取り消しますか？`)) return

    await supabase.from('users').delete().eq('id', memberId)
    await logActivity('delete', 'users', memberId, member.name, null, null, `${member.name}さんの招待を取り消し`)
    loadData()
  }

  // フェーズ4: 招待URLをコピー
  const handleResendInvite = async (member) => {
    try {
      const inviteUrl = `${window.location.origin}?invite=${member.id}`
      await navigator.clipboard.writeText(inviteUrl)
      alert(`${member.name}さんの招待URLをコピーしました。\n\nLINEやメールで相手に送ってください。`)
    } catch (err) {
      alert('コピーに失敗しました')
    }
  }

  // 面談記録追加
  const handleAddInterview = async () => {
    if (!newInterview.date || !newInterview.content) {
      alert('面談日と内容は必須です')
      return
    }

    const interviewData = {
      staff_id: selectedStaffId,
      interview_date: newInterview.date,
      content: newInterview.content,
      next_actions: newInterview.next_actions,
      interview_type: newInterview.interview_type,
      supervisor_interview: newInterview.supervisor_interview,
      interviewer_id: currentUser?.id,
      created_by: currentUser?.id
    }

    const { error } = await supabase.from('interviews').insert(interviewData)

    if (!error) {
      const staff = staffList.find(s => s.id === selectedStaffId)
      const typeLabel = {
        regular: '定期面談',
        renewal: '更新時面談',
        exit: '退職時面談',
        other: '面談'
      }[newInterview.interview_type]
      await logActivity('create', 'interviews', selectedStaffId, staff?.name, null, interviewData, `${staff?.name}さんの${typeLabel}記録を追加`)
      loadStaffDetails(selectedStaffId)
      setShowAddInterview(false)
      setNewInterview({ date: '', content: '', next_actions: '', interview_type: 'regular', supervisor_interview: false })
    }
  }

  // チェックリスト項目の一時的な変更（編集モード中）
  const handleChecklistItemToggle = (itemId) => {
    if (!editingPhase) return

    setPendingChecklistChanges(prev => ({
      ...prev,
      [itemId]: prev[itemId] !== undefined ? !prev[itemId] : !staffChecklists[itemId]?.completed
    }))
  }

  // チェックリストの保存
  const handleSaveChecklist = async () => {
    const staff = staffList.find(s => s.id === selectedStaffId)
    
    for (const [itemId, completed] of Object.entries(pendingChecklistChanges)) {
      const existingItem = staffChecklists[itemId]
      
      if (existingItem) {
        // 更新
        await supabase
          .from('staff_checklists')
          .update({
            completed,
            completed_at: completed ? new Date().toISOString() : null,
            completed_by: completed ? currentUser?.id : null
          })
          .eq('staff_id', selectedStaffId)
          .eq('item_id', itemId)
      } else {
        // 新規作成
        await supabase
          .from('staff_checklists')
          .insert({
            staff_id: selectedStaffId,
            item_id: itemId,
            completed,
            completed_at: completed ? new Date().toISOString() : null,
            completed_by: completed ? currentUser?.id : null
          })
      }
    }
    
    await logActivity('update', 'staff_checklists', selectedStaffId, staff?.name, null, pendingChecklistChanges, `${staff?.name}さんのチェックリストを更新`)
    
    setPendingChecklistChanges({})
    setChecklistEditMode(false)
    loadStaffDetails(selectedStaffId)
  }

  // チェックリストの編集キャンセル
  const handleCancelChecklist = () => {
    setPendingChecklistChanges({})
    setChecklistEditMode(false)
  }

  // メモの保存
  const handleSaveMemo = async () => {
    const staff = staffList.find(s => s.id === selectedStaffId)
    
    await supabase
      .from('foreign_staff')
      .update({ memo: staffMemo })
      .eq('id', selectedStaffId)
    
    await logActivity('update', 'foreign_staff', selectedStaffId, staff?.name, { memo: staff?.memo }, { memo: staffMemo }, `${staff?.name}さんのメモを更新`)
    
    setMemoEditMode(false)
    loadData()
  }

  // アーカイブ（退職完了）
  const handleArchiveStaff = async () => {
    const staff = staffList.find(s => s.id === selectedStaffId)
    if (!confirm(`${staff?.name}さんをアーカイブしますか？`)) return
    
    await supabase
      .from('foreign_staff')
      .update({ status: 'archived' })
      .eq('id', selectedStaffId)
    
    await logActivity('update', 'foreign_staff', selectedStaffId, staff?.name, { status: staff?.status }, { status: 'archived' }, `${staff?.name}さんをアーカイブ`)
    
    loadData()
    setActiveTab('staff')
    setSelectedStaffId(null)
  }

  // アーカイブから復元
  const handleRestoreStaff = async (staffId) => {
    const staff = staffList.find(s => s.id === staffId)
    if (!confirm(`${staff?.name}さんを復元しますか？`)) return
    
    await supabase
      .from('foreign_staff')
      .update({ status: 'active' })
      .eq('id', staffId)
    
    await logActivity('update', 'foreign_staff', staffId, staff?.name, { status: 'archived' }, { status: 'active' }, `${staff?.name}さんを復元`)
    
    loadData()
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

  // 責任者用: フィードバック一覧を取得
  const loadFeedbackList = async () => {
    const { data } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setFeedbackList(data)
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

  // フェーズ3: 次回面談日の計算（入社日から3ヶ月ごと）
  const getNextInterviewDate = (staff) => {
    if (!staff.entry_date) return null
    const entryDate = new Date(staff.entry_date)
    const now = new Date()
    let nextInterview = new Date(entryDate)

    // 入社日から3ヶ月ごとの面談日を計算
    while (nextInterview <= now) {
      nextInterview.setMonth(nextInterview.getMonth() + 3)
    }

    // 次の面談日が30日以内なら表示
    const daysUntilInterview = Math.ceil((nextInterview - now) / (1000 * 60 * 60 * 24))
    if (daysUntilInterview <= 30) {
      return `${nextInterview.getMonth() + 1}月${nextInterview.getDate()}日`
    }
    return null
  }

  // フェーズ3: 定期届出リマインド（4〜5月）
  const isAnnualReportPeriod = () => {
    const now = new Date()
    const month = now.getMonth() + 1
    return month === 4 || month === 5
  }

  // チェックリストの進捗計算
  const getPhaseProgress = (phaseKey) => {
    const phase = checklistDefinitions[phaseKey]
    if (!phase) return { completed: 0, total: 0, percentage: 0 }
    
    const total = phase.items.length
    const completed = phase.items.filter(item => {
      const pending = pendingChecklistChanges[item.id]
      if (pending !== undefined) return pending
      return staffChecklists[item.id]?.completed
    }).length
    
    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    }
  }

  const isItemChecked = (itemId) => {
    const pending = pendingChecklistChanges[itemId]
    if (pending !== undefined) return pending
    return staffChecklists[itemId]?.completed || false
  }

  const activeStaff = staffList.filter(s => s.status !== 'archived')
  const archivedStaff = staffList.filter(s => s.status === 'archived')
  const selectedStaff = staffList.find(s => s.id === selectedStaffId)

  // 1-4: ホームボタン - ダッシュボードに戻る関数
  const goToDashboard = () => {
    setActiveTab('dashboard')
    setSelectedStaffId(null)
  }

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
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
          <meta name="theme-color" content="#0f172a" />
          <link rel="manifest" href="/manifest.json" />
          <link rel="apple-touch-icon" href="/icon-192.png" />
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
          {/* 1-2: ログアウトメッセージ */}
          {showLogoutMessage && (
            <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fadeIn">
              <div className="bg-teal-500/20 border border-teal-500/50 text-teal-400 px-6 py-3 rounded-xl backdrop-blur-sm flex items-center gap-2">
                <span className="text-lg">✓</span>
                <span>ログアウトしました</span>
              </div>
            </div>
          )}
          
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 sm:p-8 w-full max-w-md">
            <div className="text-center mb-6 sm:mb-8">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-2xl sm:text-3xl mx-auto mb-4">🏥</div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">特定技能 受入れ管理</h1>
              <p className="text-slate-400 mt-2 text-sm sm:text-base">介護分野</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">メールアドレス</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white text-base focus:border-teal-500 focus:outline-none"
                  placeholder="your@email.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">パスワード</label>
                {/* 1-3: パスワードプレビュー */}
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 rounded-lg bg-slate-900 border border-slate-700 text-white text-base focus:border-teal-500 focus:outline-none"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors"
                    aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              
              {loginError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {loginError}
                </div>
              )}
              
              <button
                type="submit"
                className="w-full py-3 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold hover:shadow-lg hover:shadow-teal-500/30 transition-all active:scale-[0.98]"
              >
                ログイン
              </button>
            </form>
            
            <p className="text-center text-slate-500 text-xs sm:text-sm mt-6">
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
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#0f172a" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
        {/* ヘッダー - 1-1: スマホ対応改善 */}
        <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
            <div className="flex items-center justify-between gap-2">
              {/* 1-4: ホームボタン（ロゴクリックでダッシュボードへ） */}
              <button 
                onClick={goToDashboard}
                className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity flex-shrink-0"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-lg sm:text-xl">🏥</div>
                <div className="hidden sm:block">
                  <h1 className="text-base sm:text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">特定技能 受入れ管理</h1>
                  <p className="text-xs text-slate-500">介護分野</p>
                </div>
              </button>
              
              <div className="flex items-center gap-1 sm:gap-4 flex-1 justify-end">
                {/* 1-1: スマホ対応 - ナビゲーション改善 */}
                <nav className="flex gap-0.5 sm:gap-1 overflow-x-auto scrollbar-hide">
                  {[
                    { id: 'dashboard', icon: '📊', label: 'ホーム' },
                    { id: 'staff', icon: '👥', label: 'スタッフ' },
                    { id: 'help', icon: '❓', label: 'ヘルプ' },
                    { id: 'settings', icon: '⚙️', label: '設定', ownerOnly: true },
                    { id: 'logs', icon: '📜', label: '履歴' },
                    { id: 'feedback', icon: '💬', label: '意見' },
                  ].filter(tab => !tab.ownerOnly || currentUser?.role === 'owner').map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id)
                        setSelectedStaffId(null)
                        // 責任者がフィードバックタブを開いたら一覧を取得
                        if (tab.id === 'feedback' && currentUser?.role === 'owner') {
                          loadFeedbackList()
                        }
                      }}
                      className={`flex items-center gap-1 px-2 sm:px-3 py-2 rounded-lg transition-all whitespace-nowrap min-w-0 ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-base sm:text-lg">{tab.icon}</span>
                      <span className="text-xs sm:text-sm hidden xs:inline">{tab.label}</span>
                    </button>
                  ))}
                </nav>
                
                <div className="flex items-center gap-1 sm:gap-3 pl-1 sm:pl-4 border-l border-slate-700 flex-shrink-0">
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-medium text-slate-200">{currentUser?.name}</p>
                    <p className="text-xs text-slate-500">{currentUser?.role === 'owner' ? '責任者' : currentUser?.role === 'admin' ? '担当者' : '確認者'}</p>
                  </div>
                  <button 
                    onClick={handleLogout} 
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                    aria-label="ログアウト"
                  >
                    🚪
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          {/* ダッシュボード */}
          {activeTab === 'dashboard' && (
            <div className="space-y-4 sm:space-y-6 animate-fadeIn">
              {/* 1-1: スマホ対応 - グリッド改善 */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                <div className="bg-gradient-to-br from-teal-500/20 to-teal-600/10 border border-teal-500/30 rounded-xl sm:rounded-2xl p-3 sm:p-5">
                  <div className="text-2xl sm:text-3xl font-bold text-teal-400">{activeStaff.length}</div>
                  <div className="text-xs sm:text-sm text-slate-400 mt-1">在籍人数</div>
                </div>
                <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-xl sm:rounded-2xl p-3 sm:p-5">
                  <div className="text-2xl sm:text-3xl font-bold text-amber-400">
                    {activeStaff.filter(s => getDaysUntil(s.residence_expiry) <= 90 && getDaysUntil(s.residence_expiry) > 0).length}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-400 mt-1">更新期限90日以内</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-xl sm:rounded-2xl p-3 sm:p-5">
                  <div className="text-2xl sm:text-3xl font-bold text-purple-400">{activeStaff.filter(s => s.visit_care_ready).length}</div>
                  <div className="text-xs sm:text-sm text-slate-400 mt-1">訪問系対応可</div>
                </div>
                <div className="bg-gradient-to-br from-rose-500/20 to-rose-600/10 border border-rose-500/30 rounded-xl sm:rounded-2xl p-3 sm:p-5">
                  <div className="text-2xl sm:text-3xl font-bold text-rose-400">{activeStaff.filter(s => s.status === 'exiting').length}</div>
                  <div className="text-xs sm:text-sm text-slate-400 mt-1">退職手続き中</div>
                </div>
              </div>

              {/* フェーズ3: 定期届出リマインド */}
              {isAnnualReportPeriod() && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                  <h2 className="text-base sm:text-lg font-bold mb-2 text-blue-400">📋 定期届出の時期です</h2>
                  <p className="text-sm text-slate-400">
                    毎年4〜5月は「受入れ・活動・支援実施状況届出書」（参考様式第3-6号）の提出期間です。
                    すべての在籍スタッフについて届出を行ってください。
                  </p>
                </div>
              )}

              <div className="bg-slate-800/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-700/50">
                <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4">⚠️ 対応が必要なスタッフ</h2>
                <div className="space-y-2 sm:space-y-3">
                  {activeStaff
                    .filter(s => getDaysUntil(s.residence_expiry) <= 90)
                    .sort((a, b) => getDaysUntil(a.residence_expiry) - getDaysUntil(b.residence_expiry))
                    .map(staff => {
                      const daysUntil = getDaysUntil(staff.residence_expiry)
                      return (
                        <div
                          key={staff.id}
                          onClick={() => { setSelectedStaffId(staff.id); setActiveTab('staffDetail') }}
                          className={`flex items-center justify-between p-3 sm:p-4 rounded-xl cursor-pointer transition-all active:scale-[0.99] ${
                            daysUntil <= 14 ? 'bg-red-500/20 border border-red-500/50 hover:bg-red-500/30' :
                            daysUntil <= 30 ? 'bg-red-500/10 border border-red-500/30 hover:bg-red-500/20' :
                            daysUntil <= 60 ? 'bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20' :
                            'bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/20'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-white text-sm sm:text-base truncate">{staff.name}</p>
                            <p className="text-xs sm:text-sm text-slate-400 truncate">{getFacilityName(staff.facility_id)}</p>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <p className={`font-semibold text-sm sm:text-base ${
                              daysUntil <= 14 ? 'text-red-400' :
                              daysUntil <= 30 ? 'text-red-400' :
                              daysUntil <= 60 ? 'text-amber-400' :
                              'text-yellow-400'
                            }`}>残{daysUntil}日</p>
                            <p className="text-xs text-slate-500">{staff.residence_expiry}</p>
                          </div>
                        </div>
                      )
                    })}
                  {activeStaff.filter(s => getDaysUntil(s.residence_expiry) <= 90).length === 0 && (
                    <p className="text-slate-500 text-center py-4 text-sm sm:text-base">現在、緊急の対応事項はありません</p>
                  )}
                </div>
              </div>

              {/* フェーズ3: 面談リマインダー */}
              {activeStaff.filter(s => getNextInterviewDate(s)).length > 0 && (
                <div className="bg-slate-800/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-700/50">
                  <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4">📅 定期面談のリマインド</h2>
                  <div className="space-y-2 sm:space-y-3">
                    {activeStaff
                      .filter(s => getNextInterviewDate(s))
                      .map(staff => (
                        <div
                          key={staff.id}
                          onClick={() => { setSelectedStaffId(staff.id); setActiveTab('staffDetail') }}
                          className="flex items-center justify-between p-3 sm:p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl cursor-pointer hover:bg-blue-500/20 transition-all"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-white text-sm sm:text-base truncate">{staff.name}</p>
                            <p className="text-xs sm:text-sm text-slate-400 truncate">{getFacilityName(staff.facility_id)}</p>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <p className="text-blue-400 font-semibold text-sm sm:text-base">{getNextInterviewDate(staff)}</p>
                            <p className="text-xs text-slate-500">までに面談</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* スタッフ一覧 */}
          {activeTab === 'staff' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h2 className="text-xl font-bold">スタッフ一覧</h2>
                <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => setShowArchive(!showArchive)}
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-xl border transition-all text-sm ${showArchive ? 'border-slate-500 bg-slate-800' : 'border-slate-700 text-slate-400'}`}
                  >
                    📦 アーカイブ ({archivedStaff.length})
                  </button>
                  <button onClick={() => setShowAddStaff(true)} className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold text-sm">
                    + スタッフ追加
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(showArchive ? archivedStaff : activeStaff).map(staff => {
                  const daysUntilExpiry = getDaysUntil(staff.residence_expiry)
                  const needsInterview = getNextInterviewDate(staff)

                  return (
                    <div
                      key={staff.id}
                      className={`bg-slate-800/50 border rounded-2xl p-4 sm:p-5 cursor-pointer hover:border-teal-500/50 transition-all ${
                        daysUntilExpiry <= 30 ? 'border-red-500/50' :
                        daysUntilExpiry <= 60 ? 'border-amber-500/50' :
                        daysUntilExpiry <= 90 ? 'border-yellow-500/50' :
                        'border-slate-700/50'
                      }`}
                    >
                      <div onClick={() => { setSelectedStaffId(staff.id); setActiveTab('staffDetail') }}>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-lg font-bold">{staff.name}</h3>
                            <p className="text-sm text-slate-400">
                              {getFacilityName(staff.facility_id)}
                              {staff.visit_care_ready && <span className="ml-2 text-xs text-purple-400">🏠訪問可</span>}
                            </p>
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
                            <p className={
                              daysUntilExpiry <= 14 ? 'text-red-400 font-bold' :
                              daysUntilExpiry <= 30 ? 'text-red-400 font-semibold' :
                              daysUntilExpiry <= 60 ? 'text-amber-400 font-semibold' :
                              daysUntilExpiry <= 90 ? 'text-yellow-400' : ''
                            }>
                              {staff.residence_expiry}
                            </p>
                          </div>
                        </div>
                        {/* フェーズ2/3: リマインダー表示 */}
                        {!showArchive && (daysUntilExpiry <= 90 || needsInterview) && (
                          <div className="mt-3 space-y-1">
                            {daysUntilExpiry <= 90 && (
                              <div className={`text-xs px-2 py-1 rounded ${
                                daysUntilExpiry <= 14 ? 'bg-red-500/20 text-red-400' :
                                daysUntilExpiry <= 30 ? 'bg-red-500/10 text-red-400' :
                                daysUntilExpiry <= 60 ? 'bg-amber-500/10 text-amber-400' :
                                'bg-yellow-500/10 text-yellow-400'
                              }`}>
                                ⚠️ 在留期限まで残り{daysUntilExpiry}日
                              </div>
                            )}
                            {needsInterview && (
                              <div className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-400">
                                📅 {needsInterview}までに定期面談
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {showArchive && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRestoreStaff(staff.id) }}
                          className="mt-3 w-full py-2 rounded-lg border border-teal-500/50 text-teal-400 text-sm hover:bg-teal-500/10"
                        >
                          ↩️ 復元する
                        </button>
                      )}
                    </div>
                  )
                })}
                {(showArchive ? archivedStaff : activeStaff).length === 0 && (
                  <p className="col-span-2 text-slate-500 text-center py-8">
                    {showArchive ? 'アーカイブされたスタッフはいません' : 'スタッフが登録されていません'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* スタッフ詳細 */}
          {activeTab === 'staffDetail' && selectedStaff && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                {/* 1-4: ホームボタン追加 */}
                <div className="flex gap-2 w-full sm:w-auto">
                  <button onClick={() => setActiveTab('staff')} className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
                    ← 戻る
                  </button>
                  <button onClick={goToDashboard} className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white sm:hidden">
                    🏠
                  </button>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl sm:text-2xl font-bold">{selectedStaff.name}</h2>
                  <p className="text-slate-400">
                    {getFacilityName(selectedStaff.facility_id)}
                    {selectedStaff.facility_ids?.length > 0 && (
                      <span className="text-xs ml-2">
                        (+{selectedStaff.facility_ids.filter(id => id !== selectedStaff.facility_id).length}事業所)
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  {/* フェーズ2: スタッフ編集ボタン */}
                  {selectedStaff.status !== 'archived' && (
                    <button
                      onClick={() => {
                        setEditingStaff({ ...selectedStaff })
                        setShowEditStaff(true)
                      }}
                      className="px-3 py-2 rounded-lg border border-teal-500/50 text-teal-400 text-sm hover:bg-teal-500/10"
                    >
                      ✏️ 編集
                    </button>
                  )}
                  {selectedStaff.status !== 'archived' && (
                    <button
                      onClick={handleArchiveStaff}
                      className="px-3 py-2 rounded-lg border border-rose-500/50 text-rose-400 text-sm hover:bg-rose-500/10"
                    >
                      📦 アーカイブ
                    </button>
                  )}
                </div>
              </div>

              {/* 基本情報 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-slate-800/50 rounded-xl p-3 sm:p-4 border border-slate-700/50">
                  <div className="text-xs sm:text-sm text-slate-500 mb-1">国籍</div>
                  <div className="text-base sm:text-lg font-semibold">{selectedStaff.nationality}</div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 sm:p-4 border border-slate-700/50">
                  <div className="text-xs sm:text-sm text-slate-500 mb-1">入社日</div>
                  <div className="text-base sm:text-lg font-semibold">{selectedStaff.entry_date}</div>
                </div>
                <div className={`rounded-xl p-3 sm:p-4 border ${getDaysUntil(selectedStaff.residence_expiry) <= 90 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-800/50 border-slate-700/50'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs sm:text-sm text-slate-500">在留期限</span>
                    {selectedStaff.status !== 'archived' && (
                      <button
                        onClick={() => setShowResidenceUpdate(true)}
                        className="text-xs text-teal-400 hover:text-teal-300"
                      >
                        更新
                      </button>
                    )}
                  </div>
                  <div className={`text-base sm:text-lg font-semibold ${getDaysUntil(selectedStaff.residence_expiry) <= 90 ? 'text-amber-400' : ''}`}>
                    {selectedStaff.residence_expiry}
                    <span className="text-xs sm:text-sm font-normal ml-1 sm:ml-2">（残{getDaysUntil(selectedStaff.residence_expiry)}日）</span>
                  </div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 sm:p-4 border border-slate-700/50">
                  <div className="text-xs sm:text-sm text-slate-500 mb-1">ステータス</div>
                  <div className="text-base sm:text-lg font-semibold">
                    {selectedStaff.status === 'active' ? '在籍中' : selectedStaff.status === 'exiting' ? '退職手続き中' : 'アーカイブ'}
                  </div>
                </div>
              </div>

              {/* メモ */}
              <div className="bg-slate-800/30 rounded-2xl p-4 sm:p-6 border border-slate-700/50">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold">📝 メモ</h3>
                  {!memoEditMode ? (
                    <button onClick={() => setMemoEditMode(true)} className="px-3 py-1 rounded-lg border border-slate-600 text-slate-400 text-sm">
                      編集
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => { setMemoEditMode(false); setStaffMemo(selectedStaff?.memo || '') }} className="px-3 py-1 rounded-lg border border-slate-600 text-slate-400 text-sm">
                        キャンセル
                      </button>
                      <button onClick={handleSaveMemo} className="px-3 py-1 rounded-lg bg-teal-500 text-white text-sm">
                        保存
                      </button>
                    </div>
                  )}
                </div>
                {memoEditMode ? (
                  <textarea
                    value={staffMemo}
                    onChange={(e) => setStaffMemo(e.target.value)}
                    className="w-full h-24 px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-teal-500 focus:outline-none resize-none"
                    placeholder="スタッフに関するメモを入力..."
                  />
                ) : (
                  <p className="text-slate-300 whitespace-pre-wrap">{staffMemo || 'メモはありません'}</p>
                )}
              </div>

              {/* フェーズ2: 資格取得状況 */}
              <div className="bg-slate-800/30 rounded-2xl p-4 sm:p-6 border border-slate-700/50">
                <h3 className="text-lg font-bold mb-4">🎓 資格取得状況</h3>
                <div className="space-y-3">
                  {qualificationTypes.map(qual => {
                    const status = staffQualifications[qual.id]
                    return (
                      <div key={qual.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              if (status?.acquired) {
                                // チェックを外す場合はそのまま
                                handleQualificationToggle(qual.id, false)
                              } else {
                                // チェックを入れる場合は日付入力ダイアログを表示
                                setQualificationDate(new Date().toISOString().split('T')[0])
                                setShowQualificationDatePicker(qual.id)
                              }
                            }}
                            className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                              status?.acquired
                                ? 'bg-teal-500 border-teal-500'
                                : 'border-slate-600 hover:border-slate-500'
                            }`}
                            disabled={selectedStaff.status === 'archived'}
                          >
                            {status?.acquired && <span className="text-white text-sm">✓</span>}
                          </button>
                          <div>
                            <span className={`font-medium ${status?.acquired ? 'text-white' : 'text-slate-400'}`}>
                              {qual.name}
                            </span>
                            {qual.required_for_visit && (
                              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                                訪問系必須
                              </span>
                            )}
                          </div>
                        </div>
                        {status?.acquired && status?.acquired_date && (
                          <button
                            onClick={() => {
                              if (selectedStaff.status !== 'archived') {
                                setQualificationDate(status.acquired_date)
                                setShowQualificationDatePicker(qual.id)
                              }
                            }}
                            className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                          >
                            {status.acquired_date} 取得
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
                {selectedStaff.visit_care_ready && (
                  <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                    <span className="text-purple-400 font-medium">🏠 訪問系サービス対応可</span>
                    <p className="text-sm text-slate-400 mt-1">初任者研修修了 + 実務経験1年以上</p>
                  </div>
                )}
              </div>

              {/* フェーズ2: 在留期限更新履歴 */}
              {residenceHistory.length > 0 && (
                <div className="bg-slate-800/30 rounded-2xl p-4 sm:p-6 border border-slate-700/50">
                  <h3 className="text-lg font-bold mb-4">📅 在留期限更新履歴</h3>
                  <div className="space-y-2">
                    {residenceHistory.map((history, index) => (
                      <div key={history.id || index} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-700/50 text-sm">
                        <div>
                          <span className="text-slate-400">{history.old_expiry}</span>
                          <span className="mx-2 text-slate-600">→</span>
                          <span className="text-teal-400 font-medium">{history.new_expiry}</span>
                        </div>
                        <div className="text-slate-500">
                          {history.updated_by_name} / {new Date(history.created_at).toLocaleDateString('ja-JP')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* チェックリスト */}
              <div className="bg-slate-800/30 rounded-2xl p-4 sm:p-6 border border-slate-700/50">
                <h3 className="text-lg font-bold mb-4">✅ チェックリスト</h3>

                <div className="space-y-3">
                  {Object.entries(checklistDefinitions).map(([phaseKey, phase]) => {
                    const progress = getPhaseProgress(phaseKey)
                    const isExpanded = expandedPhase === phaseKey
                    const isEditing = editingPhase === phaseKey
                    // フェーズ5: 一度きり項目で全完了の場合はロック
                    const isLocked = phase.lockOnComplete && progress.percentage === 100

                    return (
                      <div key={phaseKey} className={`border rounded-xl overflow-hidden ${
                        isLocked ? 'border-teal-500/30 bg-teal-500/5' : 'border-slate-700/50'
                      }`}>
                        <div className="w-full p-3 sm:p-4 flex items-center justify-between bg-slate-800/50">
                          <button
                            onClick={() => setExpandedPhase(isExpanded ? null : phaseKey)}
                            className="flex items-center gap-3 flex-1 text-left"
                          >
                            <span className="text-xl">{phase.icon}</span>
                            <span className="font-semibold">{phase.title}</span>
                            {isLocked && <span className="text-xs px-2 py-0.5 rounded bg-teal-500/20 text-teal-400">完了</span>}
                          </button>
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-16 sm:w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${isLocked ? 'bg-teal-500' : 'bg-gradient-to-r from-teal-500 to-emerald-500'}`}
                                style={{ width: `${progress.percentage}%` }}
                              />
                            </div>
                            <span className="text-xs sm:text-sm text-slate-400 w-10 text-right">{progress.completed}/{progress.total}</span>
                            {/* フェーズ5: 個別編集ボタン */}
                            {selectedStaff?.status !== 'archived' && !isLocked && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (isEditing) {
                                    handleSaveChecklist()
                                    setEditingPhase(null)
                                  } else {
                                    setEditingPhase(phaseKey)
                                    setExpandedPhase(phaseKey)
                                  }
                                }}
                                className={`px-2 py-1 rounded text-xs transition-all ${
                                  isEditing
                                    ? 'bg-teal-500 text-white'
                                    : 'border border-slate-600 text-slate-400 hover:text-white'
                                }`}
                              >
                                {isEditing ? '保存' : '編集'}
                              </button>
                            )}
                            <button
                              onClick={() => setExpandedPhase(isExpanded ? null : phaseKey)}
                              className="p-1"
                            >
                              <span className={`transition-transform inline-block ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-3 sm:p-4 space-y-2 bg-slate-900/50">
                            {isEditing && (
                              <div className="flex justify-end gap-2 mb-3 pb-3 border-b border-slate-700">
                                <button
                                  onClick={() => {
                                    setPendingChecklistChanges({})
                                    setEditingPhase(null)
                                  }}
                                  className="px-3 py-1 rounded text-xs border border-slate-600 text-slate-400"
                                >
                                  キャンセル
                                </button>
                              </div>
                            )}
                            {phase.items.map(item => {
                              const itemChecked = isItemChecked(item.id)
                              const itemInfo = staffChecklists[item.id]
                              // 一度きり項目の場合、完了済み項目は編集不可
                              const itemLocked = phase.lockOnComplete && itemChecked && !isEditing

                              return (
                                <div
                                  key={item.id}
                                  className={`flex items-start gap-3 p-2 rounded-lg transition-all ${
                                    isEditing && !itemLocked ? 'hover:bg-slate-800 cursor-pointer' : ''
                                  } ${itemChecked ? 'text-slate-400' : 'text-white'}`}
                                  onClick={() => isEditing && !itemLocked && handleChecklistItemToggle(item.id)}
                                >
                                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                    itemChecked
                                      ? 'bg-teal-500 border-teal-500'
                                      : 'border-slate-600'
                                  }`}>
                                    {itemChecked && <span className="text-white text-xs">✓</span>}
                                  </div>
                                  <div className="flex-1">
                                    <span className={`text-sm ${itemChecked ? 'line-through' : ''}`}>
                                      {item.text}
                                    </span>
                                    {itemInfo?.completed_at && (
                                      <p className="text-xs text-slate-500 mt-1">
                                        {new Date(itemInfo.completed_at).toLocaleDateString('ja-JP')} 完了
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 面談記録 */}
              <div className="bg-slate-800/30 rounded-2xl p-4 sm:p-6 border border-slate-700/50">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold">🗣️ 面談記録</h3>
                  {selectedStaff?.status !== 'archived' && (
                    <button onClick={() => setShowAddInterview(true)} className="px-3 sm:px-4 py-2 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30 text-sm">
                      + 面談記録を追加
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {interviews.map(interview => {
                    const typeLabel = {
                      regular: '定期面談',
                      renewal: '更新時面談',
                      exit: '退職時面談',
                      other: 'その他'
                    }[interview.interview_type] || '面談'
                    const typeColor = {
                      regular: 'bg-blue-500/20 text-blue-400',
                      renewal: 'bg-purple-500/20 text-purple-400',
                      exit: 'bg-rose-500/20 text-rose-400',
                      other: 'bg-slate-500/20 text-slate-400'
                    }[interview.interview_type] || 'bg-slate-500/20 text-slate-400'

                    return (
                      <div key={interview.id} className="p-3 sm:p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{interview.interview_date}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${typeColor}`}>{typeLabel}</span>
                            {interview.supervisor_interview && (
                              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">監督者</span>
                            )}
                          </div>
                          <span className="text-xs sm:text-sm text-slate-500">記録者: {currentUser?.name || '不明'}</span>
                        </div>
                        <p className="text-slate-300 text-sm">{interview.content}</p>
                        {interview.next_actions && (
                          <p className="mt-2 text-xs sm:text-sm text-teal-400">次のアクション: {interview.next_actions}</p>
                        )}
                      </div>
                    )
                  })}
                  {interviews.length === 0 && (
                    <p className="text-slate-500 text-center py-4">面談記録はありません</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* フェーズ7: ヘルプ・チャット相談 */}
          {activeTab === 'help' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-2">
                {helpStep !== 'main' && (
                  <button
                    onClick={() => {
                      setHelpStep('main')
                      setSelectedProcedure(null)
                      setSelectedProcedureStaff(null)
                    }}
                    className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                  >
                    ← 戻る
                  </button>
                )}
                <h2 className="text-xl font-bold">❓ ヘルプ・相談</h2>
              </div>

              {/* メイン選択画面 */}
              {helpStep === 'main' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => setHelpStep('procedure')}
                    className="p-6 bg-slate-800/50 border border-slate-700/50 rounded-2xl hover:border-teal-500/50 transition-all text-left"
                  >
                    <div className="text-3xl mb-3">📋</div>
                    <h3 className="text-lg font-bold">手続きの相談</h3>
                    <p className="text-sm text-slate-400 mt-2">退職・更新など手続きの案内</p>
                  </button>
                  <button
                    onClick={() => setHelpStep('manual')}
                    className="p-6 bg-slate-800/50 border border-slate-700/50 rounded-2xl hover:border-teal-500/50 transition-all text-left"
                  >
                    <div className="text-3xl mb-3">📖</div>
                    <h3 className="text-lg font-bold">マニュアル</h3>
                    <p className="text-sm text-slate-400 mt-2">アプリの使い方・手続き案内</p>
                  </button>
                  <button
                    onClick={() => window.open('https://www.ssw.go.jp/', '_blank')}
                    className="p-6 bg-slate-800/50 border border-slate-700/50 rounded-2xl hover:border-blue-500/50 transition-all text-left"
                  >
                    <div className="text-3xl mb-3">🔗</div>
                    <h3 className="text-lg font-bold">協議会システム</h3>
                    <p className="text-sm text-slate-400 mt-2">介護分野特定技能協議会へ</p>
                  </button>
                  <div className="p-6 bg-slate-800/50 border border-slate-700/50 rounded-2xl">
                    <div className="text-3xl mb-3">📞</div>
                    <h3 className="text-lg font-bold">専門家連絡先</h3>
                    <div className="mt-3 space-y-2">
                      {contacts.slice(0, 2).map(contact => (
                        <div key={contact.id} className="text-sm">
                          <span className="text-teal-400">{contact.role}</span>
                          <span className="text-slate-400 ml-2">{contact.name}</span>
                        </div>
                      ))}
                      {currentUser?.role === 'owner' && (
                        <button
                          onClick={() => setShowContactManager(true)}
                          className="text-xs text-slate-500 hover:text-white mt-2"
                        >
                          連絡先を管理 →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 手続きフローチャート */}
              {helpStep === 'procedure' && !selectedProcedure && (
                <div className="space-y-4">
                  <p className="text-slate-400">どの手続きについて確認しますか？</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { id: 'renewal', icon: '🔄', title: '在留期間更新', desc: '在留カードの期限が近い場合' },
                      { id: 'exit', icon: '👋', title: '退職手続き', desc: 'スタッフが退職する場合' },
                      { id: 'visitcare', icon: '🏠', title: '訪問系サービス', desc: '訪問介護に従事させる場合' },
                      { id: 'annual', icon: '📅', title: '定期届出', desc: '年1回の届出（4〜5月）' },
                    ].map(proc => (
                      <button
                        key={proc.id}
                        onClick={() => setSelectedProcedure(proc.id)}
                        className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:border-teal-500/50 transition-all text-left"
                      >
                        <span className="text-2xl">{proc.icon}</span>
                        <h4 className="font-bold mt-2">{proc.title}</h4>
                        <p className="text-sm text-slate-400">{proc.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* スタッフ選択 */}
              {helpStep === 'procedure' && selectedProcedure && !selectedProcedureStaff && (
                <div className="space-y-4">
                  <p className="text-slate-400">対象のスタッフを選択してください</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeStaff.map(staff => (
                      <button
                        key={staff.id}
                        onClick={() => setSelectedProcedureStaff(staff)}
                        className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:border-teal-500/50 transition-all text-left"
                      >
                        <p className="font-bold">{staff.name}</p>
                        <p className="text-sm text-slate-400">{getFacilityName(staff.facility_id)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 手続き案内 */}
              {helpStep === 'procedure' && selectedProcedure && selectedProcedureStaff && (
                <div className="space-y-4">
                  <div className="p-4 bg-teal-500/10 border border-teal-500/30 rounded-xl">
                    <p className="text-teal-400 font-medium">対象: {selectedProcedureStaff.name}さん</p>
                  </div>

                  {selectedProcedure === 'renewal' && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold">🔄 在留期間更新の手順</h3>
                      <div className="space-y-3">
                        {[
                          { step: 1, title: '期限確認', desc: `在留期限: ${selectedProcedureStaff.residence_expiry}（残${getDaysUntil(selectedProcedureStaff.residence_expiry)}日）`, done: true },
                          { step: 2, title: '協議会証明書の確認', desc: '有効期限内であることを確認' },
                          { step: 3, title: '必要書類の準備', desc: '申請書、写真、在留カード、パスポート等' },
                          { step: 4, title: '入管へ申請', desc: '期限の3ヶ月前から申請可能' },
                          { step: 5, title: '新しい在留カードの受領', desc: '受領後、システムで期限を更新' },
                        ].map(item => (
                          <div key={item.step} className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              item.done ? 'bg-teal-500' : 'bg-slate-700'
                            }`}>
                              {item.step}
                            </div>
                            <div>
                              <p className="font-medium">{item.title}</p>
                              <p className="text-sm text-slate-400">{item.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          setSelectedStaffId(selectedProcedureStaff.id)
                          setActiveTab('staffDetail')
                        }}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold"
                      >
                        {selectedProcedureStaff.name}さんの詳細を開く
                      </button>
                    </div>
                  )}

                  {selectedProcedure === 'exit' && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold">👋 退職手続きの手順</h3>
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                        <p className="text-amber-400 text-sm">退職日から14日以内に届出が必要です</p>
                      </div>
                      <div className="space-y-3">
                        {[
                          { step: 1, title: '退職日の確定', desc: '本人と退職日を確認' },
                          { step: 2, title: '入管へ届出', desc: '参考様式第3-1号（退職）を14日以内に提出' },
                          { step: 3, title: '受入れ困難の届出', desc: '該当する場合は参考様式第3-5号を提出' },
                          { step: 4, title: '協議会へ報告', desc: '協議会システムで退職を報告' },
                          { step: 5, title: 'ハローワークへ届出', desc: '10日以内に届出' },
                          { step: 6, title: '社会保険の資格喪失届', desc: '退職日から5日以内' },
                        ].map(item => (
                          <div key={item.step} className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl">
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold">
                              {item.step}
                            </div>
                            <div>
                              <p className="font-medium">{item.title}</p>
                              <p className="text-sm text-slate-400">{item.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedProcedure === 'visitcare' && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold">🏠 訪問系サービス従事の要件</h3>
                      <div className="space-y-3">
                        <div className={`p-3 rounded-xl border ${
                          staffQualifications['shoninsya']?.acquired
                            ? 'bg-teal-500/10 border-teal-500/30'
                            : 'bg-slate-800/50 border-slate-700/50'
                        }`}>
                          <p className="font-medium">初任者研修の修了</p>
                          <p className="text-sm text-slate-400">
                            {staffQualifications['shoninsya']?.acquired ? '✓ 修了済み' : '未修了'}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl">
                          <p className="font-medium">介護の実務経験1年以上</p>
                          <p className="text-sm text-slate-400">
                            入社日: {selectedProcedureStaff.entry_date}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400">
                        上記を満たした後、JICWELSへの申請と各種準備が必要です。
                        詳細はチェックリストの「訪問系サービス従事」を確認してください。
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* マニュアル */}
              {helpStep === 'manual' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
                      <h4 className="font-bold mb-2">📱 アプリの使い方</h4>
                      <ul className="space-y-2 text-sm text-slate-400">
                        <li>• ダッシュボード: 在籍状況とアラートを確認</li>
                        <li>• スタッフ一覧: スタッフの追加・編集・詳細確認</li>
                        <li>• チェックリスト: フェーズごとの手続き進捗管理</li>
                        <li>• 面談記録: 定期面談の記録と履歴</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
                      <h4 className="font-bold mb-2">📋 定期的な手続き</h4>
                      <ul className="space-y-2 text-sm text-slate-400">
                        <li>• 定期面談: 3ヶ月に1回（参考様式第5-5号、第5-6号）</li>
                        <li>• 定期届出: 年1回 4〜5月（参考様式第3-6号）</li>
                        <li>• 在留期間更新: 期限の3ヶ月前から申請可能</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
                      <h4 className="font-bold mb-2">⚠️ 届出期限</h4>
                      <ul className="space-y-2 text-sm text-slate-400">
                        <li>• 入社・退職時: 14日以内に入管へ届出</li>
                        <li>• 支援計画変更: 14日以内に届出</li>
                        <li>• ハローワーク: 入社10日以内、退職10日以内</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* フェーズ2: 設定画面（責任者のみ） */}
          {activeTab === 'settings' && currentUser?.role === 'owner' && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-xl font-bold">⚙️ 設定</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <button
                  onClick={() => setShowMemberManager(true)}
                  className="p-6 bg-slate-800/50 border border-slate-700/50 rounded-2xl hover:border-teal-500/50 transition-all text-left"
                >
                  <div className="text-2xl mb-2">👤</div>
                  <h3 className="text-lg font-bold">メンバー管理</h3>
                  <p className="text-sm text-slate-400 mt-1">招待・権限設定</p>
                  <p className="text-xs text-slate-500 mt-2">登録数: {members.length}</p>
                </button>
                <button
                  onClick={() => setShowFacilityManager(true)}
                  className="p-6 bg-slate-800/50 border border-slate-700/50 rounded-2xl hover:border-teal-500/50 transition-all text-left"
                >
                  <div className="text-2xl mb-2">🏢</div>
                  <h3 className="text-lg font-bold">事業所管理</h3>
                  <p className="text-sm text-slate-400 mt-1">事業所の追加・編集</p>
                  <p className="text-xs text-slate-500 mt-2">登録数: {facilities.length}</p>
                </button>
                <button
                  onClick={() => setShowNationalityManager(true)}
                  className="p-6 bg-slate-800/50 border border-slate-700/50 rounded-2xl hover:border-teal-500/50 transition-all text-left"
                >
                  <div className="text-2xl mb-2">🌍</div>
                  <h3 className="text-lg font-bold">国籍管理</h3>
                  <p className="text-sm text-slate-400 mt-1">国籍リストの管理</p>
                  <p className="text-xs text-slate-500 mt-2">登録数: {nationalities.length}</p>
                </button>
                <button
                  onClick={() => setShowContactManager(true)}
                  className="p-6 bg-slate-800/50 border border-slate-700/50 rounded-2xl hover:border-teal-500/50 transition-all text-left"
                >
                  <div className="text-2xl mb-2">📞</div>
                  <h3 className="text-lg font-bold">連絡先管理</h3>
                  <p className="text-sm text-slate-400 mt-1">専門家の連絡先</p>
                  <p className="text-xs text-slate-500 mt-2">登録数: {contacts.length}</p>
                </button>
              </div>
            </div>
          )}

          {/* 操作履歴 */}
          {activeTab === 'logs' && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-xl font-bold">📜 操作履歴</h2>
              <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
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
                </div>
                {activityLogs.length === 0 && (
                  <p className="text-slate-500 text-center py-8">操作履歴はありません</p>
                )}
              </div>
            </div>
          )}

          {/* フィードバック */}
          {activeTab === 'feedback' && (
            <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
              {currentUser?.role === 'owner' ? (
                <>
                  {/* 責任者: 届いたフィードバック一覧 */}
                  <h2 className="text-xl font-bold">💬 届いたフィードバック</h2>
                  {feedbackList.length === 0 ? (
                    <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700/50 text-center">
                      <p className="text-slate-400">まだフィードバックはありません</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {feedbackList.map(fb => (
                        <div key={fb.id} className="bg-slate-800/30 rounded-2xl p-4 sm:p-6 border border-slate-700/50">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <span className="font-medium text-white">{fb.user_name || '匿名'}</span>
                              <span className="text-sm text-slate-500 ml-2">
                                {new Date(fb.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                          <p className="text-slate-300 whitespace-pre-wrap">{fb.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* 担当者・確認者: フィードバック送信フォーム */}
                  <h2 className="text-xl font-bold">💬 フィードバック</h2>
                  <div className="bg-slate-800/30 rounded-2xl p-4 sm:p-6 border border-slate-700/50">
                    <p className="text-slate-400 mb-4 text-sm">
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
                </>
              )}
            </div>
          )}
        </main>

        {/* スタッフ追加モーダル */}
        {showAddStaff && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4">スタッフ追加</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">氏名 *</label>
                  <input
                    type="text"
                    value={newStaff.name}
                    onChange={(e) => setNewStaff(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-teal-500 focus:outline-none"
                    placeholder="山田 太郎"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">国籍</label>
                  <select
                    value={newStaff.nationality}
                    onChange={(e) => setNewStaff(prev => ({ ...prev, nationality: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-teal-500 focus:outline-none appearance-none"
                  >
                    {nationalities.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">入社日 *</label>
                  <input
                    type="date"
                    value={newStaff.entry_date}
                    onChange={(e) => setNewStaff(prev => ({ ...prev, entry_date: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-teal-500 focus:outline-none"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">配属事業所</label>
                  <select
                    value={newStaff.facility_id}
                    onChange={(e) => setNewStaff(prev => ({ ...prev, facility_id: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-teal-500 focus:outline-none appearance-none"
                  >
                    <option value="">選択してください</option>
                    {facilities.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => {
                    setShowAddStaff(false)
                    setNewStaff({ name: '', name_kana: '', nationality: 'ネパール', entry_date: '', facility_id: '' })
                  }} 
                  className="flex-1 px-4 py-3 rounded-lg border border-slate-600 text-slate-400"
                >
                  キャンセル
                </button>
                <button 
                  onClick={handleAddStaff} 
                  className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold"
                >
                  追加
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 面談記録追加モーダル */}
        {showAddInterview && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4">面談記録を追加</h3>
              <div className="space-y-4">
                {/* フェーズ6: 面談種類選択 */}
                <div>
                  <label className="block text-sm text-slate-400 mb-1">面談種類 *</label>
                  <select
                    value={newInterview.interview_type}
                    onChange={(e) => setNewInterview(prev => ({ ...prev, interview_type: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-teal-500 focus:outline-none appearance-none"
                  >
                    <option value="regular">定期面談（3ヶ月ごと）</option>
                    <option value="renewal">更新時面談</option>
                    <option value="exit">退職時面談</option>
                    <option value="other">その他</option>
                  </select>
                  {newInterview.interview_type === 'regular' && (
                    <p className="text-xs text-slate-500 mt-1">
                      参考様式第5-5号（外国人用）・第5-6号（監督者用）に対応
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">面談日 *</label>
                  <input
                    type="date"
                    value={newInterview.date}
                    onChange={(e) => setNewInterview(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-teal-500 focus:outline-none"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">面談内容 *</label>
                  <textarea
                    value={newInterview.content}
                    onChange={(e) => setNewInterview(prev => ({ ...prev, content: e.target.value }))}
                    className="w-full h-24 px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-teal-500 focus:outline-none resize-none"
                    placeholder="面談の内容を記録..."
                  />
                </div>
                {newInterview.interview_type === 'regular' && (
                  <label className="flex items-center gap-2 p-3 bg-slate-900/50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newInterview.supervisor_interview}
                      onChange={(e) => setNewInterview(prev => ({ ...prev, supervisor_interview: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-600 text-teal-500 focus:ring-teal-500"
                    />
                    <span className="text-sm">監督者面談も同時に記録する</span>
                  </label>
                )}
                <div>
                  <label className="block text-sm text-slate-400 mb-1">次のアクション</label>
                  <input
                    type="text"
                    value={newInterview.next_actions}
                    onChange={(e) => setNewInterview(prev => ({ ...prev, next_actions: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-teal-500 focus:outline-none"
                    placeholder="次回までにやること..."
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddInterview(false)
                    setNewInterview({ date: '', content: '', next_actions: '', interview_type: 'regular', supervisor_interview: false })
                  }}
                  className="flex-1 px-4 py-3 rounded-lg border border-slate-600 text-slate-400"
                >
                  キャンセル
                </button>
                <button onClick={handleAddInterview} className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold">
                  追加
                </button>
              </div>
            </div>
          </div>
        )}

        {/* フェーズ2: スタッフ編集モーダル */}
        {showEditStaff && editingStaff && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4">スタッフ情報を編集</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">氏名 *</label>
                  <input
                    type="text"
                    value={editingStaff.name}
                    onChange={(e) => setEditingStaff(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">国籍</label>
                  <select
                    value={editingStaff.nationality}
                    onChange={(e) => setEditingStaff(prev => ({ ...prev, nationality: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-teal-500 focus:outline-none appearance-none"
                  >
                    {nationalities.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">入社日 *</label>
                  <input
                    type="date"
                    value={editingStaff.entry_date}
                    onChange={(e) => setEditingStaff(prev => ({ ...prev, entry_date: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-teal-500 focus:outline-none"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">メイン事業所</label>
                  <select
                    value={editingStaff.facility_id || ''}
                    onChange={(e) => setEditingStaff(prev => ({ ...prev, facility_id: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-teal-500 focus:outline-none appearance-none"
                  >
                    <option value="">選択してください</option>
                    {facilities.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
                {/* フェーズ2: 複数事業所配属 */}
                <div>
                  <label className="block text-sm text-slate-400 mb-1">追加配属事業所（複数選択可）</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto p-2 bg-slate-900 rounded-lg border border-slate-700">
                    {facilities.filter(f => f.id !== editingStaff.facility_id).map(f => (
                      <label key={f.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingStaff.facility_ids?.includes(f.id) || false}
                          onChange={(e) => {
                            const newIds = e.target.checked
                              ? [...(editingStaff.facility_ids || []), f.id]
                              : (editingStaff.facility_ids || []).filter(id => id !== f.id)
                            setEditingStaff(prev => ({ ...prev, facility_ids: newIds }))
                          }}
                          className="w-4 h-4 rounded border-slate-600 text-teal-500 focus:ring-teal-500"
                        />
                        <span className="text-sm">{f.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingStaff.visit_care_ready || false}
                      onChange={(e) => setEditingStaff(prev => ({ ...prev, visit_care_ready: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-600 text-teal-500 focus:ring-teal-500"
                    />
                    <span className="text-sm">訪問系サービス対応可</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditStaff(false)
                    setEditingStaff(null)
                  }}
                  className="flex-1 px-4 py-3 rounded-lg border border-slate-600 text-slate-400"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleEditStaff}
                  className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}

        {/* フェーズ2: 在留期限更新モーダル */}
        {showResidenceUpdate && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700">
              <h3 className="text-xl font-bold mb-4">在留期限を更新</h3>
              <div className="space-y-4">
                <div className="p-3 bg-slate-900/50 rounded-lg">
                  <span className="text-sm text-slate-400">現在の在留期限: </span>
                  <span className="font-medium">{selectedStaff?.residence_expiry}</span>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">新しい在留期限 *</label>
                  <input
                    type="date"
                    value={newResidenceExpiry}
                    onChange={(e) => setNewResidenceExpiry(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-teal-500 focus:outline-none"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowResidenceUpdate(false)
                    setNewResidenceExpiry('')
                  }}
                  className="flex-1 px-4 py-3 rounded-lg border border-slate-600 text-slate-400"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleUpdateResidenceExpiry}
                  className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold"
                >
                  更新
                </button>
              </div>
            </div>
          </div>
        )}

        {/* フェーズ2: 資格取得日入力モーダル */}
        {showQualificationDatePicker && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700">
              <h3 className="text-xl font-bold mb-4">資格取得日を入力</h3>
              <div className="space-y-4">
                <div className="p-3 bg-slate-900/50 rounded-lg">
                  <span className="text-sm text-slate-400">資格: </span>
                  <span className="font-medium">{qualificationTypes.find(q => q.id === showQualificationDatePicker)?.name}</span>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">取得日 *</label>
                  <input
                    type="date"
                    value={qualificationDate}
                    onChange={(e) => setQualificationDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-teal-500 focus:outline-none"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowQualificationDatePicker(null)
                    setQualificationDate('')
                  }}
                  className="flex-1 px-4 py-3 rounded-lg border border-slate-600 text-slate-400"
                >
                  キャンセル
                </button>
                <button
                  onClick={() => {
                    if (qualificationDate) {
                      handleQualificationToggle(showQualificationDatePicker, true, qualificationDate)
                      setShowQualificationDatePicker(null)
                      setQualificationDate('')
                    }
                  }}
                  className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}

        {/* フェーズ2: 事業所管理モーダル */}
        {showFacilityManager && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-lg border border-slate-700 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4">🏢 事業所管理</h3>
              <div className="space-y-4">
                <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                  <h4 className="text-sm font-medium text-slate-400 mb-3">新規事業所を追加</h4>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={newFacilityName}
                      onChange={(e) => setNewFacilityName(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-teal-500 focus:outline-none"
                      placeholder="事業所名"
                    />
                    <input
                      type="text"
                      value={newFacilityAddress}
                      onChange={(e) => setNewFacilityAddress(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-teal-500 focus:outline-none"
                      placeholder="住所（任意）"
                    />
                    <button
                      onClick={handleAddFacility}
                      className="w-full py-2 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30 hover:bg-teal-500/30"
                    >
                      追加
                    </button>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-slate-400 mb-3">登録済み事業所</h4>
                  <div className="space-y-2">
                    {facilities.map(f => (
                      <div key={f.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                        <div>
                          <p className="font-medium">{f.name}</p>
                          {f.address && <p className="text-sm text-slate-500">{f.address}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowFacilityManager(false)}
                  className="px-6 py-2 rounded-lg border border-slate-600 text-slate-400"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}

        {/* フェーズ2: 国籍管理モーダル */}
        {showNationalityManager && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4">🌍 国籍管理</h3>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newNationality}
                    onChange={(e) => setNewNationality(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-teal-500 focus:outline-none"
                    placeholder="新しい国籍名"
                  />
                  <button
                    onClick={handleAddNationality}
                    className="px-4 py-3 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30 hover:bg-teal-500/30"
                  >
                    追加
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {nationalities.map(n => (
                    <span key={n} className="px-3 py-1 rounded-full bg-slate-700 text-sm">{n}</span>
                  ))}
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowNationalityManager(false)}
                  className="px-6 py-2 rounded-lg border border-slate-600 text-slate-400"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}

        {/* フェーズ4: メンバー管理モーダル */}
        {showMemberManager && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-2xl border border-slate-700 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">👤 メンバー管理</h3>
                <button
                  onClick={() => setShowInviteMember(true)}
                  className="px-4 py-2 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30 hover:bg-teal-500/30 text-sm"
                >
                  + メンバー招待
                </button>
              </div>
              <div className="space-y-3">
                {members.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                        member.status === 'disabled' ? 'bg-slate-700' :
                        member.status === 'pending' ? 'bg-amber-600' :
                        'bg-gradient-to-br from-teal-500 to-emerald-600'
                      }`}>
                        {member.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className={`font-medium ${member.status === 'disabled' ? 'text-slate-500' : 'text-white'}`}>
                          {member.name}
                          {member.id === currentUser?.id && <span className="ml-2 text-xs text-teal-400">（自分）</span>}
                          {member.status === 'pending' && <span className="ml-2 text-xs text-amber-400">（招待中）</span>}
                        </p>
                        <p className="text-sm text-slate-500">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <select
                        value={member.role}
                        onChange={(e) => handleChangeRole(member.id, e.target.value)}
                        disabled={member.id === currentUser?.id}
                        className="px-2 sm:px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm focus:border-teal-500 focus:outline-none disabled:opacity-50"
                      >
                        <option value="owner">責任者</option>
                        <option value="admin">担当者</option>
                        <option value="staff">確認者</option>
                      </select>
                      {member.id !== currentUser?.id && member.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleResendInvite(member)}
                            className="px-2 sm:px-3 py-2 rounded-lg text-sm border border-teal-500/50 text-teal-400 hover:bg-teal-500/10"
                          >
                            URLコピー
                          </button>
                          <button
                            onClick={() => handleDeletePendingMember(member.id)}
                            className="px-2 sm:px-3 py-2 rounded-lg text-sm border border-rose-500/50 text-rose-400 hover:bg-rose-500/10"
                          >
                            削除
                          </button>
                        </>
                      )}
                      {member.id !== currentUser?.id && member.status !== 'pending' && (
                        <button
                          onClick={() => handleToggleAccountStatus(member.id)}
                          className={`px-2 sm:px-3 py-2 rounded-lg text-sm border ${
                            member.status === 'disabled'
                              ? 'border-teal-500/50 text-teal-400 hover:bg-teal-500/10'
                              : 'border-rose-500/50 text-rose-400 hover:bg-rose-500/10'
                          }`}
                        >
                          {member.status === 'disabled' ? '有効化' : '無効化'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowMemberManager(false)}
                  className="px-6 py-2 rounded-lg border border-slate-600 text-slate-400"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}

        {/* フェーズ7: 連絡先管理モーダル */}
        {showContactManager && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-lg border border-slate-700 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4">📞 連絡先管理</h3>
              {currentUser?.role === 'owner' && (
                <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700 mb-4">
                  <h4 className="text-sm font-medium text-slate-400 mb-3">新規連絡先を追加</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={newContact.name}
                      onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                      className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
                      placeholder="名前・事務所名"
                    />
                    <input
                      type="text"
                      value={newContact.role}
                      onChange={(e) => setNewContact(prev => ({ ...prev, role: e.target.value }))}
                      className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
                      placeholder="役割（行政書士等）"
                    />
                    <input
                      type="tel"
                      value={newContact.phone}
                      onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                      className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
                      placeholder="電話番号"
                    />
                    <input
                      type="email"
                      value={newContact.email}
                      onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                      className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
                      placeholder="メールアドレス"
                    />
                    <input
                      type="text"
                      value={newContact.note}
                      onChange={(e) => setNewContact(prev => ({ ...prev, note: e.target.value }))}
                      className="col-span-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
                      placeholder="備考"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (newContact.name && newContact.role) {
                        setContacts([...contacts, { ...newContact, id: Date.now() }])
                        setNewContact({ name: '', role: '', phone: '', email: '', note: '' })
                      }
                    }}
                    className="w-full mt-3 py-2 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30 hover:bg-teal-500/30 text-sm"
                  >
                    追加
                  </button>
                </div>
              )}
              <div className="space-y-3">
                {contacts.map(contact => (
                  <div key={contact.id} className="p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-sm text-teal-400">{contact.role}</p>
                      </div>
                      {currentUser?.role === 'owner' && (
                        <button
                          onClick={() => setContacts(contacts.filter(c => c.id !== contact.id))}
                          className="text-slate-500 hover:text-rose-400"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="mt-2 text-sm text-slate-400 space-y-1">
                      {contact.phone && <p>📞 {contact.phone}</p>}
                      {contact.email && <p>✉️ {contact.email}</p>}
                      {contact.note && <p className="text-slate-500">{contact.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowContactManager(false)}
                  className="px-6 py-2 rounded-lg border border-slate-600 text-slate-400"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}

        {/* フェーズ4: メンバー招待モーダル */}
        {showInviteMember && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700">
              <h3 className="text-xl font-bold mb-4">メンバーを招待</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">名前 *</label>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-teal-500 focus:outline-none"
                    placeholder="山田 太郎"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">メールアドレス *</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-teal-500 focus:outline-none"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">権限</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-teal-500 focus:outline-none appearance-none"
                  >
                    <option value="admin">担当者</option>
                    <option value="staff">確認者</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowInviteMember(false)
                    setInviteEmail('')
                    setInviteName('')
                    setInviteRole('staff')
                  }}
                  className="flex-1 px-4 py-3 rounded-lg border border-slate-600 text-slate-400"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleInviteMember}
                  disabled={inviteSending}
                  className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold disabled:opacity-50"
                >
                  {inviteSending ? '処理中...' : '追加してURLをコピー'}
                </button>
              </div>
            </div>
          </div>
        )}

        <footer className="border-t border-slate-800 mt-12 py-6">
          <div className="max-w-7xl mx-auto px-4 text-center text-sm text-slate-500">
            <p>特定技能外国人 受入れ管理システム v2.0</p>
          </div>
        </footer>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        /* 1-5: カレンダーアイコン視認性改善（ダークモード対応） */
        input[type="date"] {
          -webkit-appearance: none;
          min-height: 48px;
          color-scheme: dark;
        }
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(0.8) sepia(1) saturate(5) hue-rotate(140deg);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s;
        }
        input[type="date"]::-webkit-calendar-picker-indicator:hover {
          filter: invert(0.9) sepia(1) saturate(5) hue-rotate(140deg);
          background-color: rgba(45, 212, 191, 0.2);
        }
        
        /* スクロールバー非表示 */
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        /* 1-1: スマホ用ブレークポイント追加 */
        @media (min-width: 480px) {
          .xs\\:inline {
            display: inline !important;
          }
        }
        
        /* タッチデバイス用のアクティブ状態改善 */
        @media (hover: none) {
          button:active,
          .cursor-pointer:active {
            transform: scale(0.98);
          }
        }
      `}</style>
    </>
  )
}
