import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { UserContextService } from '@/common/services/user-context.service';
import { UserBalanceEntity } from '../entities/user-balance.entity';
import { generateSnowflakeId } from '@/utils/snowflake.util';

@Injectable()
export class UserBalanceRepository extends BaseRepository<UserBalanceEntity> {
  constructor(
    private dataSource: DataSource,
    private userCtx: UserContextService,
  ) {
    super(UserBalanceEntity, dataSource.createEntityManager());
    this.setUserContextService(userCtx);
  }

  /**
   * 根据用户ID查询余额
   */
  async findByUserId(userId: string): Promise<UserBalanceEntity | null> {
    return this.getQuery()
      .andWhere('entity.user_id = :userId', { userId })
      .getOne();
  }

  /**
   * 获取或创建用户余额记录
   * ⚠️ 使用 INSERT ON CONFLICT DO NOTHING 保证原子性
   * 防止并发首次创建时因读-写竞态产生重复记录
   * 依赖迁移 add-user-balances-unique-constraint.sql 创建的部分唯一索引
   */
  async getOrCreate(userId: string): Promise<UserBalanceEntity> {
    // 原子 upsert：INSERT … ON CONFLICT DO NOTHING
    // 若记录已存在（并发或重复调用），该语句静默忽略，不抛错
    await this.dataSource.query(
      `INSERT INTO user_balances
         (id, user_id, balance, frozen_balance,
          total_earned, total_withdrawn, total_used,
          is_active, is_delete,
          created_by, updated_by, created_at, updated_at)
       VALUES ($1, $2, 0, 0, 0, 0, 0, true, false, $2, $2, NOW(), NOW())
       ON CONFLICT (user_id) WHERE is_delete = false DO NOTHING`,
      [generateSnowflakeId(), userId],
    );
    return this.findByUserId(userId) as Promise<UserBalanceEntity>;
  }

  /**
   * 增加余额（返现解锁）
   * ⚠️ 使用原子 SQL 防止并发竞态：多路并发（退款归还+返现解锁+补偿任务）可能同时触发
   * 单条 UPDATE...SET balance = balance + $1 确保原子性，杜绝先读后写的丢失更新问题
   */
  async addBalance(userId: string, amount: number): Promise<UserBalanceEntity> {
    // 先确保余额记录存在
    await this.getOrCreate(userId);
    // 原子加操作：不存在 WHERE 条件失败问题，直接累加
    await this.dataSource.query(
      `UPDATE user_balances
       SET balance = balance + $1, total_earned = total_earned + $1
       WHERE user_id = $2 AND is_delete = false`,
      [amount, userId],
    );
    return this.findByUserId(userId) as Promise<UserBalanceEntity>;
  }

  /**
   * 冻结余额（提现申请）
   * ⚠️ 使用原子 SQL 防止并发竞态：先读后写两步操作存在超额提现风险
   * 单条 UPDATE...WHERE balance >= amount 确保原子性
   */
  async freezeBalance(
    userId: string,
    amount: number,
  ): Promise<UserBalanceEntity> {
    // 先确保记录存在
    await this.getOrCreate(userId);
    // 原子扣减：WHERE 条件不满足时不更新任何行
    const result = await this.dataSource.query(
      `UPDATE user_balances
       SET balance = balance - $1, frozen_balance = frozen_balance + $1
       WHERE user_id = $2 AND balance >= $1 AND is_delete = false
       RETURNING id`,
      [amount, userId],
    );
    if (!result || result.length === 0) {
      throw new Error('余额不足，无法冻结');
    }
    return this.findByUserId(userId) as Promise<UserBalanceEntity>;
  }

  /**
   * 解冻余额（提现失败）
   */
  async unfreezeBalance(
    userId: string,
    amount: number,
  ): Promise<UserBalanceEntity> {
    await this.dataSource.query(
      `UPDATE user_balances
       SET balance = balance + $1, frozen_balance = GREATEST(frozen_balance - $1, 0)
       WHERE user_id = $2 AND is_delete = false`,
      [amount, userId],
    );
    return this.findByUserId(userId) as Promise<UserBalanceEntity>;
  }

  /**
   * 完成提现（从冻结余额扣除）
   */
  async completeWithdraw(
    userId: string,
    amount: number,
  ): Promise<UserBalanceEntity> {
    await this.dataSource.query(
      `UPDATE user_balances
       SET frozen_balance = GREATEST(frozen_balance - $1, 0),
           total_withdrawn = total_withdrawn + $1
       WHERE user_id = $2 AND is_delete = false`,
      [amount, userId],
    );
    return this.findByUserId(userId) as Promise<UserBalanceEntity>;
  }

  /**
   * 扣除余额（抵扣使用）—— 原子操作，防止并发超扣
   */
  async deductBalance(
    userId: string,
    amount: number,
  ): Promise<UserBalanceEntity> {
    const result = await this.dataSource.query(
      `UPDATE user_balances
       SET balance = balance - $1, total_used = total_used + $1
       WHERE user_id = $2 AND balance >= $1 AND is_delete = false
       RETURNING id`,
      [amount, userId],
    );
    if (!result || result.length === 0) {
      throw new Error('余额不足');
    }
    return this.findByUserId(userId) as Promise<UserBalanceEntity>;
  }
}
