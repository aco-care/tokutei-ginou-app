-- 特定技能の分野（sector）フィールドを追加
-- 対応分野: 介護(kaigo), 外食業(gaishoku)

-- foreign_staffテーブルにsectorカラムを追加
ALTER TABLE foreign_staff
ADD COLUMN IF NOT EXISTS sector TEXT DEFAULT 'kaigo';

-- sectorカラムにCHECK制約を追加（許可された値のみ）
ALTER TABLE foreign_staff
ADD CONSTRAINT sector_check CHECK (sector IN ('kaigo', 'gaishoku'));

-- 既存データはすべて介護として扱う（デフォルト値で対応済み）

-- コメント: 分野ごとの違い
-- kaigo (介護):
--   - 協議会: 介護分野における特定技能協議会（厚労省）
--   - 資格: 介護福祉士、実務者研修、初任者研修
--   - 訪問系サービス対応あり
--   - 特定技能2号なし
--
-- gaishoku (外食業):
--   - 協議会: 食品産業特定技能協議会（農水省）
--   - 資格: 特になし（調理師など任意）
--   - 訪問系サービスなし
--   - 特定技能2号あり（2023年〜）
