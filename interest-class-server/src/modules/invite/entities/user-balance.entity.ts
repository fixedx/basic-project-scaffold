import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/**
 * 用户余额实体
 */
@Entity('user_balances')
export class UserBalanceEntity extends BaseEntity {
  @Column({ type: 'text', comment: '用户ID' })
  user_id: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '可用余额',
  })
  balance: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '冻结余额（提现中）',
  })
  frozen_balance: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '累计获得',
  })
  total_earned: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '累计提现',
  })
  total_withdrawn: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '累计抵扣使用',
  })
  total_used: number;
}
