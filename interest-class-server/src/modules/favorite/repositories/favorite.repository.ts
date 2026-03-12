import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { UserContextService } from '@/common/services/user-context.service';
import { FavoriteEntity } from '../entities/favorite.entity';

@Injectable()
export class FavoriteRepository extends BaseRepository<FavoriteEntity> {
  constructor(
    private dataSource: DataSource,
    private userCtx: UserContextService,
  ) {
    super(FavoriteEntity, dataSource.createEntityManager());
    this.setUserContextService(userCtx);
  }

  /**
   * 查询用户的收藏列表（按类型）
   */
  async findByUserIdAndType(
    userId: string,
    targetType?: string,
  ): Promise<FavoriteEntity[]> {
    const qb = this.getQuery().andWhere('entity.user_id = :userId', {
      userId,
    });

    if (targetType) {
      qb.andWhere('entity.target_type = :targetType', { targetType });
    }

    return qb.orderBy('entity.created_at', 'DESC').getMany();
  }

  /**
   * 查询用户是否已收藏某目标（仅查询未删除的）
   */
  async findByUserAndTarget(
    userId: string,
    targetType: string,
    targetId: string,
  ): Promise<FavoriteEntity | null> {
    return this.getQuery()
      .andWhere('entity.user_id = :userId', { userId })
      .andWhere('entity.target_type = :targetType', { targetType })
      .andWhere('entity.target_id = :targetId', { targetId })
      .getOne();
  }

  /**
   * 查询用户收藏记录（包括已软删除的，用于 toggle 时检测唯一约束）
   */
  async findByUserAndTargetIncludeDeleted(
    userId: string,
    targetType: string,
    targetId: string,
  ): Promise<FavoriteEntity | null> {
    return this.createQueryBuilder('entity')
      .where('entity.user_id = :userId', { userId })
      .andWhere('entity.target_type = :targetType', { targetType })
      .andWhere('entity.target_id = :targetId', { targetId })
      .getOne();
  }

  /**
   * 批量检查收藏状态
   */
  async findByUserAndTargetIds(
    userId: string,
    targetType: string,
    targetIds: string[],
  ): Promise<FavoriteEntity[]> {
    if (!targetIds || targetIds.length === 0) return [];

    return this.getQuery()
      .andWhere('entity.user_id = :userId', { userId })
      .andWhere('entity.target_type = :targetType', { targetType })
      .andWhere('entity.target_id IN (:...targetIds)', { targetIds })
      .getMany();
  }

  /**
   * 统计用户收藏数量
   */
  async countByUserId(userId: string, targetType?: string): Promise<number> {
    const qb = this.getQuery().andWhere('entity.user_id = :userId', {
      userId,
    });

    if (targetType) {
      qb.andWhere('entity.target_type = :targetType', { targetType });
    }

    return qb.getCount();
  }
}
