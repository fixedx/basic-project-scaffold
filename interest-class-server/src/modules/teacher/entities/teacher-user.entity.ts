import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('teacher_users')
export class TeacherUserEntity extends BaseEntity {
  @Column({ type: 'text', comment: '用户ID' })
  user_id: string;

  @Column({ type: 'text', comment: '教师ID' })
  teacher_id: string;

  @Column({ type: 'text', comment: '机构ID' })
  institution_id: string;

  @Column({ type: 'text', default: 'teacher', comment: '角色' })
  role: string;
}
