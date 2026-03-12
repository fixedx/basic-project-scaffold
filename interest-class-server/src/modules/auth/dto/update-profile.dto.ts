import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * 更新用户资料 DTO
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString({ message: '昵称必须是字符串' })
  @MaxLength(50, { message: '昵称最长50个字符' })
  nickname?: string;

  @IsOptional()
  @IsString({ message: '头像必须是字符串' })
  avatar?: string;

  @IsOptional()
  @IsString({ message: '性别必须是字符串' })
  gender?: string;
}
