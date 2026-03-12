import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('institution_teaching_environments')
export class InstitutionTeachingEnvEntity extends BaseEntity {
  @Column({ type: 'text', comment: '关联机构ID' })
  institution_id: string;

  @Column({ type: 'text', nullable: true, comment: '名称（如：舞蹈教室、钢琴房）' })
  title?: string;

  @Column({ type: 'text', comment: '教学环境图片URL' })
  img_url: string;

  @Column({ type: 'text', nullable: true, comment: '描述' })
  description?: string;

  @Column({ type: 'integer', default: 0, comment: '排序权重' })
  sort_order: number;
}
