import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('teachers')
export class TeacherEntity extends BaseEntity {
  @Column({ type: 'text', comment: '所属机构ID' })
  institution_id: string;

  @Column({ type: 'text', comment: '教师姓名' })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: '性别: male(男), female(女)',
  })
  gender: string;

  @Column({ type: 'text', nullable: true, comment: '手机号' })
  phone: string;

  @Column({ type: 'text', comment: '头像URL（必填）' })
  photo: string;

  @Column({ type: 'jsonb', nullable: true, comment: '教授科目数组' })
  subjects: string[];

  @Column({ type: 'text', nullable: true, comment: '职称/资质' })
  title: string;

  @Column({ type: 'integer', nullable: true, comment: '教龄（年）' })
  years_of_experience: number;

  @Column({ type: 'text', nullable: true, comment: '教师简介' })
  bio: string;

  @Column({ type: 'jsonb', nullable: true, comment: '资格证书数组' })
  certificates: string[];

  @Column({
    type: 'text',
    default: 'active',
    comment: '状态: active(在职), inactive(离职), on_leave(休假)',
  })
  status: string;

  @Column({ type: 'integer', default: 0, comment: '排序' })
  sort_order: number;
}
