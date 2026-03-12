import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('feedbacks')
export class FeedbackEntity extends BaseEntity {
  @Column({ type: 'text', comment: '反馈内容' })
  content: string;

  @Column({ type: 'text', default: 'suggestion', comment: '反馈类型: suggestion-建议, bug-Bug反馈, other-其他' })
  type: string;

  @Column({ type: 'text', default: 'pending', comment: '处理状态: pending-待处理, processing-处理中, resolved-已解决, closed-已关闭' })
  status: string;

  @Column({ type: 'text', nullable: true, comment: '联系方式' })
  contact?: string;

  @Column({ type: 'text', nullable: true, comment: '反馈来源页面' })
  page_source?: string;

  @Column({ type: 'text', nullable: true, comment: '管理员回复内容' })
  reply?: string;

  @Column({ type: 'timestamp with time zone', nullable: true, comment: '回复时间' })
  replied_at?: Date;

  @Column({ type: 'text', nullable: true, comment: '回复人ID' })
  replied_by?: string;

  @Column({ type: 'text', nullable: true, comment: '用户昵称（快照）' })
  user_nickname?: string;

  @Column({ type: 'text', nullable: true, comment: '用户手机号（快照）' })
  user_phone?: string;
}
