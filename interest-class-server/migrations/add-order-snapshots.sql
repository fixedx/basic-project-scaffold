-- 添加订单快照字段
-- 2026-01-12

-- 添加机构信息快照
ALTER TABLE orders ADD COLUMN IF NOT EXISTS institution_snapshot jsonb;
COMMENT ON COLUMN orders.institution_snapshot IS '机构信息快照';

-- 添加课程信息快照
ALTER TABLE orders ADD COLUMN IF NOT EXISTS course_snapshot jsonb;
COMMENT ON COLUMN orders.course_snapshot IS '课程信息快照';

-- 添加SKU信息快照
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sku_snapshot jsonb;
COMMENT ON COLUMN orders.sku_snapshot IS 'SKU信息快照';
