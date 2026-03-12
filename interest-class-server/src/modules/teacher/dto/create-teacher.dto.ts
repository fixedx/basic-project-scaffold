import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsIn,
  Min,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateTeacherDto {
  @IsString()
  @IsNotEmpty({ message: '机构ID不能为空' })
  institution_id: string;

  @IsString()
  @IsNotEmpty({ message: '教师姓名不能为空' })
  @MaxLength(50)
  name: string;

  @IsString()
  @IsIn(['male', 'female'])
  @IsOptional()
  gender?: string;

  @IsString()
  @IsNotEmpty({ message: '手机号不能为空' })
  @Matches(/^1[3-9]\d{9}$/, {
    message: '请输入正确的手机号码',
  })
  phone: string;

  @IsString()
  @IsNotEmpty({ message: '头像不能为空' })
  photo: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  subjects?: string[];

  @IsString()
  @IsOptional()
  @MaxLength(100)
  title?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  years_of_experience?: number;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  bio?: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  certificates?: string[];

  @IsString()
  @IsIn(['active', 'inactive', 'on_leave'])
  status: string;

  @IsNumber()
  @IsOptional()
  sort_order?: number;
}
