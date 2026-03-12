import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/**
 * 签到记录实体
 * 用于记录家长端上课签到，每次签到扣除一个课时
 */
@Entity('check_ins')
export class CheckInEntity extends BaseEntity {
  @Column({ type: 'text', comment: '关联订单ID' })
  order_id: string;

  @Column({ type: 'text', comment: '签到用户ID' })
  user_id: string;

  @Column({ type: 'text', comment: '机构ID' })
  institution_id: string;

  @Column({ type: 'text', comment: '课程ID' })
  course_id: string;

  @Column({ type: 'text', nullable: true, comment: '关联预约ID' })
  booking_id?: string;

  @Column({ type: 'text', nullable: true, comment: '关联排课ID' })
  schedule_id?: string;

  @Column({ type: 'text', nullable: true, comment: '宝贝ID' })
  child_id?: string;

  @Column({
    type: 'timestamp with time zone',
    default: () => 'NOW()',
    comment: '签到时间',
  })
  check_in_time: Date;

  @Column({ type: 'boolean', default: false, comment: '是否为补卡' })
  is_makeup: boolean;

  @Column({ type: 'date', nullable: true, comment: '补卡日期（补的是哪天的课）' })
  makeup_date?: Date;

  @Column({ type: 'integer', comment: '第几节课（签到时的课时序号）' })
  lesson_no: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
    comment: '签到位置纬度',
  })
  latitude?: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
    comment: '签到位置经度',
  })
  longitude?: number;

  @Column({ type: 'text', nullable: true, comment: '备注' })
  remark?: string;
}
