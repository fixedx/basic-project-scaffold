import {
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { generateSnowflakeId } from '@/utils/snowflake.util';

/**
 * 基础实体类
 * 所有实体都应该继承此类
 */
export abstract class BaseEntity {
  @PrimaryColumn({ type: 'text', comment: '主键ID' })
  id: string;

  @Column({ type: 'boolean', default: true, comment: '是否激活' })
  is_active: boolean;

  @Column({ type: 'text', nullable: true, comment: '创建人ID' })
  created_by: string;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    comment: '创建时间',
  })
  created_at: Date;

  @Column({ type: 'text', nullable: true, comment: '更新人ID' })
  updated_by: string;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    comment: '更新时间',
  })
  updated_at: Date;

  @Column({ type: 'boolean', default: false, comment: '是否删除（软删除）' })
  is_delete: boolean;

  /**
   * 插入前钩子
   * 自动生成雪花ID
   */
  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = generateSnowflakeId();
    }

    // 设置默认值
    if (this.is_active === undefined) {
      this.is_active = true;
    }

    if (this.is_delete === undefined) {
      this.is_delete = false;
    }
  }

  /**
   * 更新前钩子
   * 可以在这里添加额外的逻辑
   */
  @BeforeUpdate()
  updateTimestamp() {
    // TypeORM 会自动更新 updated_at，这里可以添加额外逻辑
  }
}
