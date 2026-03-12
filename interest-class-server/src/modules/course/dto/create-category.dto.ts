import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @IsNotEmpty({ message: '类目名称不能为空' })
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  parent_id?: string;

  @IsOptional()
  sort_order?: number;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
