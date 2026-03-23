-- 为 user_balances 表的 user_id 字段添加部分唯一索引
-- 防止同一用户并发创建余额记录（getOrCreate 竞态）
-- 使用 WHERE is_delete = false 允许软删除记录复用 user_id
CREATE UNIQUE INDEX IF NOT EXISTS ux_user_balances_user_id_active
  ON user_balances(user_id)
  WHERE is_delete = false;
