import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('courses')
export class CourseEntity extends BaseEntity {
  @Column({ type: 'text', comment: '所属机构ID' })
  institution_id: string;

  @Column({ type: 'text', comment: '课程标题' })
  title: string;

  @Column({ type: 'text', nullable: true, comment: '副标题' })
  subtitle: string;

  @Column({
    type: 'text',
    comment: '课程类目代码（对应enums表course_category类型）',
  })
  category_code: string;

  @Column({ type: 'jsonb', nullable: true, default: '[]', comment: '轮播图数组' })
  slider_imgs: string[];

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: '课程标签代码数组（对应enums表course_tag类型）',
  })
  tags: string[];

  @Column({ type: 'text', nullable: true, comment: '富文本详情' })
  description: string;

  @Column({ type: 'integer', nullable: true, comment: '最小适用年龄（岁）' })
  min_age: number;

  @Column({ type: 'integer', nullable: true, comment: '最大适用年龄（岁）' })
  max_age: number;

  @Column({ type: 'integer', nullable: true, comment: '单节课时长（分钟）' })
  lesson_duration: number;

  @Column({
    type: 'text',
    default: 'standard',
    comment: '课程类型: standard(正式课), trial(试听课)',
  })
  type: string;

  @Column({ type: 'boolean', default: false, comment: '是否上架' })
  is_online: boolean;

  @Column({ type: 'integer', default: 0, comment: '销量' })
  sales_count: number;

  @Column({ type: 'integer', default: 0, comment: '排序' })
  sort_order: number;

  @Column({
    type: 'boolean',
    default: false,
    comment: '是否开启返现（邀友让利营销功能）',
  })
  cashback_enabled: boolean;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 10.0,
    comment: '返现比例（3-15%），默认10%',
  })
  cashback_ratio: number;

  // ⚠️ skus 不再作为关联，而是在应用层手动查询和组装
  // 使用时需要通过 CourseSkuRepository 手动查询
  skus?: any[];
}
