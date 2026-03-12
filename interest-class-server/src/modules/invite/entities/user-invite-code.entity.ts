import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/**
 * 用户邀请码实体
 * 每个微信登录用户有一个唯一的通用邀请码
 */
@Entity('user_invite_codes')
export class UserInviteCodeEntity extends BaseEntity {
  @Column({ type: 'text', comment: '用户ID' })
  user_id: string;

  @Column({ type: 'text', comment: '邀请码' })
  invite_code: string;

  @Column({ type: 'integer', default: 50, comment: '让利比例（0-100）' })
  share_ratio: number;

  @Column({
    type: 'text',
    default: 'active',
    comment: '状态：active-正常, frozen-冻结',
  })
  status: 'active' | 'frozen';

  @Column({ type: 'integer', default: 0, comment: '累计使用次数' })
  use_count: number;

  @Column({ type: 'integer', default: 0, comment: '当日使用次数' })
  daily_use_count: number;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: '当日使用次数重置时间',
  })
  daily_use_reset_at: Date;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '累计待解锁返现',
  })
  total_pending_cashback: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '累计已解锁返现',
  })
  total_unlocked_cashback: number;
}
