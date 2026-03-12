import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('institution_honors')
export class InstitutionHonorEntity extends BaseEntity {
  @Column({ type: 'text', comment: '关联机构ID' })
  institution_id: string;

  @Column({ type: 'text', comment: '荣誉名称' })
  title: string;

  @Column({ type: 'text', comment: '证书图片URL' })
  img_url: string;

  @Column({ type: 'date', nullable: true, comment: '获奖时间' })
  honor_date?: Date;

  @Column({ type: 'integer', default: 0, comment: '排序权重' })
  sort_order: number;
}
