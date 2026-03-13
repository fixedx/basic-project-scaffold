import { Entity, Column, Unique } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/**
 * 平台全局配置表
 * 存储管理员可配置的运营参数（如邀请码日限、提现门槛等）
 */
@Entity('platform_configs')
@Unique('ux_platform_configs_key', ['config_key'])
export class PlatformConfigEntity extends BaseEntity {
  @Column({ type: 'text', comment: '配置键（唯一）' })
  config_key: string;

  @Column({ type: 'text', comment: '配置值' })
  config_value: string;

  @Column({ type: 'text', nullable: true, comment: '配置描述' })
  description?: string;
}
