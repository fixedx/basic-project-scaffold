import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('announcements')
export class AnnouncementEntity extends BaseEntity {
  @Column({ type: 'text', comment: '公告标题' })
  title: string;

  @Column({ type: 'text', comment: '公告内容' })
  content: string;

  @Column({
    type: 'text',
    default: 'notice',
    comment: '公告类型：notice-通知, update-更新, activity-活动',
  })
  type: string;

  @Column({
    type: 'text',
    default: 'active',
    comment: '状态：active-启用, inactive-停用',
  })
  status: string;

  @Column({ type: 'integer', default: 0, comment: '优先级（数字越大越靠前）' })
  priority: number;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: '生效开始时间',
  })
  start_time?: Date;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: '生效结束时间',
  })
  end_time?: Date;
}
