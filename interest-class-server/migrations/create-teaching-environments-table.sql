-- ========================================
-- 创建教学环境子表 institution_teaching_environments
-- 将教学环境从 institution_showcases 分离出来
-- ========================================

-- 1. 创建新表
CREATE TABLE IF NOT EXISTS institution_teaching_environments (
  id VARCHAR(20) PRIMARY KEY,
  institution_id VARCHAR(20) NOT NULL,
  title TEXT,
  img_url TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by VARCHAR(20),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_delete BOOLEAN DEFAULT false
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_teaching_env_institution_id 
  ON institution_teaching_environments(institution_id);

-- 3. 迁移数据：将 institution_showcases 中 type='classroom' 的记录迁移到新表
INSERT INTO institution_teaching_environments (id, institution_id, title, img_url, description, sort_order, is_active, created_by, created_at, updated_by, updated_at, is_delete)
SELECT id, institution_id, title, img_url, description, sort_order, is_active, created_by, created_at, updated_by, updated_at, is_delete
FROM institution_showcases
WHERE type = 'classroom';

-- 4. 删除 institution_showcases 中 type='classroom' 的记录
DELETE FROM institution_showcases WHERE type = 'classroom';

-- 5. 验证
SELECT 'institution_teaching_environments' AS table_name, COUNT(*) AS count FROM institution_teaching_environments
UNION ALL
SELECT 'institution_showcases (classroom)' AS table_name, COUNT(*) AS count FROM institution_showcases WHERE type = 'classroom';
