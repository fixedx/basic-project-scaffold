import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InviteService } from './invite.service';

/**
 * 邀友返现相关定时任务
 */
@Injectable()
export class InviteTasksService {
  private readonly logger = new Logger(InviteTasksService.name);

  constructor(private inviteService: InviteService) {}

  /**
   * 每 10 分钟检查卡在 approved 状态的提现记录
   *
   * 场景：管理员审核通过后调用微信转账 API，
   *       若此时网络超时或服务重启，withdraw_records.status 将停留在 approved 而不推进。
   *       本任务定期重试，保证最终一致性。
   *
   * PRD §5.4：提现审核通过后资金应在 1 个工作日内到账
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleStuckWithdrawals() {
    try {
      const result = await this.inviteService.retryApprovedWithdrawals();
      if (result.retried > 0 || result.failed > 0) {
        this.logger.log(
          `提现卡单补偿完成: 成功重试 ${result.retried} 条, 失败回退 ${result.failed} 条`,
        );
      }
    } catch (error) {
      this.logger.error('提现卡单补偿任务失败', error);
    }
  }
}
