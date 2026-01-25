-- 協議会登録状況管理テーブル
-- スタッフごとの協議会への登録状況を管理

CREATE TABLE IF NOT EXISTS council_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES foreign_staff(id) ON DELETE CASCADE,

  -- 登録状況
  is_registered BOOLEAN DEFAULT FALSE,
  registered_at DATE, -- 登録日
  registration_number TEXT, -- 登録番号（あれば）

  -- 最終更新（協議会への情報更新）
  last_updated_at DATE,

  -- メモ
  memo TEXT,

  -- 管理情報
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- スタッフごとに1レコード
  UNIQUE(staff_id)
);

-- RLSを有効化
ALTER TABLE council_registrations ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは読み書き可能
CREATE POLICY "Authenticated users can manage council registrations" ON council_registrations
  FOR ALL USING (true);

-- 更新時にupdated_atを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_council_registration_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER council_registration_updated
  BEFORE UPDATE ON council_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_council_registration_timestamp();
