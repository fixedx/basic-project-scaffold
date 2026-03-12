import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('classrooms')
export class ClassroomEntity extends BaseEntity {
  @Column({ type: 'text', comment: '所属机构ID' })
  institution_id: string;

  @Column({ type: 'text', comment: '教室名称' })
  name: string;

  @Column({ type: 'integer', default: 0, comment: '容纳人数' })
  capacity: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    comment: '面积（平方米）',
  })
  area: number;

  @Column({ type: 'text', nullable: true, comment: '楼层' })
  floor: string;

  @Column({ type: 'jsonb', nullable: true, comment: '设施设备数组' })
  facilities: string[];

  @Column({
    type: 'text',
    default: 'available',
    comment: '状态: available(可用), maintenance(维护中), disabled(已停用)',
  })
  status: string;

  @Column({ type: 'integer', default: 0, comment: '排序' })
  sort_order: number;

  @Column({ type: 'text', nullable: true, comment: '备注说明' })
  description: string;
}
