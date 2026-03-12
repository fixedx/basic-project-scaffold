import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsIn,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateClassroomDto {
  @IsString()
  @IsNotEmpty({ message: '机构ID不能为空' })
  institution_id: string;

  @IsString()
  @IsNotEmpty({ message: '教室名称不能为空' })
  @MaxLength(50)
  name: string;

  @IsNumber()
  @Min(0)
  capacity: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  area?: number;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  floor?: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  facilities?: string[];

  @IsString()
  @IsIn(['available', 'maintenance', 'disabled'])
  status: string;

  @IsNumber()
  @IsOptional()
  sort_order?: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
