import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/**
 * 枚举表 - 统一管理所有枚举类型数据
 *
 * 支持的枚举类型：
 * - course_type: 课程类型（standard-正式课, trial-试听课）
 * - institution_category: 机构类目（art-艺术类, sports-体育类, academic-学科类等）
 * - audit_status: 审核状态（pending-待审核, approved-已通过, rejected-已拒绝）
 * - cashback_type: 返现类型（percentage-比例, fixed-固定, none-无）
 */
@Entity('enums')
@Index(['type', 'code'], { unique: true })
export class EnumEntity extends BaseEntity {
  @Column({ type: 'text', comment: '枚举类型' })
  @Index()
  type: string;

  @Column({ type: 'text', comment: '枚举代码' })
  code: string;

  @Column({ type: 'text', comment: '显示名称' })
  label: string;

  @Column({ type: 'text', nullable: true, comment: '描述' })
  description: string;

  @Column({ type: 'integer', default: 0, comment: '排序值，越大越靠前' })
  sort_order: number;

  @Column({ type: 'text', nullable: true, comment: '图标URL或图标名称' })
  icon: string;

  @Column({ type: 'jsonb', nullable: true, comment: '扩展数据' })
  extra: Record<string, any>;
}
