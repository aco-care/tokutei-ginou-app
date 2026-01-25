-- お知らせテーブル
CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  version TEXT, -- v1.1.0 など（任意）
  feedback_user_name TEXT, -- 「〇〇さんのご要望」（任意）
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- お知らせ既読管理テーブル
CREATE TABLE IF NOT EXISTS announcement_reads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(announcement_id, user_id)
);

-- RLSを有効化
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- お知らせは全員が読める
CREATE POLICY "All users can read announcements" ON announcements
  FOR SELECT USING (true);

-- お知らせの作成はownerのみ
CREATE POLICY "Only owner can create announcements" ON announcements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE users.auth_id = auth.uid() AND users.role = 'owner'
    )
  );

-- 既読は自分のレコードのみ操作可能
CREATE POLICY "Users can manage own reads" ON announcement_reads
  FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );
