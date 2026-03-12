import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateCourseDto, CreateCourseSkuDto } from './create-course.dto';
import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCourseSkuDto extends PartialType(CreateCourseSkuDto) {
  @IsString()
  @IsOptional()
  id?: string;
}

export class UpdateCourseDto extends PartialType(
  OmitType(CreateCourseDto, ['skus'] as const),
) {
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateCourseSkuDto)
  skus?: UpdateCourseSkuDto[];
}
