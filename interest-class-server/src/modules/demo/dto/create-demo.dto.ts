import {
  IsString,
  IsOptional,
  IsDate,
  IsObject,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDemoDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  start_time?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  end_time?: Date;

  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @IsObject()
  @IsOptional()
  extra_data?: Record<string, any>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  created_by?: string;
}
