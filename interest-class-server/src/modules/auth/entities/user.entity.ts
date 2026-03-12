import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/**
 * 用户实体
 * 存储用户基本信息（包括家长用户和机构用户）
 */
@Entity('users')
@Index(['username'], { unique: true, where: 'username IS NOT NULL' })
export class UserEntity extends BaseEntity {
  @Column({ type: 'text', unique: true, comment: '微信 openid 或唯一标识' })
  @Index()
  openid: string;

  @Column({
    type: 'text',
    nullable: true,
    unique: true,
    comment: '登录用户名（机构用户使用）',
  })
  username?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: '登录密码（加密存储，机构用户使用）',
  })
  password?: string;

  @Column({ type: 'text', nullable: true, comment: '微信 unionid' })
  @Index()
  unionid?: string;

  @Column({ type: 'text', nullable: true, comment: '微信 session_key' })
  sessionKey?: string;

  @Column({ type: 'text', comment: '用户昵称' })
  nickname: string;

  @Column({ type: 'text', nullable: true, comment: '用户头像' })
  avatar?: string;

  @Column({ type: 'text', nullable: true, comment: '性别 0-未知 1-男 2-女' })
  gender?: string;

  @Column({ type: 'text', nullable: true, comment: '国家' })
  country?: string;

  @Column({ type: 'text', nullable: true, comment: '省份' })
  province?: string;

  @Column({ type: 'text', nullable: true, comment: '城市' })
  city?: string;

  @Column({ type: 'text', nullable: true, comment: '手机号' })
  phone?: string;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: '最后登录时间',
  })
  lastLoginAt?: Date;
}
