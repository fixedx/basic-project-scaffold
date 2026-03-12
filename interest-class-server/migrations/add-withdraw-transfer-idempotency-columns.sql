-- 为提现记录增加微信转账幂等键字段
-- 用途：确保重试时复用同一 out_batch_no/out_detail_no，避免二次打款

ALTER TABLE withdraw_records
ADD COLUMN IF NOT EXISTS out_batch_no TEXT,
ADD COLUMN IF NOT EXISTS out_detail_no TEXT;

-- 幂等键唯一索引（仅对未软删记录生效）
CREATE UNIQUE INDEX IF NOT EXISTS ux_withdraw_records_out_batch_no_active
ON withdraw_records(out_batch_no)
WHERE is_delete = false AND out_batch_no IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_withdraw_records_out_detail_no_active
ON withdraw_records(out_detail_no)
WHERE is_delete = false AND out_detail_no IS NOT NULL;
