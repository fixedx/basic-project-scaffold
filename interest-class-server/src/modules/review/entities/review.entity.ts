import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/**
 * 评价实体
 */
@Entity('reviews')
export class ReviewEntity extends BaseEntity {
  @Column({ type: 'text', comment: '用户ID' })
  user_id: string;

  @Column({ type: 'text', comment: '机构ID' })
  institution_id: string;

  @Column({ type: 'text', comment: '课程ID' })
  course_id: string;

  @Column({ type: 'text', nullable: true, comment: '订单ID' })
  order_id?: string;

  @Column({ type: 'integer', comment: '评分(1-5分)' })
  rating: number;

  @Column({ type: 'text', comment: '评价内容' })
  content: string;

  @Column({ type: 'jsonb', nullable: true, comment: '评价图片' })
  images?: string[];

  @Column({ type: 'text', nullable: true, comment: '机构回复' })
  reply?: string;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: '回复时间',
  })
  replied_at?: Date;

  @Column({ type: 'boolean', default: true, comment: '是否显示' })
  is_visible: boolean;
}
