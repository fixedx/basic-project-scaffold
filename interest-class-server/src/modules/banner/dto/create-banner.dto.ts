import { IsNotEmpty, IsString, IsOptional, IsInt, Min } from 'class-validator';

export class CreateBannerDto {
  @IsNotEmpty({ message: '标题不能为空' })
  @IsString({ message: '标题必须是字符串' })
  title: string;

  @IsNotEmpty({ message: '图片不能为空' })
  @IsString({ message: '图片必须是字符串' })
  image: string;

  @IsNotEmpty({ message: '链接类型不能为空' })
  @IsString({ message: '链接类型必须是字符串' })
  link_type: string;

  @IsOptional()
  @IsString({ message: '链接目标必须是字符串' })
  link_target?: string;

  @IsOptional()
  @IsInt({ message: '排序必须是整数' })
  @Min(0, { message: '排序不能小于0' })
  sort?: number;

  @IsOptional()
  @IsString({ message: '状态必须是字符串' })
  status?: string;

  @IsOptional()
  start_time?: Date;

  @IsOptional()
  end_time?: Date;
}
