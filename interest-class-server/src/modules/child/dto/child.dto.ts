import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  IsIn,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 创建宝贝 DTO
 */
export class CreateChildDto {
  @IsNotEmpty({ message: '宝贝姓名不能为空' })
  @IsString({ message: '宝贝姓名必须是字符串' })
  name: string;

  @IsOptional()
  @IsString({ message: '头像必须是字符串' })
  avatar?: string;

  @IsOptional()
  @IsString({ message: '性别必须是字符串' })
  @IsIn(['male', 'female'], { message: '性别只能是 male 或 female' })
  gender?: string;

  @IsOptional()
  @IsString({ message: '出生日期必须是字符串' })
  birthday?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '年龄必须是整数' })
  @Min(0, { message: '年龄不能为负数' })
  @Max(100, { message: '年龄不能超过100' })
  age?: number;

  @IsOptional()
  @IsString({ message: '联系电话必须是字符串' })
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone?: string;

  @IsOptional()
  @IsArray({ message: '兴趣爱好必须是数组' })
  @IsString({ each: true, message: '兴趣爱好必须是字符串数组' })
  interests?: string[];

  @IsOptional()
  @IsString({ message: '备注必须是字符串' })
  remark?: string;
}

/**
 * 更新宝贝 DTO
 */
export class UpdateChildDto {
  @IsOptional()
  @IsString({ message: '宝贝姓名必须是字符串' })
  name?: string;

  @IsOptional()
  @IsString({ message: '头像必须是字符串' })
  avatar?: string;

  @IsOptional()
  @IsString({ message: '性别必须是字符串' })
  @IsIn(['male', 'female'], { message: '性别只能是 male 或 female' })
  gender?: string;

  @IsOptional()
  @IsString({ message: '出生日期必须是字符串' })
  birthday?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '年龄必须是整数' })
  @Min(0, { message: '年龄不能为负数' })
  @Max(100, { message: '年龄不能超过100' })
  age?: number;

  @IsOptional()
  @IsString({ message: '联系电话必须是字符串' })
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone?: string;

  @IsOptional()
  @IsArray({ message: '兴趣爱好必须是数组' })
  @IsString({ each: true, message: '兴趣爱好必须是字符串数组' })
  interests?: string[];

  @IsOptional()
  @IsString({ message: '备注必须是字符串' })
  remark?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '排序必须是整数' })
  sort_order?: number;
}
