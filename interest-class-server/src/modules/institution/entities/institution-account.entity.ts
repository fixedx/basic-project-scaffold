import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('institution_accounts')
@Index(['institution_id'])
@Index(['username'], { unique: true })
export class InstitutionAccountEntity extends BaseEntity {
  @Column({ type: 'text', comment: '机构ID' })
  institution_id: string;

  @Column({ type: 'text', comment: '登录账号' })
  username: string;

  @Column({ type: 'text', comment: '密码（加密存储）' })
  password: string;

  @Column({ type: 'text', nullable: true, comment: '账号姓名' })
  real_name?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: '角色：admin-管理员, staff-普通员工',
  })
  role?: string;

  @Column({ type: 'text', nullable: true, comment: '备注' })
  remark?: string;

  @Column({ type: 'boolean', default: true, comment: '是否启用' })
  is_enabled: boolean;
}
