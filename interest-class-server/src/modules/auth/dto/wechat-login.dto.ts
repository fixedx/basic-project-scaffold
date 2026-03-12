import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

/**
 * 微信登录 DTO
 */
export class WechatLoginDto {
  @IsNotEmpty({ message: '微信授权码不能为空' })
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  city?: string;
}

/**
 * 登录响应 DTO
 */
export class LoginResponseDto {
  token: string;
  userInfo: {
    id: string;
    openid: string;
    nickname: string;
    avatar?: string;
  };
}
