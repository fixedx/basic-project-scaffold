-- 创建教师用户关联表
-- 2026-01-12

CREATE TABLE IF NOT EXISTS teacher_users (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  institution_id TEXT NOT NULL,
  role TEXT DEFAULT 'teacher',
  is_active BOOLEAN DEFAULT true,
  is_delete BOOLEAN DEFAULT false,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_teacher_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
  CONSTRAINT fk_teacher_institution FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_teacher_users_user_id ON teacher_users(user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_users_teacher_id ON teacher_users(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_users_institution_id ON teacher_users(institution_id);

-- 添加注释
COMMENT ON TABLE teacher_users IS '教师用户关联表';
COMMENT ON COLUMN teacher_users.user_id IS '用户ID';
COMMENT ON COLUMN teacher_users.teacher_id IS '教师ID';
COMMENT ON COLUMN teacher_users.institution_id IS '机构ID';
COMMENT ON COLUMN teacher_users.role IS '角色（teacher）';
