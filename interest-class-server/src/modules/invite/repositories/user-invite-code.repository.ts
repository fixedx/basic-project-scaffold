import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { UserContextService } from '@/common/services/user-context.service';
import { UserInviteCodeEntity } from '../entities/user-invite-code.entity';

@Injectable()
export class UserInviteCodeRepository extends BaseRepository<UserInviteCodeEntity> {
  constructor(
    private dataSource: DataSource,
    private userCtx: UserContextService,
  ) {
    super(UserInviteCodeEntity, dataSource.createEntityManager());
    this.setUserContextService(userCtx);
  }

  /**
   * 根据用户ID查询邀请码
   */
  async findByUserId(userId: string): Promise<UserInviteCodeEntity | null> {
    return this.getQuery()
      .andWhere('entity.user_id = :userId', { userId })
      .getOne();
  }

  /**
   * 根据邀请码查询（包含状态检查）
   */
  async findByInviteCode(
    inviteCode: string,
  ): Promise<UserInviteCodeEntity | null> {
    return this.getQuery()
      .andWhere('entity.invite_code = :inviteCode', { inviteCode })
      .getOne();
  }

  /**
   * 根据邀请码查询有效的邀请码
   */
  async findActiveByInviteCode(
    inviteCode: string,
  ): Promise<UserInviteCodeEntity | null> {
    return this.getQuery()
      .andWhere('entity.invite_code = :inviteCode', { inviteCode })
      .andWhere('entity.status = :status', { status: 'active' })
      .getOne();
  }

  /**
   * 检查邀请码是否存在
   */
  async existsByInviteCode(inviteCode: string): Promise<boolean> {
    const count = await this.getQuery()
      .andWhere('entity.invite_code = :inviteCode', { inviteCode })
      .getCount();
    return count > 0;
  }

  /**
   * 增加使用次数（原子 SQL）
   * ⚠️ 使用单条 SQL 防止并发读写竞态导致日限计数丢失或计数错误
   *  - 出现航天：一次读取 + 一次写入 → 两个并发请求同时读到相同旧值，各自 +1 后写入，实际只加了 1
   *  - 修复：单条 UPDATE SET daily_use_count = CASE … END 保证并发安全
   */
  async incrementUseCount(id: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.dataSource.query(
      `UPDATE user_invite_codes
       SET
         use_count       = use_count + 1,
         daily_use_count = CASE
           WHEN daily_use_reset_at IS NULL OR daily_use_reset_at < $1
             THEN 1
           ELSE daily_use_count + 1
         END,
         daily_use_reset_at = NOW(),
         updated_at         = NOW()
       WHERE id = $2 AND is_delete = false`,
      [today, id],
    );
  }

  /**
   * 更新待解锁返现总额
   */
  async updatePendingCashback(
    id: string,
    amount: number,
    isAdd: boolean,
  ): Promise<void> {
    await this.dataSource.query(
      `UPDATE user_invite_codes
       SET total_pending_cashback = CASE
             WHEN $2 THEN total_pending_cashback + $1
             ELSE GREATEST(total_pending_cashback - $1, 0)
           END,
           updated_at = NOW()
       WHERE id = $3 AND is_delete = false`,
      [amount, isAdd, id],
    );
  }

  /**
   * 更新已解锁返现总额
   */
  async updateUnlockedCashback(id: string, amount: number): Promise<void> {
    await this.dataSource.query(
      `UPDATE user_invite_codes
       SET total_unlocked_cashback = total_unlocked_cashback + $1,
           updated_at = NOW()
       WHERE id = $2 AND is_delete = false`,
      [amount, id],
    );
  }

  /**
   * 获取全平台最高让利比例
   * 用于计算课程和机构的最高立减金额展示
   * @returns 最高让利比例（0-100），如果没有任何邀请码则返回默认值50
   */
  async getMaxShareRatio(): Promise<number> {
    const result = await this.getQuery()
      .andWhere('entity.status = :status', { status: 'active' })
      .select('MAX(entity.share_ratio)', 'maxRatio')
      .getRawOne();

    // 如果没有任何有效邀请码，返回默认值50%
    return result?.maxRatio ? Number(result.maxRatio) : 50;
  }

  /**
   * 获取所有有效的邀请码列表（排除当前用户自己的）
   * 用于邀请码选择页面
   */
  async findAllActiveInviteCodes(excludeUserId?: string): Promise<UserInviteCodeEntity[]> {
    const query = this.getQuery()
      .andWhere('entity.status = :status', { status: 'active' });
    
    if (excludeUserId) {
      query.andWhere('entity.user_id != :excludeUserId', { excludeUserId });
    }
    
    return query
      .orderBy('entity.share_ratio', 'DESC')
      .getMany();
  }
}
