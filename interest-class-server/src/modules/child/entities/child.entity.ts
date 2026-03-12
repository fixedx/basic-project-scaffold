import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/**
 * 宝贝（孩子）实体
 * 用于存储家长的孩子信息，预约时可直接选择
 */
@Entity('children')
export class ChildEntity extends BaseEntity {
  @Column({ type: 'text', comment: '所属用户ID' })
  user_id: string;

  @Column({ type: 'text', comment: '宝贝姓名' })
  name: string;

  @Column({ type: 'text', nullable: true, comment: '宝贝头像' })
  avatar?: string;

  @Column({ type: 'text', nullable: true, comment: '性别：male-男, female-女' })
  gender?: string;

  @Column({ type: 'date', nullable: true, comment: '出生日期' })
  birthday?: Date;

  @Column({ type: 'integer', nullable: true, comment: '年龄（冗余字段，可由生日计算）' })
  age?: number;

  @Column({ type: 'text', nullable: true, comment: '联系电话' })
  phone?: string;

  @Column({ type: 'text', array: true, nullable: true, comment: '兴趣爱好标签' })
  interests?: string[];

  @Column({ type: 'text', nullable: true, comment: '备注' })
  remark?: string;

  @Column({ type: 'integer', default: 0, comment: '排序' })
  sort_order: number;
}
