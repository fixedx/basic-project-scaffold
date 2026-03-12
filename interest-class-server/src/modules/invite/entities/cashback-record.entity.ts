import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/**
 * 返现流水记录实体
 */
@Entity('cashback_records')
export class CashbackRecordEntity extends BaseEntity {
  @Column({ type: 'text', comment: '用户ID' })
  user_id: string;

  @Column({ type: 'text', nullable: true, comment: '关联邀请订单ID' })
  invite_order_id: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    comment: '金额（正数入账，负数出账）',
  })
  amount: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    comment: '操作前余额',
  })
  balance_before: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    comment: '操作后余额',
  })
  balance_after: number;

  @Column({
    type: 'text',
    comment: '类型：unlock解锁, withdraw提现, deduct抵扣, refund退款',
  })
  type: 'unlock' | 'withdraw' | 'deduct' | 'refund';

  @Column({ type: 'text', nullable: true, comment: '备注' })
  remark: string;
}
