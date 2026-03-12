import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/**
 * 预约实体
 */
@Entity('bookings')
export class BookingEntity extends BaseEntity {
  @Column({ type: 'text', comment: '用户ID' })
  user_id: string;

  @Column({ type: 'text', comment: '机构ID' })
  institution_id: string;

  @Column({ type: 'text', comment: '课程ID' })
  course_id: string;

  @Column({ type: 'text', nullable: true, comment: '课程SKU ID' })
  sku_id?: string;

  @Column({ type: 'text', nullable: true, comment: '排课模板ID（关联原始排课）' })
  schedule_id?: string;

  // ======== 课程时间快照（从排课模板复制，订单生成后不受排课变更影响） ========

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: '上课开始时间（具体日期+时间）',
  })
  start_time?: Date;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: '上课结束时间（具体日期+时间）',
  })
  end_time?: Date;

  @Column({ type: 'text', nullable: true, comment: '星期几' })
  day_of_week?: string;

  @Column({ type: 'text', nullable: true, comment: '教师ID' })
  teacher_id?: string;

  @Column({ type: 'text', nullable: true, comment: '教室ID' })
  classroom_id?: string;

  @Column({ type: 'text', nullable: true, comment: '教师姓名（快照）' })
  teacher_name?: string;

  @Column({ type: 'text', nullable: true, comment: '教室名称（快照）' })
  classroom_name?: string;

  @Column({ type: 'text', nullable: true, comment: '宝贝ID' })
  child_id?: string;

  @Column({ type: 'text', comment: '预约人姓名' })
  student_name: string;

  @Column({ type: 'text', comment: '预约人手机号' })
  student_phone: string;

  @Column({ type: 'integer', nullable: true, comment: '学员年龄' })
  student_age?: number;

  @Column({
    type: 'text',
    default: 'pending',
    comment:
      '预约状态：pending-待确认, confirmed-已确认, rejected-已拒绝, cancelled-已取消, completed-已完成, pending_change-待审核修改, pending_cancel-取消待审核',
  })
  status:
    | 'pending'
    | 'confirmed'
    | 'rejected'
    | 'cancelled'
    | 'completed'
    | 'pending_change'
    | 'pending_cancel';

  @Column({
    type: 'text',
    nullable: true,
    comment: '待审核的新排课ID（24小时内修改需审核）',
  })
  pending_change_schedule_id?: string;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: '预约时间',
  })
  booking_time?: Date;

  @Column({ type: 'text', nullable: true, comment: '备注' })
  remark?: string;

  @Column({ type: 'text', nullable: true, comment: '拒绝/取消原因' })
  reason?: string;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: '确认时间',
  })
  confirmed_at?: Date;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: '拒绝时间',
  })
  rejected_at?: Date;

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
}
