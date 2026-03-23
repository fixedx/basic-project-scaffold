-- 添加退款相关字段到 orders 表
-- 退款单号（本系统生成）
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_no TEXT;

-- 微信退款单号（微信返回）
ALTER TABLE orders ADD COLUMN IF NOT EXISTS wechat_refund_id TEXT;

-- 线上退款金额（原路退回微信）
ALTER TABLE orders ADD COLUMN IF NOT EXISTS online_refund_amount DECIMAL(10,2) DEFAULT 0;

-- 线下退款金额（到店退回）
ALTER TABLE orders ADD COLUMN IF NOT EXISTS offline_refund_amount DECIMAL(10,2) DEFAULT 0;

-- 退款状态：processing-退款中, success-退款成功, abnormal-退款异常, closed-退款关闭
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_status TEXT;

-- 添加注释
COMMENT ON COLUMN orders.refund_no IS '退款单号（本系统生成）';
COMMENT ON COLUMN orders.wechat_refund_id IS '微信退款单号（微信返回）';
COMMENT ON COLUMN orders.online_refund_amount IS '线上退款金额（原路退回微信）';
COMMENT ON COLUMN orders.offline_refund_amount IS '线下退款金额（到店退回）';
COMMENT ON COLUMN orders.refund_status IS '退款状态：processing-退款中, success-退款成功, abnormal-退款异常, closed-退款关闭';
