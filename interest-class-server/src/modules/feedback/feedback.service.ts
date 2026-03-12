import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FeedbackEntity } from './entities/feedback.entity';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { ReplyFeedbackDto } from './dto/reply-feedback.dto';
import { Transactional } from '@/common/decorators/transaction.decorator';
import { FeedbackRepository } from './repositories/feedback.repository';
import { UserContextService } from '@/common/services/user-context.service';

@Injectable()
export class FeedbackService {
  constructor(
    private feedbackRepository: FeedbackRepository,
    private dataSource: DataSource,
    private userContextService: UserContextService,
  ) {}

  /**
   * 创建反馈
   */
  @Transactional()
  async create(dto: CreateFeedbackDto): Promise<string> {
    const userId = this.userContextService.getCurrentUserIdOrNull();

    // 获取用户信息快照
    let userNickname: string | undefined;
    let userPhone: string | undefined;
    if (userId) {
      try {
        const user = await this.dataSource.query(
          `SELECT nickname, phone FROM users WHERE id = $1 AND is_delete = false`,
          [userId],
        );
        if (user && user.length > 0) {
          userNickname = user[0].nickname;
          userPhone = user[0].phone;
        }
      } catch (e) {
        // ignore
      }
    }

    const feedback = this.feedbackRepository.create({
      ...dto,
      type: dto.type || 'suggestion',
      status: 'pending',
      user_nickname: userNickname,
      user_phone: userPhone,
    });

    const saved = await this.feedbackRepository.save(feedback);
    return (saved as any).id;
  }

  /**
   * 获取我的反馈列表
   */
  async getMyFeedbacks(): Promise<FeedbackEntity[]> {
    const userId = this.userContextService.getCurrentUserId();
    return this.feedbackRepository.findMyFeedbacks(userId);
  }

  /**
   * 获取反馈详情
   */
  async findOne(id: string): Promise<FeedbackEntity> {
    const feedback = await this.feedbackRepository.findOneById(id);
    if (!feedback) {
      throw new NotFoundException('反馈不存在');
    }
    return feedback;
  }

  /**
   * 管理员获取所有反馈（分页）
   */
  async findAll(
    page: number = 1,
    pageSize: number = 10,
    status?: string,
    type?: string,
  ) {
    return this.feedbackRepository.findAllPaginated(page, pageSize, {
      status,
      type,
    });
  }

  /**
   * 管理员回复/更新状态
   */
  @Transactional()
  async reply(id: string, dto: ReplyFeedbackDto): Promise<boolean> {
    const feedback = await this.findOne(id);
    const userId = this.userContextService.getCurrentUserId();

    if (dto.reply) {
      feedback.reply = dto.reply;
      feedback.replied_at = new Date();
      feedback.replied_by = userId;
    }

    if (dto.status) {
      feedback.status = dto.status;
    }

    const result = await this.feedbackRepository.save(feedback);
    return !!result;
  }

  /**
   * 管理员删除反馈
   */
  @Transactional()
  async remove(id: string): Promise<boolean> {
    await this.findOne(id);
    return this.feedbackRepository.softRemoveById(id);
  }

  /**
   * 反馈统计
   */
  async getStats(): Promise<Record<string, number>> {
    return this.feedbackRepository.countByStatus();
  }
}
