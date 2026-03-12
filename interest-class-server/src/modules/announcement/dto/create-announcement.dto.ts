import { IsNotEmpty, IsString, IsOptional, IsInt, Min } from 'class-validator';

export class CreateAnnouncementDto {
  @IsNotEmpty({ message: '标题不能为空' })
  @IsString({ message: '标题必须是字符串' })
  title: string;

  @IsNotEmpty({ message: '内容不能为空' })
  @IsString({ message: '内容必须是字符串' })
  content: string;

  @IsOptional()
  @IsString({ message: '类型必须是字符串' })
  type?: string;

  @IsOptional()
  @IsString({ message: '状态必须是字符串' })
  status?: string;

  @IsOptional()
  @IsInt({ message: '优先级必须是整数' })
  @Min(0, { message: '优先级不能小于0' })
  priority?: number;

  @IsOptional()
  start_time?: Date;

  @IsOptional()
  end_time?: Date;
}
