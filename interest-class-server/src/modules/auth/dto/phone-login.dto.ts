import { IsString, IsNotEmpty } from 'class-validator';

export class PhoneLoginDto {
  @IsString()
  @IsNotEmpty({ message: '手机号code不能为空' })
  code: string; // 微信获取手机号的code

  @IsString()
  @IsNotEmpty({ message: '登录类型不能为空' })
  type: 'institution' | 'teacher'; // 登录类型：机构或教师
}
