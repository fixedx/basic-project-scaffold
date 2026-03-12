import { IsNotEmpty, IsString, IsIn, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 收藏/取消收藏 DTO（切换模式）
 */
export class ToggleFavoriteDto {
  @IsNotEmpty({ message: '收藏目标类型不能为空' })
  @IsString({ message: '收藏目标类型必须是字符串' })
  @IsIn(['course', 'institution'], {
    message: '收藏目标类型只能是 course 或 institution',
  })
  target_type: string;

  @IsNotEmpty({ message: '收藏目标ID不能为空' })
  @IsString({ message: '收藏目标ID必须是字符串' })
  target_id: string;
}

/**
 * 查询收藏列表 DTO
 */
export class QueryFavoriteDto {
  @IsOptional()
  @IsString({ message: '收藏目标类型必须是字符串' })
  @IsIn(['course', 'institution'], {
    message: '收藏目标类型只能是 course 或 institution',
  })
  target_type?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码最小为1' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页条数必须是整数' })
  @Min(1, { message: '每页条数最小为1' })
  pageSize?: number;
}

/**
 * 批量检查收藏状态 DTO
 */
export class CheckFavoritesDto {
  @IsNotEmpty({ message: '收藏目标类型不能为空' })
  @IsString({ message: '收藏目标类型必须是字符串' })
  @IsIn(['course', 'institution'], {
    message: '收藏目标类型只能是 course 或 institution',
  })
  target_type: string;

  @IsNotEmpty({ message: '目标ID列表不能为空' })
  @IsString({ each: true, message: '目标ID必须是字符串' })
  target_ids: string[];
}
