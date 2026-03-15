import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/**
 * 订单实体
 */
@Entity('orders')
export class OrderEntity extends BaseEntity {
  @Column({ type: 'text', comment: '订单号' })
  order_no: string;

  @Column({ type: 'text', comment: '用户ID' })
  user_id: string;

  @Column({ type: 'text', comment: '机构ID' })
  institution_id: string;

  @Column({ type: 'text', comment: '课程ID' })
  course_id: string;

  @Column({ type: 'text', comment: '课程SKU ID' })
  sku_id: string;

  @Column({ type: 'text', nullable: true, comment: '预约ID' })
  booking_id?: string;

  @Column({ type: 'text', comment: '课程名称' })
  course_name: string;

  @Column({ type: 'text', comment: 'SKU名称' })
  sku_name: string;

  @Column({ type: 'integer', comment: '课程数量' })
  quantity: number;

  @Column({ type: 'integer', default: 0, comment: '总课时数（购买时从SKU获取）' })
  total_lessons: number;

  @Column({ type: 'integer', default: 0, comment: '已完成课时数（通过签到累计）' })
  completed_lessons: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: '原价' })
  original_price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: '实付金额' })
  paid_amount: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '优惠金额',
  })
  discount_amount: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '返现金额',
  })
  cashback_amount: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '线上支付金额（微信支付）',
  })
  online_pay_amount: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '线下支付金额（到店支付）',
  })
  offline_pay_amount: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '平台佣金金额',
  })
  commission_amount: number;

  @Column({ type: 'text', nullable: true, comment: '优惠券ID' })
  coupon_id?: string;

  @Column({
    type: 'text',
    default: 'pending',
    comment:
      '订单状态：pending-待支付, pending_confirm-待确认, confirmed-已确认, refund_pending-退款审批中, refunding-退款中, refund_rejected-退款被拒绝, refunded-已退款, cancelled-已取消, completed-已完成',
  })
  status:
    | 'pending'
    | 'pending_confirm'
    | 'confirmed'
    | 'refund_pending'
    | 'refunding'
    | 'refund_rejected'
    | 'refunded'
    | 'cancelled'
    | 'completed';

  @Column({
    type: 'text',
    default: 'offline',
    comment: '支付方式：offline-线下支付, wechat-微信支付, alipay-支付宝',
  })
  payment_method: 'offline' | 'wechat' | 'alipay';

  @Column({ type: 'text', nullable: true, comment: '支付交易号' })
  transaction_no?: string;

  @Column({ type: 'text', nullable: true, comment: '微信预支付订单号' })
  wechat_prepay_id?: string;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: '支付时间',
  })
  paid_at?: Date;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: '退款时间',
  })
  refunded_at?: Date;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: '取消时间',
  })
  cancelled_at?: Date;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: '完成时间',
  })
  completed_at?: Date;

  @Column({ type: 'text', nullable: true, comment: '学员姓名' })
  student_name?: string;

  @Column({ type: 'text', nullable: true, comment: '学员手机号' })
  student_phone?: string;

  @Column({ type: 'text', nullable: true, comment: '备注' })
  remark?: string;

  @Column({ type: 'text', nullable: true, comment: '退款原因' })
  refund_reason?: string;

  @Column({ type: 'text', nullable: true, comment: '退款单号（本系统生成）' })
  refund_no?: string;

  @Column({ type: 'text', nullable: true, comment: '微信退款单号（微信返回）' })
  wechat_refund_id?: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '线上退款金额（原路退回微信）',
  })
  online_refund_amount: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '线下退款金额（到店退回）',
  })
  offline_refund_amount: number;

  @Column({ type: 'text', nullable: true, comment: '退款状态：processing-退款中, success-退款成功, abnormal-退款异常, closed-退款关闭' })
  refund_status?: 'processing' | 'success' | 'abnormal' | 'closed';

  @Column({ type: 'text', nullable: true, comment: '使用的邀请码' })
  invite_code?: string;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: '下单时邀请码的让利比例快照（0-100），后续邀请订单结算以此为准，避免事后修改影响已有订单',
  })
  invite_share_ratio?: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '邀请码立减金额',
  })
  invite_discount_amount: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '余额抵扣金额',
  })
  use_balance_amount: number;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: '支付过期时间',
  })
  expire_at?: Date;

  // ========== 快照字段 ==========
  @Column({ type: 'jsonb', nullable: true, comment: '机构信息快照' })
  institution_snapshot?: {
    id: string;
    name: string;
    contact_phone?: string;
    address?: string;
    business_hours?: string;
    /** 下单时生效的佣金类型（percentage/fixed_amount），用于后续审计 */
    commission_type?: string;
    /** 下单时生效的佣金数值，用于后续审计 */
    commission_value?: number;
  };

  @Column({ type: 'jsonb', nullable: true, comment: '课程信息快照' })
  course_snapshot?: {
    id: string;
    title: string;
    subtitle?: string;
    type?: string; // trial-试听课, standard-正式课
    age_range_min?: number;
    age_range_max?: number;
    /** 单节课时长（分钟） */
    lesson_duration?: number;
    /** 下单时课程返现比例（%），与 cashback_amount 配套存储用于审计 */
    cashback_ratio?: number;
  };

  @Column({ type: 'jsonb', nullable: true, comment: 'SKU信息快照' })
  sku_snapshot?: {
    id: string;
    name: string;
    /** 下单时 SKU 类型快照（trial/standard），用于判断是否体验课 */
    type?: string;
    original_price: number;
    class_count: number;
    class_duration: number;
    cashback_type: string;
    cashback_value: number;
    /** 下单时 SKU 的退款政策快照，锁定购买时的约定，防止机构事后修改 */
    is_refundable?: boolean;
    /** 下单时课程有效期（天），锁定购买时的约定 */
    validity_days?: number;
  };

  @Column({ type: 'boolean', default: false, comment: '是否已评价' })
  is_reviewed: boolean;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: '申请退款时间（用于48h自动审批计时）',
  })
  refund_applied_at?: Date;
}
