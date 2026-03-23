-- 创建教师表
CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  name TEXT NOT NULL,
  gender TEXT,
  phone TEXT,
  avatar TEXT,
  subjects JSONB,
  title TEXT,
  years_of_experience INTEGER,
  bio TEXT,
  certificates JSONB,
  status TEXT DEFAULT 'active',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_delete BOOLEAN DEFAULT FALSE
);

-- 添加注释
COMMENT ON TABLE teachers IS '教师表';
COMMENT ON COLUMN teachers.id IS '主键ID（16位雪花ID）';
COMMENT ON COLUMN teachers.institution_id IS '所属机构ID';
COMMENT ON COLUMN teachers.name IS '教师姓名';
COMMENT ON COLUMN teachers.gender IS '性别: male(男), female(女)';
COMMENT ON COLUMN teachers.phone IS '手机号';
COMMENT ON COLUMN teachers.avatar IS '头像URL';
COMMENT ON COLUMN teachers.subjects IS '教授科目数组';
COMMENT ON COLUMN teachers.title IS '职称/资质';
COMMENT ON COLUMN teachers.years_of_experience IS '教龄（年）';
COMMENT ON COLUMN teachers.bio IS '教师简介';
COMMENT ON COLUMN teachers.certificates IS '资格证书数组';
COMMENT ON COLUMN teachers.status IS '状态: active(在职), inactive(离职), on_leave(休假)';
COMMENT ON COLUMN teachers.sort_order IS '排序';
COMMENT ON COLUMN teachers.is_active IS '是否激活';
COMMENT ON COLUMN teachers.created_by IS '创建人ID';
COMMENT ON COLUMN teachers.created_at IS '创建时间';
COMMENT ON COLUMN teachers.updated_by IS '更新人ID';
COMMENT ON COLUMN teachers.updated_at IS '更新时间';
COMMENT ON COLUMN teachers.is_delete IS '软删除标记';

-- 创建索引
CREATE INDEX idx_teachers_institution_id ON teachers(institution_id) WHERE is_delete = FALSE;
CREATE INDEX idx_teachers_status ON teachers(status) WHERE is_delete = FALSE;
CREATE INDEX idx_teachers_sort_order ON teachers(sort_order DESC);

-- 创建唯一索引（同一机构内手机号不能重复）
CREATE UNIQUE INDEX idx_teachers_institution_phone ON teachers(institution_id, phone) WHERE is_delete = FALSE AND phone IS NOT NULL;
