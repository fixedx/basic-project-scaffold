import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('schedules')
export class ScheduleEntity extends BaseEntity {
  @Column({ type: 'text', comment: '课程ID' })
  course_id: string;

  @Column({ type: 'text', comment: '教师ID' })
  teacher_id: string;

  @Column({ type: 'text', comment: '教室ID' })
  classroom_id: string;

  @Column({ type: 'text', comment: '机构ID' })
  institution_id: string;

  @Column({ type: 'timestamp with time zone', comment: '开始时间' })
  start_time: Date;

  @Column({ type: 'timestamp with time zone', comment: '结束时间' })
  end_time: Date;

  @Column({ type: 'text', comment: '星期几(1-7，1表示周一)' })
  day_of_week: string;

  @Column({ type: 'integer', default: 0, comment: '已预约人数' })
  booked_count: number;

  @Column({ type: 'integer', comment: '最大容纳人数' })
  max_students: number;

  @Column({ 
    type: 'text', 
    default: 'scheduled', 
    comment: '排课状态(scheduled-已排课, in_progress-进行中, completed-已完成, cancelled-已取消)' 
  })
  status: string;

  @Column({ type: 'text', nullable: true, comment: '备注' })
  notes?: string;

  // ⚠️ 关联数据在应用层手动加载（不使用 ORM 关联）
  course?: any;
  teacher?: any;
  classroom?: any;
}
