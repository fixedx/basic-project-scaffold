import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/**
 * 课程类目表
 */
@Entity('categories')
export class CategoryEntity extends BaseEntity {
  @Column({ type: 'text', comment: '类目名称' })
  name: string;

  @Column({ type: 'text', nullable: true, comment: '父类目ID' })
  @Index()
  parent_id: string;

  @Column({ type: 'integer', default: 0, comment: '排序值，越大越靠前' })
  sort_order: number;

  @Column({ type: 'text', nullable: true, comment: '图标URL' })
  icon: string;

  @Column({ type: 'text', nullable: true, comment: '描述' })
  description: string;
}
