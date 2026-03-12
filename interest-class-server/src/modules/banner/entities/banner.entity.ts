import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('banners')
export class BannerEntity extends BaseEntity {
  @Column({ type: 'text', comment: '标题' })
  title: string;

  @Column({ type: 'text', comment: '图片URL' })
  image: string;

  @Column({
    type: 'text',
    comment: '链接类型：course-课程, url-外部链接, none-无',
  })
  link_type: string;

  @Column({ type: 'text', nullable: true, comment: '链接目标（课程ID或URL）' })
  link_target?: string;

  @Column({ type: 'integer', default: 0, comment: '排序（数字越小越靠前）' })
  sort: number;

  @Column({ type: 'text', nullable: true, comment: '所属机构ID（平台级Banner可为空）' })
  institution_id?: string;

  @Column({
    type: 'text',
    default: 'active',
    comment: '状态：active-启用, inactive-停用',
  })
  status: string;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: '开始时间',
  })
  start_time?: Date;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: '结束时间',
  })
  end_time?: Date;
}
