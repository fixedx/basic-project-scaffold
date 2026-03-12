-- 签到记录表
-- 用于记录家长端上课签到，每次签到扣除一个课时

-- 1. 给订单表添加已完成课时字段
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_lessons INTEGER DEFAULT 0;
COMMENT ON COLUMN orders.completed_lessons IS '已完成课时数（通过签到累计）';

-- 2. 给订单表添加总课时数字段（从SKU快照中提取，方便查询）
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_lessons INTEGER DEFAULT 0;
COMMENT ON COLUMN orders.total_lessons IS '总课时数（购买时从SKU获取）';

-- 3. 创建签到记录表
CREATE TABLE IF NOT EXISTS check_ins (
    id VARCHAR(20) PRIMARY KEY,
    
    -- 关联信息
    order_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    institution_id VARCHAR(20) NOT NULL,
    course_id VARCHAR(20) NOT NULL,
    booking_id VARCHAR(20),
    schedule_id VARCHAR(20),
    child_id VARCHAR(20),
    
    -- 签到信息
    check_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_makeup BOOLEAN DEFAULT FALSE,
    makeup_date DATE,
    
    -- 课时信息（签到时记录，用于追溯）
    lesson_no INTEGER NOT NULL,
    
    -- 位置信息（可选，用于验证是否在机构附近签到）
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    
    -- 备注
    remark TEXT,
    
    -- 基础字段
    is_active BOOLEAN DEFAULT TRUE,
    is_delete BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(20),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_check_ins_order_id ON check_ins(order_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_user_id ON check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_institution_id ON check_ins(institution_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_check_in_time ON check_ins(check_in_time);
CREATE INDEX IF NOT EXISTS idx_check_ins_booking_id ON check_ins(booking_id);

-- 添加注释
COMMENT ON TABLE check_ins IS '签到记录表';
COMMENT ON COLUMN check_ins.order_id IS '关联订单ID';
COMMENT ON COLUMN check_ins.user_id IS '签到用户ID';
COMMENT ON COLUMN check_ins.institution_id IS '机构ID';
COMMENT ON COLUMN check_ins.course_id IS '课程ID';
COMMENT ON COLUMN check_ins.booking_id IS '关联预约ID（可选）';
COMMENT ON COLUMN check_ins.schedule_id IS '关联排课ID（可选）';
COMMENT ON COLUMN check_ins.child_id IS '宝贝ID';
COMMENT ON COLUMN check_ins.check_in_time IS '签到时间';
COMMENT ON COLUMN check_ins.is_makeup IS '是否为补卡';
COMMENT ON COLUMN check_ins.makeup_date IS '补卡日期（补的是哪天的课）';
COMMENT ON COLUMN check_ins.lesson_no IS '第几节课（签到时的课时序号）';
COMMENT ON COLUMN check_ins.latitude IS '签到位置纬度';
COMMENT ON COLUMN check_ins.longitude IS '签到位置经度';
COMMENT ON COLUMN check_ins.remark IS '备注';
