import {
  IsNotEmpty,
  IsString,
  IsDateString,
  IsInt,
  Min,
  IsOptional,
} from 'class-validator';

export class CreateScheduleDto {
  @IsNotEmpty({ message: '课程ID不能为空' })
  @IsString({ message: '课程ID必须是字符串' })
  course_id: string;

  @IsNotEmpty({ message: '教师ID不能为空' })
  @IsString({ message: '教师ID必须是字符串' })
  teacher_id: string;

  @IsNotEmpty({ message: '教室ID不能为空' })
  @IsString({ message: '教室ID必须是字符串' })
  classroom_id: string;

  @IsNotEmpty({ message: '开始时间不能为空' })
  @IsDateString({}, { message: '开始时间格式不正确' })
  start_time: string;

  @IsNotEmpty({ message: '结束时间不能为空' })
  @IsDateString({}, { message: '结束时间格式不正确' })
  end_time: string;

  @IsNotEmpty({ message: '星期几不能为空' })
  @IsString({ message: '星期几必须是字符串' })
  day_of_week: string;

  @IsNotEmpty({ message: '最大学生数不能为空' })
  @IsInt({ message: '最大学生数必须是整数' })
  @Min(1, { message: '最大学生数至少为1' })
  max_students: number;

  @IsOptional()
  @IsString({ message: '备注必须是字符串' })
  notes?: string;

  @IsOptional()
  @IsInt({ message: '时长必须是整数' })
  @Min(1, { message: '时长至少为1分钟' })
  duration?: number;

  @IsOptional()
  @IsString({ message: '状态必须是字符串' })
  status?: string;
}
