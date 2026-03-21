import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 设置让利比例 DTO
 */
export class SetShareRatioDto {
  @IsNotEmpty({ message: '让利比例不能为空' })
  @IsInt({ message: '让利比例必须是整数' })
  @Min(0, { message: '让利比例最小为0' })
  @Max(100, { message: '让利比例最大为100' })
  @Type(() => Number)
  share_ratio: number;
}

/**
 * 验证邀请码 DTO
 */
export class ValidateInviteCodeDto {
  @IsNotEmpty({ message: '邀请码不能为空' })
  @IsString({ message: '邀请码必须是字符串' })
  invite_code: string;

  @IsNotEmpty({ message: '课程ID不能为空' })
  @IsString({ message: '课程ID必须是字符串' })
  course_id: string;
}

/**
 * 计算立减金额 DTO
 */
export class CalculateDiscountDto {
  @IsNotEmpty({ message: '邀请码不能为空' })
  @IsString({ message: '邀请码必须是字符串' })
  invite_code: string;

  @IsNotEmpty({ message: '课程ID不能为空' })
  @IsString({ message: '课程ID必须是字符串' })
  course_id: string;

  @IsNotEmpty({ message: '订单金额不能为空' })
  @Type(() => Number)
  order_amount: number;

  @IsNotEmpty({ message: '订单ID不能为空' })
  @IsString({ message: '订单ID必须是字符串' })
  order_id: string;
}

/**
 * 查询邀请订单列表 DTO
 */
export class QueryInviteOrdersDto {
  @IsOptional()
  @IsString()
  status?: 'pending' | 'unlocking' | 'completed' | 'cancelled';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}

/**
 * 提现申请 DTO
 */
export class ApplyWithdrawDto {
  @IsNotEmpty({ message: '提现金额不能为空' })
  @Type(() => Number)
  @Min(50, { message: '提现金额最低50元' })
  amount: number;
}

/**
 * 审核提现 DTO
 */
export class ReviewWithdrawDto {
  @IsNotEmpty({ message: '审核状态不能为空' })
  @IsString()
  action: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  reject_reason?: string;
}

/**
 * 余额抵扣 DTO
 */
export class DeductBalanceDto {
  @IsNotEmpty({ message: '抵扣金额不能为空' })
  @Type(() => Number)
  @Min(0.01, { message: '抵扣金额最小为0.01' })
  amount: number;

  @IsOptional()
  @IsString()
  order_id?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}
