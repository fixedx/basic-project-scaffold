import {
  IsNotEmpty,
  IsString,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsArray,
  MinLength,
} from 'class-validator';

/**
 * 创建评价 DTO
 */
export class CreateReviewDto {
  @IsNotEmpty({ message: '课程ID不能为空' })
  @IsString({ message: '课程ID必须是字符串' })
  course_id: string;

  @IsOptional()
  @IsString({ message: '订单ID必须是字符串' })
  order_id?: string;

  @IsNotEmpty({ message: '评分不能为空' })
  @IsInt({ message: '评分必须是整数' })
  @Min(1, { message: '评分最低为1分' })
  @Max(5, { message: '评分最高为5分' })
  rating: number;

  @IsNotEmpty({ message: '评价内容不能为空' })
  @IsString({ message: '评价内容必须是字符串' })
  @MinLength(10, { message: '评价内容不少于10字' })
  content: string;

  @IsOptional()
  @IsArray({ message: '图片必须是数组' })
  images?: string[];
}

/**
 * 回复评价 DTO
 */
export class ReplyReviewDto {
  @IsNotEmpty({ message: '回复内容不能为空' })
  @IsString({ message: '回复内容必须是字符串' })
  reply: string;
}

/**
 * 编辑回复 DTO（24h 内可修改）
 */
export class UpdateReplyDto {
  @IsNotEmpty({ message: '回复内容不能为空' })
  @IsString({ message: '回复内容必须是字符串' })
  reply: string;
}
