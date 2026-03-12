import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderService } from './order.service';

/**
 * 订单定时任务服务
 * 处理超时订单自动取消和关闭微信支付
 */
@Injectable()
export class OrderTasksService {
  private readonly logger = new Logger(OrderTasksService.name);

  constructor(private orderService: OrderService) {}

  /**
   * 每分钟检查超时订单
   * 自动取消过期订单并关闭微信支付
   * 【重要】保证数据一致性：先关闭微信支付，成功后再修改本地订单状态
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredOrders() {
    this.logger.debug('开始检查超时订单...');
    
    try {
      const result = await this.orderService.handleExpiredOrders();
      
      if (result.processed > 0 || result.skipped > 0) {
        this.logger.log(
          `超时订单处理完成: 取消 ${result.processed} 个订单, 关闭 ${result.closed} 个微信支付, 跳过 ${result.skipped} 个`,
        );
      }
    } catch (error) {
      this.logger.error('检查超时订单失败', error);
    }
  }

  /**
   * 每5分钟检查超时退款申请
   * PRD §3.5.5: 退款申请提交后48小时内机构必须处理，否则自动同意
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiredRefunds() {
    try {
      const result = await this.orderService.handleExpiredRefunds();
      if (result.processed > 0) {
        this.logger.log(`48h退款自动审批: 处理 ${result.processed} 个`);
      }
    } catch (error) {
      this.logger.error('48h退款自动审批任务失败', error);
    }
  }
}
