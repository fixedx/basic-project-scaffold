import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsNumber,
} from 'class-validator';

/**
 * 签到 DTO
 */
export class CheckInDto {
  @IsNotEmpty({ message: '订单ID不能为空' })
  @IsString()
  order_id: string;

  @IsOptional()
  @IsString()
  booking_id?: string;

  @IsOptional()
  @IsString()
  schedule_id?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  remark?: string;
}

/**
 * 补卡 DTO
 */
export class MakeupCheckInDto {
  @IsNotEmpty({ message: '订单ID不能为空' })
  @IsString()
  order_id: string;

  @IsNotEmpty({ message: '补卡日期不能为空' })
  @IsDateString({}, { message: '补卡日期格式不正确' })
  makeup_date: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

/**
 * 查询签到记录 DTO
 */
export class QueryCheckInDto {
  @IsOptional()
  @IsString()
  order_id?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  pageSize?: number;
}
