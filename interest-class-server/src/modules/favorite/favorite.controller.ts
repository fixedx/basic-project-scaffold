import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { FavoriteService } from './favorite.service';
import { ToggleFavoriteDto, QueryFavoriteDto } from './dto/favorite.dto';

@Controller('favorite')
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  /**
   * 切换收藏状态（收藏/取消收藏）
   */
  @Post('toggle')
  async toggle(
    @Body() dto: ToggleFavoriteDto,
  ): Promise<{ isFavorited: boolean }> {
    return this.favoriteService.toggle(dto);
  }

  /**
   * 查询我的收藏列表
   */
  @Get('my')
  async findMyFavorites(@Query() query: QueryFavoriteDto) {
    return this.favoriteService.findMyFavorites(query);
  }

  /**
   * 检查单个目标的收藏状态
   */
  @Get('check/:targetType/:targetId')
  async checkFavorite(
    @Param('targetType') targetType: string,
    @Param('targetId') targetId: string,
  ): Promise<{ isFavorited: boolean }> {
    return this.favoriteService.checkFavorite(targetType, targetId);
  }

  /**
   * 批量检查收藏状态
   */
  @Post('check-batch')
  async checkFavorites(
    @Body() body: { target_type: string; target_ids: string[] },
  ): Promise<Record<string, boolean>> {
    return this.favoriteService.checkFavorites(
      body.target_type,
      body.target_ids,
    );
  }

  /**
   * 获取收藏数量
   */
  @Get('count')
  async getCount(
    @Query('target_type') targetType?: string,
  ): Promise<number> {
    return this.favoriteService.getCount(targetType);
  }
}
