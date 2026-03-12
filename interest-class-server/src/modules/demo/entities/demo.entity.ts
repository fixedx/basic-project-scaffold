import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/**
 * Demo 实体
 * 展示所有字段类型的使用：text, timestamp with time zone, jsonb
 */
@Entity('demo')
export class DemoEntity extends BaseEntity {
  @Column({ type: 'text', comment: '名称' })
  name: string;

  @Column({ type: 'text', nullable: true, comment: '描述' })
  description: string;

  @Column({ type: 'text', nullable: true, comment: '状态' })
  status: string;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: '开始时间',
  })
  start_time: Date;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: '结束时间',
  })
  end_time: Date;

  @Column({ type: 'jsonb', nullable: true, comment: '配置信息（JSONB 类型）' })
  config: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true, comment: '扩展数据（JSONB 类型）' })
  extra_data: Record<string, any>;

  @Column({ type: 'text', array: true, nullable: true, comment: '标签数组' })
  tags: string[];
}
