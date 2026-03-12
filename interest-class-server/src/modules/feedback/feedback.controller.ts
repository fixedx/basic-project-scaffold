import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { ReplyFeedbackDto } from './dto/reply-feedback.dto';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  /**
   * 创建反馈（已登录用户）
   */
  @Post()
  async create(@Body() dto: CreateFeedbackDto): Promise<string> {
    return this.feedbackService.create(dto);
  }

  /**
   * 获取我的反馈列表
   */
  @Get('my')
  async getMyFeedbacks() {
    return this.feedbackService.getMyFeedbacks();
  }

  /**
   * 管理员获取所有反馈（分页）
   */
  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.feedbackService.findAll(
      parseInt(page, 10),
      parseInt(pageSize, 10),
      status,
      type,
    );
  }

  /**
   * 获取反馈详情
   */
  @Get('stats')
  async getStats() {
    return this.feedbackService.getStats();
  }

  /**
   * 获取反馈详情
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.feedbackService.findOne(id);
  }

  /**
   * 管理员回复/更新状态
   */
  @Put(':id/reply')
  async reply(@Param('id') id: string, @Body() dto: ReplyFeedbackDto) {
    return this.feedbackService.reply(id, dto);
  }

  /**
   * 管理员删除反馈
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.feedbackService.remove(id);
  }
}
