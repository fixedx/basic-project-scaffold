import { Entity, Column, Unique } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/**
 * 收藏实体
 * 用于存储用户收藏的课程或机构
 */
@Entity('favorites')
@Unique(['user_id', 'target_type', 'target_id'])
export class FavoriteEntity extends BaseEntity {
  @Column({ type: 'text', comment: '用户ID' })
  user_id: string;

  @Column({
    type: 'text',
    comment: '收藏目标类型：course-课程, institution-机构',
  })
  target_type: string;

  @Column({ type: 'text', comment: '收藏目标ID（课程ID或机构ID）' })
  target_id: string;
}
