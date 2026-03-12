-- 创建教室表
CREATE TABLE IF NOT EXISTS classrooms (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  name TEXT NOT NULL,
  capacity INTEGER DEFAULT 0,
  area DECIMAL(10, 2),
  floor TEXT,
  facilities JSONB,
  status TEXT DEFAULT 'available',
  sort_order INTEGER DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_delete BOOLEAN DEFAULT FALSE
);

-- 添加注释
COMMENT ON TABLE classrooms IS '教室表';
COMMENT ON COLUMN classrooms.id IS '主键ID（16位雪花ID）';
COMMENT ON COLUMN classrooms.institution_id IS '所属机构ID';
COMMENT ON COLUMN classrooms.name IS '教室名称';
COMMENT ON COLUMN classrooms.capacity IS '容纳人数';
COMMENT ON COLUMN classrooms.area IS '面积（平方米）';
COMMENT ON COLUMN classrooms.floor IS '楼层';
COMMENT ON COLUMN classrooms.facilities IS '设施设备数组';
COMMENT ON COLUMN classrooms.status IS '状态: available(可用), maintenance(维护中), disabled(已停用)';
COMMENT ON COLUMN classrooms.sort_order IS '排序';
COMMENT ON COLUMN classrooms.description IS '备注说明';
COMMENT ON COLUMN classrooms.is_active IS '是否激活';
COMMENT ON COLUMN classrooms.created_by IS '创建人ID';
COMMENT ON COLUMN classrooms.created_at IS '创建时间';
COMMENT ON COLUMN classrooms.updated_by IS '更新人ID';
COMMENT ON COLUMN classrooms.updated_at IS '更新时间';
COMMENT ON COLUMN classrooms.is_delete IS '软删除标记';

-- 创建索引
CREATE INDEX idx_classrooms_institution_id ON classrooms(institution_id) WHERE is_delete = FALSE;
CREATE INDEX idx_classrooms_status ON classrooms(status) WHERE is_delete = FALSE;
CREATE INDEX idx_classrooms_sort_order ON classrooms(sort_order DESC);

-- 创建唯一索引（同一机构内教室名称不能重复）
CREATE UNIQUE INDEX idx_classrooms_institution_name ON classrooms(institution_id, name) WHERE is_delete = FALSE;
