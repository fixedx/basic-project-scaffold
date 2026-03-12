import { IsNotEmpty, IsString, IsOptional, IsIn } from 'class-validator';

export class CreateFeedbackDto {
  @IsNotEmpty({ message: '反馈内容不能为空' })
  @IsString({ message: '反馈内容必须是字符串' })
  content: string;

  @IsOptional()
  @IsIn(['suggestion', 'bug', 'other'], { message: '反馈类型不正确' })
  type?: string;

  @IsOptional()
  @IsString({ message: '联系方式必须是字符串' })
  contact?: string;

  @IsOptional()
  @IsString({ message: '来源页面必须是字符串' })
  page_source?: string;
}
