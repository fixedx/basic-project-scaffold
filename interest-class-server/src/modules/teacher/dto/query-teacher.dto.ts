import { IsOptional, IsString, IsIn, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryTeacherDto {
  @IsString()
  @IsOptional()
  institutionId?: string;

  @IsString()
  @IsOptional()
  keyword?: string;

  @IsOptional()
  @IsIn(['active', 'inactive', 'on_leave', ''])
  status?: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pageSize?: number;

  // 时间筛选
  @IsOptional()
  @IsString()
  period?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
