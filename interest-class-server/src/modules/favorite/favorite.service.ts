import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Transactional } from '@/common/decorators/transaction.decorator';
import { UserContextService } from '@/common/services/user-context.service';
import { FavoriteRepository } from './repositories/favorite.repository';
import { ToggleFavoriteDto, QueryFavoriteDto } from './dto/favorite.dto';

@Injectable()
export class FavoriteService {
  constructor(
    private favoriteRepository: FavoriteRepository,
    private userContextService: UserContextService,
    private dataSource: DataSource,
  ) {}

  /**
   * 切换收藏状态（已收藏则取消，未收藏则添加）
   * @returns { isFavorited: boolean } - 操作后的收藏状态
   */
  @Transactional()
  async toggle(
    dto: ToggleFavoriteDto,
  ): Promise<{ isFavorited: boolean }> {
    const userId = this.userContextService.getCurrentUserId();

    // 查询是否已收藏（包括已软删除的，避免唯一约束冲突）
    const existing =
      await this.favoriteRepository.findByUserAndTargetIncludeDeleted(
        userId,
        dto.target_type,
        dto.target_id,
      );

    if (existing) {
      if (existing.is_delete) {
        // 已软删除 → 恢复收藏
        await this.favoriteRepository.restoreById(existing.id);
        return { isFavorited: true };
      } else {
        // 未删除 → 取消收藏（软删除）
        await this.favoriteRepository.softRemoveById(existing.id);
        return { isFavorited: false };
      }
    } else {
      // 全新收藏 → 添加
      const favorite = this.favoriteRepository.create({
        user_id: userId,
        target_type: dto.target_type,
        target_id: dto.target_id,
      });
      await this.favoriteRepository.save(favorite);
      return { isFavorited: true };
    }
  }

  /**
   * 查询我的收藏列表
   */
  async findMyFavorites(query: QueryFavoriteDto) {
    const userId = this.userContextService.getCurrentUserId();

    const favorites = await this.favoriteRepository.findByUserIdAndType(
      userId,
      query.target_type,
    );

    // 分页兼容模式
    if (query.page && query.pageSize) {
      const total = favorites.length;
      const start = (query.page - 1) * query.pageSize;
      const data = favorites.slice(start, start + query.pageSize);
      return {
        data,
        total,
        page: query.page,
        pageSize: query.pageSize,
        totalPages: Math.ceil(total / query.pageSize),
      };
    }

    return favorites;
  }

  /**
   * 检查单个目标的收藏状态
   */
  async checkFavorite(
    targetType: string,
    targetId: string,
  ): Promise<{ isFavorited: boolean }> {
    const userId = this.userContextService.getCurrentUserId();

    const existing = await this.favoriteRepository.findByUserAndTarget(
      userId,
      targetType,
      targetId,
    );

    return { isFavorited: !!existing };
  }

  /**
   * 批量检查收藏状态
   */
  async checkFavorites(
    targetType: string,
    targetIds: string[],
  ): Promise<Record<string, boolean>> {
    const userId = this.userContextService.getCurrentUserId();

    const favorites = await this.favoriteRepository.findByUserAndTargetIds(
      userId,
      targetType,
      targetIds,
    );

    const favoritedIds = new Set(favorites.map((f) => f.target_id));
    const result: Record<string, boolean> = {};
    for (const id of targetIds) {
      result[id] = favoritedIds.has(id);
    }

    return result;
  }

  /**
   * 获取收藏数量
   */
  async getCount(targetType?: string): Promise<number> {
    const userId = this.userContextService.getCurrentUserId();
    return this.favoriteRepository.countByUserId(userId, targetType);
  }
}
