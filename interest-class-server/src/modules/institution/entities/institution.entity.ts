import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('institutions')
export class InstitutionEntity extends BaseEntity {
  // 基础展示信息
  @Column({ type: 'text', comment: '机构名称' })
  name: string;

  @Column({ type: 'text', nullable: true, comment: '机构Logo URL' })
  logo?: string;

  @Column({ type: 'text', nullable: true, comment: '机构简介(富文本)' })
  introduction?: string;

  @Column({ type: 'text', nullable: true, comment: '标签(逗号分隔)' })
  tags?: string;

  // 位置信息
  @Column({ type: 'text', nullable: true, comment: '省份' })
  province?: string;

  @Column({ type: 'text', nullable: true, comment: '城市' })
  city?: string;

  @Column({ type: 'text', nullable: true, comment: '区县' })
  district?: string;

  @Column({ type: 'text', nullable: true, comment: '详细地址' })
  address?: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 6,
    nullable: true,
    comment: '纬度',
  })
  latitude?: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 6,
    nullable: true,
    comment: '经度',
  })
  longitude?: number;

  // PostGIS 地理位置列（用于空间索引和距离查询）
  // 该列由数据库触发器自动同步，不需要手动维护
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
    comment: 'PostGIS 地理位置点（由触发器自动同步）',
    select: false, // 默认不查询此列，避免序列化问题
  })
  location?: any;

  @Column({ type: 'text', nullable: true, comment: '客服电话' })
  contact_phone?: string;

  // 资质认证信息
  @Column({
    type: 'text',
    nullable: true,
    comment: '统一社会信用代码',
  })
  license_no?: string;

  @Column({ type: 'text', nullable: true, comment: '营业执照URL' })
  license_img?: string;

  @Column({ type: 'text', nullable: true, comment: '法人姓名' })
  legal_person?: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: '法人身份证正反面',
  })
  id_card_imgs?: {
    front: string;
    back: string;
  };

  // 财务结算信息
  @Column({ type: 'text', nullable: true, comment: '开户行' })
  bank_name?: string;

  @Column({ type: 'text', nullable: true, comment: '银行账号' })
  bank_account?: string;

  @Column({ type: 'text', nullable: true, comment: '开户名称' })
  account_holder?: string;

  // 平台配置
  @Column({
    type: 'text',
    default: 'draft',
    comment: '审核状态: draft, pending, contract_signing, contract_review, approved, rejected, frozen',
  })
  audit_status: string;

  @Column({ type: 'text', nullable: true, comment: '驳回原因' })
  reject_reason?: string;

  // 签约相关
  @Column({ type: 'text', nullable: true, comment: '签约凭证截图URL' })
  contract_screenshot?: string;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: '签约时间',
  })
  contract_signed_at?: Date;

  // 佣金配置
  @Column({
    type: 'text',
    default: 'percentage',
    comment: '佣金类型: percentage, fixed_amount',
  })
  commission_type: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0.1,
    comment: '佣金数值',
  })
  commission_value: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0.0,
    comment: '账户余额',
  })
  balance: number;

  // 经营类目（多选）
  @Column({
    type: 'jsonb',
    nullable: true,
    comment: '经营类目ID数组',
  })
  category_ids?: string[];

  // 评价统计
  @Column({
    type: 'decimal',
    precision: 3,
    scale: 1,
    default: 4.0,
    comment: '平均评分（默认4.0）',
  })
  avg_rating: number;

  @Column({
    type: 'integer',
    default: 0,
    comment: '评价数量',
  })
  review_count: number;
}
