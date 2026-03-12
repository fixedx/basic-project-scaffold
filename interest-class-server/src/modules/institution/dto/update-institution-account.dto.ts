import { IsString, IsOptional, MinLength, IsBoolean } from 'class-validator';

export class UpdateInstitutionAccountDto {
  @IsString()
  @IsOptional()
  @MinLength(4, { message: '账号至少4个字符' })
  username?: string;

  @IsString()
  @IsOptional()
  @MinLength(6, { message: '密码至少6个字符' })
  password?: string;

  @IsString()
  @IsOptional()
  real_name?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  remark?: string;

  @IsBoolean()
  @IsOptional()
  is_enabled?: boolean;
}
