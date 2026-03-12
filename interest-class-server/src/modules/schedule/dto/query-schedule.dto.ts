import {
  IsOptional,
  IsString,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryScheduleDto {
  @IsOptional()
  @IsString({ message: '课程ID必须是字符串' })
  course_id?: string;

  @IsOptional()
  @IsString({ message: '教师ID必须是字符串' })
  teacher_id?: string;

  @IsOptional()
  @IsString({ message: '教室ID必须是字符串' })
  classroom_id?: string;

  @IsOptional()
  @IsString({ message: '机构ID必须是字符串' })
  institution_id?: string;

  @IsOptional()
  @IsString({ message: '星期几必须是字符串' })
  day_of_week?: string;

  @IsOptional()
  @IsDateString({}, { message: '开始日期格式不正确' })
  start_date?: string;

  @IsOptional()
  @IsDateString({}, { message: '结束日期格式不正确' })
  end_date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码至少为1' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量至少为1' })
  pageSize?: number;
}
