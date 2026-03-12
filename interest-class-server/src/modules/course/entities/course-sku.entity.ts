import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('course_skus')
export class CourseSkuEntity extends BaseEntity {
  @Column({ type: 'text', comment: '关联课程SPU ID' })
  course_id: string;

  @Column({ type: 'text', comment: '规格名称' })
  name: string;

  @Column({
    type: 'text',
    default: 'standard',
    comment: 'SKU类型: standard(正式课套餐), trial(体验课套餐)',
  })
  type: string;

  @Column({ type: 'integer', default: 0, comment: '总课时数' })
  total_lessons: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: '课程总价' })
  total_price: number;

  @Column({
    type: 'text',
    default: 'fixed',
    comment: '返现计算方式: percentage(比例), fixed(固定金额), none(无)',
  })
  cashback_type: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0.0,
    comment: '返现输入值',
  })
  cashback_value: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '线上应付金额(定金/全款)',
  })
  online_pay_price: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '线下应付金额(尾款)',
  })
  offline_pay_price: number;

  @Column({ type: 'integer', default: -1, comment: '库存: -1不限' })
  stock: number;

  @Column({
    type: 'integer',
    nullable: true,
    comment: '有效期天数（从购买或首次消课起算）',
  })
  validity_days: number;

  @Column({ type: 'boolean', default: true, comment: '是否可退款' })
  is_refundable: boolean;

  // ⚠️ course 不再作为关联，而是在应用层通过 course_id 手动关联
}
