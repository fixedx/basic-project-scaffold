import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/**
 * 用户-机构关联表
 * 一个用户可以拥有多个机构
 */
@Entity('user_institutions')
@Index(['user_id', 'institution_id'], { unique: true })
export class UserInstitutionEntity extends BaseEntity {
  @Column({ type: 'text', comment: '用户ID' })
  @Index()
  user_id: string;

  @Column({ type: 'text', comment: '机构ID' })
  @Index()
  institution_id: string;

  @Column({
    type: 'text',
    default: 'owner',
    comment: '角色: owner(所有者), admin(管理员), staff(员工)',
  })
  role: string;
}
