import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  Req,
  Res,
  HttpCode,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { PaymentService } from './payment.service';
import { PrepayDto } from './dto/payment.dto';

@Controller('payment')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) {}

  /**
   * 创建预支付订单
   * 前端调用此接口获取支付参数，然后调用 uni.requestPayment
   */
  @Post('prepay')
  async createPrepayOrder(@Body() dto: PrepayDto) {
    return this.paymentService.createPrepayOrder(dto);
  }

  /**
   * 查询订单支付状态
   */
  @Get('status/:orderId')
  async queryPaymentStatus(@Param('orderId') orderId: string) {
    return this.paymentService.queryPaymentStatus(orderId);
  }

  /**
   * 微信支付回调
   * 注意：此接口需要加入白名单，不验证 JWT
   */
  @Post('notify')
  @HttpCode(200)
  async handleNotify(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: any,
    @Headers() headers: Record<string, string>,
  ) {
    const result = await this.paymentService.handleNotify(body, headers);

    if (result.success) {
      // 微信要求返回特定格式
      res.json({ code: 'SUCCESS', message: '成功' });
    } else {
      res.status(500).json({ code: 'FAIL', message: result.message });
    }
  }

  /**
   * 微信退款回调
   * 注意：此接口需要加入白名单，不验证 JWT
   */
  @Post('refund-notify')
  @HttpCode(200)
  async handleRefundNotify(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: any,
    @Headers() headers: Record<string, string>,
  ) {
    this.logger.log(
      `收到微信退款回调HTTP请求: method=${req.method}, path=${req.originalUrl}, ip=${req.ip || req.socket?.remoteAddress || '-'}, ` +
        `wechatpay-serial=${headers['wechatpay-serial'] || '-'}, wechatpay-timestamp=${headers['wechatpay-timestamp'] || '-'}, ` +
        `has-resource=${body?.resource ? 'true' : 'false'}, has-test-data=${body?.test_data ? 'true' : 'false'}`,
    );

    const result = await this.paymentService.handleRefundNotify(body, headers);

    if (result.success) {
      res.json({ code: 'SUCCESS', message: '成功' });
    } else {
      res.status(500).json({ code: 'FAIL', message: result.message });
    }
  }

  /**
   * 微信商家转账回调（提现到账通知）
   * 注意：此接口需要加入白名单，不验证 JWT
   */
  @Post('transfer-notify')
  @HttpCode(200)
  async handleTransferNotify(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: any,
    @Headers() headers: Record<string, string>,
  ) {
    const result = await this.paymentService.handleTransferNotify(body, headers);

    if (result.success) {
      res.json({ code: 'SUCCESS', message: '成功' });
    } else {
      res.status(500).json({ code: 'FAIL', message: result.message });
    }
  }
}
