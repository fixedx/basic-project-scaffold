import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateEnumDto {
  @IsNotEmpty({ message: '枚举类型不能为空' })
  @IsString()
  type: string;

  @IsNotEmpty({ message: '枚举代码不能为空' })
  @IsString()
  code: string;

  @IsNotEmpty({ message: '显示名称不能为空' })
  @IsString()
  label: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  sort_order?: number;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  extra?: Record<string, any>;
}
