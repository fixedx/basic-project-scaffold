import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
  ValidateNested,
  IsIn,
  Min,
  Max,
  MinLength,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCourseSkuDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  @IsIn(['standard', 'trial'])
  type?: string;

  @IsNumber()
  @Min(1)
  total_lessons: number;

  @IsNumber()
  @Min(0.01)
  total_price: number;

  @IsString()
  @IsIn(['percentage', 'fixed', 'none'])
  cashback_type: string;

  @IsNumber()
  @Min(0)
  @Max(100) // 比例返现最大100%，固定金额由业务逻辑校验
  cashback_value: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  validity_days?: number;

  @IsNumber()
  @IsOptional()
  stock?: number;
}

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty({ message: '机构ID不能为空' })
  institution_id: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(30)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  subtitle?: string;

  @IsString()
  @IsNotEmpty({ message: '课程类目不能为空' })
  category_code: string;

  @IsArray()
  @IsOptional()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  slider_imgs?: string[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  min_age?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  max_age?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  lesson_duration?: number;

  @IsString()
  @IsIn(['standard', 'trial'])
  type: string;

  @IsBoolean()
  @IsOptional()
  is_online?: boolean;

  @IsBoolean()
  @IsOptional()
  cashback_enabled?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(3)
  @Max(15)
  cashback_ratio?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCourseSkuDto)
  skus: CreateCourseSkuDto[];
}
