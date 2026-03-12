import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/**
 * 邀请订单实体
 * 记录邀请人-被邀请人-订单的关系和返现计算
 */
@Entity('invite_orders')
export class InviteOrderEntity extends BaseEntity {
  @Column({ type: 'text', comment: '邀请码ID' })
  invite_code_id: string;

  @Column({ type: 'text', comment: '邀请人ID' })
  inviter_id: string;

  @Column({ type: 'text', comment: '被邀请人ID' })
  invitee_id: string;

  @Column({ type: 'text', comment: '订单ID' })
  order_id: string;

  @Column({ type: 'text', comment: '课程ID' })
  course_id: string;

  @Column({ type: 'text', comment: '机构ID' })
  institution_id: string;

  // 快照信息（支付时锁定）
  @Column({ type: 'integer', comment: '返现比例（快照，3-15）' })
  cashback_ratio: number;

  @Column({ type: 'integer', comment: '让利比例（快照，0-100）' })
  share_ratio: number;

  // 金额计算
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    comment: '订单实付金额',
  })
  order_amount: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    comment: '返现总额 = 实付金额 × 返现比例',
  })
  cashback_total: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    comment: '立减金额 = 返现总额 × 让利比例',
  })
  discount_amount: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    comment: '实际返现 = 返现总额 - 立减金额',
  })
  actual_cashback: number;

  // 解锁进度
  @Column({ type: 'integer', default: 0, comment: '课程总课时' })
  total_lessons: number;

  @Column({ type: 'integer', default: 0, comment: '已完课时' })
  completed_lessons: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: '解锁比例（0-100）',
  })
  unlock_ratio: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '已解锁金额',
  })
  unlocked_amount: number;

  @Column({
    type: 'text',
    default: 'pending',
    comment: '状态：pending待解锁, unlocking解锁中, completed已完成, cancelled已作废',
  })
  status: 'pending' | 'unlocking' | 'completed' | 'cancelled';
}
