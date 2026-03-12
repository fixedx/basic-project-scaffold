import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/**
 * 提现记录实体
 */
@Entity('withdraw_records')
export class WithdrawRecordEntity extends BaseEntity {
  @Column({ type: 'text', comment: '用户ID' })
  user_id: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    comment: '提现金额',
  })
  amount: number;

  @Column({
    type: 'text',
    default: 'pending',
    comment: '状态：pending待审核, approved已通过, rejected已拒绝, completed已到账, failed转账失败',
  })
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';

  @Column({ type: 'text', nullable: true, comment: '微信openid' })
  wx_openid: string;

  @Column({ type: 'text', nullable: true, comment: '微信转账交易ID' })
  wx_transaction_id: string;

  @Column({ type: 'text', nullable: true, comment: '商户转账批次号（幂等键）' })
  out_batch_no: string;

  @Column({ type: 'text', nullable: true, comment: '商户转账明细号（幂等键）' })
  out_detail_no: string;

  @Column({ type: 'text', nullable: true, comment: '拒绝原因' })
  reject_reason: string;

  @Column({ type: 'text', nullable: true, comment: '审核人' })
  reviewed_by: string;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: '审核时间',
  })
  reviewed_at: Date;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: '到账时间',
  })
  completed_at: Date;
}
