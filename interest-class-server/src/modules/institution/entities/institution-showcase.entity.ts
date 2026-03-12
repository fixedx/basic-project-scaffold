import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('institution_showcases')
export class InstitutionShowcaseEntity extends BaseEntity {
  @Column({ type: 'text', comment: '关联机构ID' })
  institution_id: string;

  @Column({ type: 'text', nullable: true, comment: '活动标题' })
  title?: string;

  @Column({ type: 'text', comment: '精彩瞬间图片URL' })
  img_url: string;

  @Column({
    type: 'text',
    default: 'student_work',
    comment: '枚举: student_work(学员作品), activity(活动剪影)',
  })
  type: string;

  @Column({ type: 'text', nullable: true, comment: '描述' })
  description?: string;

  @Column({ type: 'integer', default: 0, comment: '排序权重' })
  sort_order: number;
}
