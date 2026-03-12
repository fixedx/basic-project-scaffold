-- 迁移 institution_accounts 数据到 users 表和 user_institutions 表
-- 执行时间：根据实际情况确定
-- 注意：执行前请备份数据库！

-- 1. 为 institution_accounts 中的每个账号在 users 表创建记录
INSERT INTO users (
  id,
  openid,
  username,
  password,
  nickname,
  avatar,
  is_active,
  created_by,
  updated_by,
  created_at,
  updated_at
)
SELECT
  ia.id,
  CONCAT('institution_', ia.username, '_', EXTRACT(EPOCH FROM ia.created_at)::BIGINT) as openid,
  ia.username,
  ia.password,
  COALESCE(ia.real_name, ia.username) as nickname,
  '' as avatar,
  ia.is_enabled as is_active,
  ia.created_by,
  ia.updated_by,
  ia.created_at,
  ia.updated_at
FROM institution_accounts ia
WHERE NOT EXISTS (
  SELECT 1 FROM users u WHERE u.username = ia.username
);

-- 2. 在 user_institutions 表中建立关联
INSERT INTO user_institutions (
  id,
  user_id,
  institution_id,
  role,
  created_by,
  updated_by,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid()::TEXT as id,
  u.id as user_id,
  ia.institution_id,
  COALESCE(ia.role, 'admin') as role,
  ia.created_by,
  ia.updated_by,
  ia.created_at,
  ia.updated_at
FROM institution_accounts ia
INNER JOIN users u ON u.username = ia.username
WHERE NOT EXISTS (
  SELECT 1 FROM user_institutions ui 
  WHERE ui.user_id = u.id AND ui.institution_id = ia.institution_id
);

-- 3. 验证迁移结果
-- 检查迁移的账号数量
SELECT 
  'institution_accounts count' as table_name,
  COUNT(*) as count
FROM institution_accounts
UNION ALL
SELECT 
  'migrated to users' as table_name,
  COUNT(*) as count
FROM users u
WHERE u.username IS NOT NULL
UNION ALL
SELECT 
  'user_institutions count' as table_name,
  COUNT(*) as count
FROM user_institutions;

-- 4. （可选）迁移完成后，将 institution_accounts 表重命名为备份
-- ALTER TABLE institution_accounts RENAME TO institution_accounts_backup;

-- 5. （可选）确认无误后，删除备份表
-- DROP TABLE institution_accounts_backup;
