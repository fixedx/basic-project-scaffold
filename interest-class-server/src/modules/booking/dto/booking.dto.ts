import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  IsDateString,
  IsArray,
  ArrayMinSize,
} from 'class-validator';

/**
 * 创建预约 DTO
 */
export class CreateBookingDto {
  @IsNotEmpty({ message: '课程ID不能为空' })
  @IsString({ message: '课程ID必须是字符串' })
  course_id: string;

  @IsOptional()
  @IsString({ message: 'SKU ID必须是字符串' })
  sku_id?: string;

  @IsOptional()
  @IsString({ message: '排课ID必须是字符串' })
  schedule_id?: string;

  @IsOptional()
  @IsArray({ message: '排课ID列表必须是数组' })
  @IsString({ each: true, message: '排课ID必须是字符串' })
  @ArrayMinSize(1, { message: '至少选择一个排课时段' })
  schedule_ids?: string[];

  @IsOptional()
  @IsString({ message: '宝贝ID必须是字符串' })
  child_id?: string;

  @IsNotEmpty({ message: '学员姓名不能为空' })
  @IsString({ message: '学员姓名必须是字符串' })
  student_name: string;

  @IsOptional()
  @IsString({ message: '学员手机号必须是字符串' })
  student_phone?: string;

  @IsOptional()
  @IsInt({ message: '学员年龄必须是整数' })
  student_age?: number;

  @IsOptional()
  @IsDateString({}, { message: '预约时间格式不正确' })
  booking_time?: string;

  @IsOptional()
  @IsString({ message: '备注必须是字符串' })
  remark?: string;
}

/**
 * 更新预约状态 DTO
 */
export class UpdateBookingStatusDto {
  @IsNotEmpty({ message: '状态不能为空' })
  @IsString({ message: '状态必须是字符串' })
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed' | 'pending_cancel';

  @IsOptional()
  @IsString({ message: '原因必须是字符串' })
  reason?: string;
}

/**
 * 修改预约排课 DTO
 */
export class ChangeBookingScheduleDto {
  @IsNotEmpty({ message: '新排课ID不能为空' })
  @IsString({ message: '新排课ID必须是字符串' })
  new_schedule_id: string;
}
