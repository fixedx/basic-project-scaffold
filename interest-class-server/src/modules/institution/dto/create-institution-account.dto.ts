import {
  IsString,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';

export class CreateInstitutionAccountDto {
  @IsString()
  @IsNotEmpty({ message: '手机号不能为空' })
  phone: string;

  @IsString()
  @IsNotEmpty({ message: '真实姓名不能为空' })
  real_name: string;

  @IsString()
  @IsOptional()
  role?: string; // owner, admin, staff

  @IsString()
  @IsOptional()
  remark?: string;
}
