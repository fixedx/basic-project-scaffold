import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdatePlatformConfigDto {
  @IsString({ message: '配置值必须是字符串' })
  @IsNotEmpty({ message: '配置值不能为空' })
  config_value: string;

  @IsOptional()
  @IsString()
  description?: string;
}
