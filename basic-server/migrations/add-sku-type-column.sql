-- 给 course_skus 表添加 type 字段
-- SKU类型: standard(正式课套餐), trial(体验课套餐)
ALTER TABLE course_skus ADD COLUMN IF NOT EXISTS type text DEFAULT 'standard';

-- 更新已有数据：课程类型为 trial 的 SKU 全部设为 trial
UPDATE course_skus 
SET type = 'trial'
WHERE course_id IN (
  SELECT id FROM courses WHERE type = 'trial'
);

-- 为其他正式课中名称包含"体验"的 SKU 设为 trial（兼容已有数据）
UPDATE course_skus 
SET type = 'trial'
WHERE course_id IN (
  SELECT id FROM courses WHERE type = 'standard'
)
AND name LIKE '%体验%';

COMMENT ON COLUMN course_skus.type IS 'SKU类型: standard(正式课套餐), trial(体验课套餐)';
