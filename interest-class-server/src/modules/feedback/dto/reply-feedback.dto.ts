import { IsOptional, IsString, IsIn } from 'class-validator';

export class ReplyFeedbackDto {
  @IsOptional()
  @IsString({ message: '回复内容必须是字符串' })
  reply?: string;

  @IsOptional()
  @IsIn(['pending', 'processing', 'resolved', 'closed'], { message: '状态值不正确' })
  status?: string;
}
