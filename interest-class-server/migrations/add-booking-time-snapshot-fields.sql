-- =====================================================
-- 迁移脚本：为 bookings 表添加课程时间快照字段
-- 新架构：booking 独立存储上课时间/教师/教室信息
-- 排课表 (schedules) 只保存机构创建的模板数据
-- =====================================================

-- 1. 添加新字段到 bookings 表
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS start_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS end_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS day_of_week TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS teacher_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS classroom_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS teacher_name TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS classroom_name TEXT;

-- 添加注释
COMMENT ON COLUMN bookings.start_time IS '上课开始时间（具体日期+时间）';
COMMENT ON COLUMN bookings.end_time IS '上课结束时间（具体日期+时间）';
COMMENT ON COLUMN bookings.day_of_week IS '星期几';
COMMENT ON COLUMN bookings.teacher_id IS '教师ID';
COMMENT ON COLUMN bookings.classroom_id IS '教室ID';
COMMENT ON COLUMN bookings.teacher_name IS '教师姓名（快照）';
COMMENT ON COLUMN bookings.classroom_name IS '教室名称（快照）';

-- 2. 迁移旧数据：从关联的 schedule 复制时间信息到 booking
UPDATE bookings b
SET 
  start_time = s.start_time,
  end_time = s.end_time,
  day_of_week = s.day_of_week,
  teacher_id = s.teacher_id,
  classroom_id = s.classroom_id
FROM schedules s
WHERE b.schedule_id = s.id
  AND b.start_time IS NULL;

-- 3. 迁移教师和教室名称
UPDATE bookings b
SET teacher_name = t.name
FROM teachers t
WHERE b.teacher_id = t.id
  AND b.teacher_name IS NULL
  AND b.teacher_id IS NOT NULL;

UPDATE bookings b
SET classroom_name = c.name
FROM classrooms c
WHERE b.classroom_id = c.id
  AND b.classroom_name IS NULL
  AND b.classroom_id IS NOT NULL;

-- 4. 清理订单流程生成的冗余 schedule 记录
-- 识别方法：schedule 没有被任何排课模板引用（即不是机构手动创建的）
-- 安全策略：只标记删除，不物理删除

-- 找出所有由订单克隆生成的 schedule（它们的 created_by 为空或特殊标识）
-- 注意：这一步需要根据实际数据情况调整，先用软删除标记
-- 如果能确定哪些是克隆的，可以执行：
-- UPDATE schedules SET is_delete = true 
-- WHERE id NOT IN (
--   SELECT DISTINCT schedule_id FROM bookings WHERE schedule_id IS NOT NULL
--     UNION
--   SELECT id FROM schedules WHERE ... -- 原始模板的识别条件
-- );

-- 5. 添加索引优化查询
CREATE INDEX IF NOT EXISTS idx_bookings_teacher_id ON bookings (teacher_id) WHERE is_delete = false;
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON bookings (start_time) WHERE is_delete = false;
CREATE INDEX IF NOT EXISTS idx_bookings_classroom_id ON bookings (classroom_id) WHERE is_delete = false;

-- 验证
SELECT 
  COUNT(*) as total_bookings,
  COUNT(start_time) as with_start_time,
  COUNT(teacher_id) as with_teacher_id,
  COUNT(classroom_id) as with_classroom_id
FROM bookings 
WHERE is_delete = false;
