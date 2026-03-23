-- =====================================================
-- 邀友让利返现营销活动 - 数据库迁移脚本
-- 创建时间: 2026-02-03
-- =====================================================

-- 1. 用户邀请码表 (user_invite_codes)
-- 每个微信登录用户有一个唯一的通用邀请码
CREATE TABLE IF NOT EXISTS user_invite_codes (
    id VARCHAR(16) PRIMARY KEY,
    user_id VARCHAR(16) NOT NULL UNIQUE,           -- 用户ID，一对一关系
    invite_code VARCHAR(16) NOT NULL UNIQUE,       -- 邀请码（唯一标识）
    share_ratio INTEGER NOT NULL DEFAULT 50,       -- 让利比例（0-100，默认50%）
    status VARCHAR(20) NOT NULL DEFAULT 'active',  -- 状态：active-正常, frozen-冻结
    use_count INTEGER NOT NULL DEFAULT 0,          -- 使用次数
    daily_use_count INTEGER NOT NULL DEFAULT 0,    -- 当日使用次数
    daily_use_reset_at TIMESTAMP WITH TIME ZONE,   -- 当日使用次数重置时间
    total_pending_cashback DECIMAL(10,2) NOT NULL DEFAULT 0,   -- 累计待解锁返现
    total_unlocked_cashback DECIMAL(10,2) NOT NULL DEFAULT 0,  -- 累计已解锁返现
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by VARCHAR(16),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(16),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_delete BOOLEAN NOT NULL DEFAULT false
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_user_invite_codes_user_id ON user_invite_codes(user_id) WHERE is_delete = false;
CREATE INDEX IF NOT EXISTS idx_user_invite_codes_invite_code ON user_invite_codes(invite_code) WHERE is_delete = false AND status = 'active';
CREATE INDEX IF NOT EXISTS idx_user_invite_codes_status ON user_invite_codes(status) WHERE is_delete = false;

COMMENT ON TABLE user_invite_codes IS '用户邀请码表';
COMMENT ON COLUMN user_invite_codes.user_id IS '用户ID';
COMMENT ON COLUMN user_invite_codes.invite_code IS '邀请码';
COMMENT ON COLUMN user_invite_codes.share_ratio IS '让利比例（0-100）';
COMMENT ON COLUMN user_invite_codes.status IS '状态：active-正常, frozen-冻结';
COMMENT ON COLUMN user_invite_codes.use_count IS '累计使用次数';
COMMENT ON COLUMN user_invite_codes.daily_use_count IS '当日使用次数';
COMMENT ON COLUMN user_invite_codes.total_pending_cashback IS '累计待解锁返现';
COMMENT ON COLUMN user_invite_codes.total_unlocked_cashback IS '累计已解锁返现';

-- 2. 用户余额表 (user_balances)
-- 用户的返现余额管理
CREATE TABLE IF NOT EXISTS user_balances (
    id VARCHAR(16) PRIMARY KEY,
    user_id VARCHAR(16) NOT NULL UNIQUE,           -- 用户ID，一对一关系
    balance DECIMAL(10,2) NOT NULL DEFAULT 0,      -- 可用余额
    frozen_balance DECIMAL(10,2) NOT NULL DEFAULT 0,  -- 冻结余额（提现中）
    total_earned DECIMAL(10,2) NOT NULL DEFAULT 0,    -- 累计获得
    total_withdrawn DECIMAL(10,2) NOT NULL DEFAULT 0, -- 累计提现
    total_used DECIMAL(10,2) NOT NULL DEFAULT 0,      -- 累计抵扣使用
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by VARCHAR(16),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(16),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_delete BOOLEAN NOT NULL DEFAULT false
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON user_balances(user_id) WHERE is_delete = false;

COMMENT ON TABLE user_balances IS '用户余额表';
COMMENT ON COLUMN user_balances.balance IS '可用余额';
COMMENT ON COLUMN user_balances.frozen_balance IS '冻结余额（提现中）';
COMMENT ON COLUMN user_balances.total_earned IS '累计获得';
COMMENT ON COLUMN user_balances.total_withdrawn IS '累计提现';
COMMENT ON COLUMN user_balances.total_used IS '累计抵扣使用';

-- 3. 邀请订单表 (invite_orders)
-- 核心关联表：记录邀请人-被邀请人-订单的关系和返现计算
CREATE TABLE IF NOT EXISTS invite_orders (
    id VARCHAR(16) PRIMARY KEY,
    invite_code_id VARCHAR(16) NOT NULL,           -- 邀请码ID
    inviter_id VARCHAR(16) NOT NULL,               -- 邀请人ID
    invitee_id VARCHAR(16) NOT NULL,               -- 被邀请人ID
    order_id VARCHAR(16) NOT NULL UNIQUE,          -- 订单ID（一对一）
    course_id VARCHAR(16) NOT NULL,                -- 课程ID
    institution_id VARCHAR(16) NOT NULL,           -- 机构ID
    
    -- 快照信息（支付时锁定）
    cashback_ratio INTEGER NOT NULL,               -- 返现比例（快照，3-15）
    share_ratio INTEGER NOT NULL,                  -- 让利比例（快照，0-100）
    
    -- 金额计算
    order_amount DECIMAL(10,2) NOT NULL,           -- 订单实付金额
    cashback_total DECIMAL(10,2) NOT NULL,         -- 返现总额 = 实付金额 × 返现比例
    discount_amount DECIMAL(10,2) NOT NULL,        -- 立减金额 = 返现总额 × 让利比例
    actual_cashback DECIMAL(10,2) NOT NULL,        -- 实际返现 = 返现总额 - 立减金额
    
    -- 解锁进度
    total_lessons INTEGER NOT NULL DEFAULT 0,      -- 课程总课时
    completed_lessons INTEGER NOT NULL DEFAULT 0,  -- 已完课时
    unlock_ratio DECIMAL(5,2) NOT NULL DEFAULT 0,  -- 解锁比例（0-100）
    unlocked_amount DECIMAL(10,2) NOT NULL DEFAULT 0,  -- 已解锁金额
    
    -- 状态
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending待解锁, unlocking解锁中, completed已完成, cancelled已作废
    
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by VARCHAR(16),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(16),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_delete BOOLEAN NOT NULL DEFAULT false
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_invite_orders_invite_code_id ON invite_orders(invite_code_id) WHERE is_delete = false;
CREATE INDEX IF NOT EXISTS idx_invite_orders_inviter_id ON invite_orders(inviter_id) WHERE is_delete = false;
CREATE INDEX IF NOT EXISTS idx_invite_orders_invitee_id ON invite_orders(invitee_id) WHERE is_delete = false;
CREATE INDEX IF NOT EXISTS idx_invite_orders_order_id ON invite_orders(order_id) WHERE is_delete = false;
CREATE INDEX IF NOT EXISTS idx_invite_orders_course_id ON invite_orders(course_id) WHERE is_delete = false;
CREATE INDEX IF NOT EXISTS idx_invite_orders_status ON invite_orders(status) WHERE is_delete = false;
CREATE INDEX IF NOT EXISTS idx_invite_orders_institution_id ON invite_orders(institution_id) WHERE is_delete = false;

COMMENT ON TABLE invite_orders IS '邀请订单表';
COMMENT ON COLUMN invite_orders.invite_code_id IS '邀请码ID';
COMMENT ON COLUMN invite_orders.inviter_id IS '邀请人ID';
COMMENT ON COLUMN invite_orders.invitee_id IS '被邀请人ID';
COMMENT ON COLUMN invite_orders.order_id IS '订单ID';
COMMENT ON COLUMN invite_orders.course_id IS '课程ID';
COMMENT ON COLUMN invite_orders.cashback_ratio IS '返现比例（快照）';
COMMENT ON COLUMN invite_orders.share_ratio IS '让利比例（快照）';
COMMENT ON COLUMN invite_orders.order_amount IS '订单实付金额';
COMMENT ON COLUMN invite_orders.cashback_total IS '返现总额';
COMMENT ON COLUMN invite_orders.discount_amount IS '立减金额';
COMMENT ON COLUMN invite_orders.actual_cashback IS '实际返现';
COMMENT ON COLUMN invite_orders.unlock_ratio IS '解锁比例';
COMMENT ON COLUMN invite_orders.unlocked_amount IS '已解锁金额';
COMMENT ON COLUMN invite_orders.status IS '状态：pending待解锁, unlocking解锁中, completed已完成, cancelled已作废';

-- 4. 返现流水记录表 (cashback_records)
-- 记录返现解锁、提现、抵扣等所有流水
CREATE TABLE IF NOT EXISTS cashback_records (
    id VARCHAR(16) PRIMARY KEY,
    user_id VARCHAR(16) NOT NULL,                  -- 用户ID
    invite_order_id VARCHAR(16),                   -- 关联邀请订单ID（解锁时有值）
    amount DECIMAL(10,2) NOT NULL,                 -- 金额（正数入账，负数出账）
    balance_before DECIMAL(10,2) NOT NULL,         -- 操作前余额
    balance_after DECIMAL(10,2) NOT NULL,          -- 操作后余额
    type VARCHAR(20) NOT NULL,                     -- 类型：unlock解锁, withdraw提现, deduct抵扣, refund退款
    remark TEXT,                                   -- 备注
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by VARCHAR(16),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(16),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_delete BOOLEAN NOT NULL DEFAULT false
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_cashback_records_user_id ON cashback_records(user_id) WHERE is_delete = false;
CREATE INDEX IF NOT EXISTS idx_cashback_records_invite_order_id ON cashback_records(invite_order_id) WHERE is_delete = false;
CREATE INDEX IF NOT EXISTS idx_cashback_records_type ON cashback_records(type) WHERE is_delete = false;
CREATE INDEX IF NOT EXISTS idx_cashback_records_created_at ON cashback_records(created_at DESC) WHERE is_delete = false;

COMMENT ON TABLE cashback_records IS '返现流水记录表';
COMMENT ON COLUMN cashback_records.user_id IS '用户ID';
COMMENT ON COLUMN cashback_records.invite_order_id IS '关联邀请订单ID';
COMMENT ON COLUMN cashback_records.amount IS '金额（正数入账，负数出账）';
COMMENT ON COLUMN cashback_records.type IS '类型：unlock解锁, withdraw提现, deduct抵扣, refund退款';

-- 5. 提现记录表 (withdraw_records)
-- 用户提现申请记录
CREATE TABLE IF NOT EXISTS withdraw_records (
    id VARCHAR(16) PRIMARY KEY,
    user_id VARCHAR(16) NOT NULL,                  -- 用户ID
    amount DECIMAL(10,2) NOT NULL,                 -- 提现金额
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 状态：pending待审核, approved已通过, rejected已拒绝, completed已到账
    wx_openid VARCHAR(64),                         -- 微信openid（提现目标）
    wx_transaction_id VARCHAR(64),                 -- 微信转账交易ID
    reject_reason TEXT,                            -- 拒绝原因
    reviewed_by VARCHAR(16),                       -- 审核人
    reviewed_at TIMESTAMP WITH TIME ZONE,          -- 审核时间
    completed_at TIMESTAMP WITH TIME ZONE,         -- 到账时间
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by VARCHAR(16),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(16),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_delete BOOLEAN NOT NULL DEFAULT false
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_withdraw_records_user_id ON withdraw_records(user_id) WHERE is_delete = false;
CREATE INDEX IF NOT EXISTS idx_withdraw_records_status ON withdraw_records(status) WHERE is_delete = false;
CREATE INDEX IF NOT EXISTS idx_withdraw_records_created_at ON withdraw_records(created_at DESC) WHERE is_delete = false;

COMMENT ON TABLE withdraw_records IS '提现记录表';
COMMENT ON COLUMN withdraw_records.amount IS '提现金额';
COMMENT ON COLUMN withdraw_records.status IS '状态：pending待审核, approved已通过, rejected已拒绝, completed已到账';
COMMENT ON COLUMN withdraw_records.wx_transaction_id IS '微信转账交易ID';

-- 6. 修改课程表，添加返现配置字段
ALTER TABLE courses ADD COLUMN IF NOT EXISTS cashback_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS cashback_ratio INTEGER NOT NULL DEFAULT 10;

COMMENT ON COLUMN courses.cashback_enabled IS '是否开启返现';
COMMENT ON COLUMN courses.cashback_ratio IS '返现比例（3-15，默认10）';

-- 7. 修改订单表，添加邀请码相关字段
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invite_code VARCHAR(16);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN orders.invite_code IS '使用的邀请码';
COMMENT ON COLUMN orders.discount_amount IS '邀请码立减金额';

-- 8. 创建邀请码生成函数（8位大写字母+数字）
CREATE OR REPLACE FUNCTION generate_invite_code() RETURNS VARCHAR(8) AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- 去除容易混淆的字符
    result VARCHAR(8) := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 验证脚本执行成功
SELECT 'Cashback tables created successfully' as message;
