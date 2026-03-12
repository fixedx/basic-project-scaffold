import {
  IsNotEmpty,
  IsString,
  IsInt,
  Min,
  IsOptional,
  IsArray,
  Matches,
} from 'class-validator';

export class BatchCreateScheduleDto {
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
  @IsString({ message: '开始时间格式不正确' })
  @Matches(/^\d{2}:\d{2}$/, { message: '开始时间格式应为 HH:mm' })
  start_time: string;

  @IsNotEmpty({ message: '结束时间不能为空' })
  @IsString({ message: '结束时间格式不正确' })
  @Matches(/^\d{2}:\d{2}$/, { message: '结束时间格式应为 HH:mm' })
  end_time: string;

  @IsNotEmpty({ message: '上课日期不能为空' })
  @IsArray({ message: '上课日期必须是数组' })
  @IsString({ each: true, message: '每个星期几必须是字符串' })
  days_of_week: string[];

  @IsNotEmpty({ message: '开始日期不能为空' })
  @IsString({ message: '开始日期格式不正确' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: '开始日期格式应为 YYYY-MM-DD' })
  start_date: string;

  @IsNotEmpty({ message: '结束日期不能为空' })
  @IsString({ message: '结束日期格式不正确' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: '结束日期格式应为 YYYY-MM-DD' })
  end_date: string;

  @IsNotEmpty({ message: '最大学生数不能为空' })
  @IsInt({ message: '最大学生数必须是整数' })
  @Min(1, { message: '最大学生数至少为1' })
  max_students: number;

  @IsOptional()
  @IsString({ message: '备注必须是字符串' })
  notes?: string;
}
