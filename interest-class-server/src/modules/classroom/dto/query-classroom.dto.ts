import { IsString, IsOptional, IsIn, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryClassroomDto {
  @IsString()
  @IsOptional()
  institutionId?: string;

  @IsString()
  @IsOptional()
  keyword?: string;

  @IsOptional()
  @IsIn(['available', 'maintenance', 'disabled', ''])
  status?: string;

  // 可选分页参数
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
