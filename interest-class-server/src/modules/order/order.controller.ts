import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto, ConfirmPaymentDto, RefundDto, CalculateOrderAmountDto } from './dto/order.dto';

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  /**
   * 计算订单金额（前端调用，获取费用明细）
   * 所有金额由后端统一计算，前端只负责展示
   */
  @Post('calculate')
  async calculateAmount(@Body() dto: CalculateOrderAmountDto) {
    return this.orderService.calculateOrderAmount(dto);
  }

  /**
   * 创建订单
   */
  @Post()
  async create(@Body() dto: CreateOrderDto): Promise<string> {
    return this.orderService.create(dto);
  }

  /**
   * 查询我的订单列表
   */
  @Get('my')
  async findMyOrders(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('status') status?: string,
  ) {
    return this.orderService.findMyOrders(
      page ? +page : undefined,
      pageSize ? +pageSize : undefined,
      status,
    );
  }

  /**
   * 查询机构订单列表
   */
  @Get('institution/:institutionId')
  async findInstitutionOrders(
    @Param('institutionId') institutionId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('status') status?: string,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('commissionOnly') commissionOnly?: string,
  ) {
    return this.orderService.findInstitutionOrders(
      institutionId,
      page ? +page : undefined,
      pageSize ? +pageSize : undefined,
      status,
      period || undefined,
      startDate || undefined,
      endDate || undefined,
      commissionOnly === 'true',
    );
  }

  /**
   * 查询机构收入统计
   */
  @Get('institution/:institutionId/revenue')
  async getInstitutionRevenue(@Param('institutionId') institutionId: string) {
    const revenue =
      await this.orderService.getInstitutionRevenue(institutionId);
    return { revenue };
  }

  /**
   * 根据订单号查询
   */
  @Get('order-no/:orderNo')
  async findByOrderNo(@Param('orderNo') orderNo: string) {
    return this.orderService.findByOrderNo(orderNo);
  }

  /**
   * 查询订单详情
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }

  /**
   * 确认支付（机构端）
   */
  @Put(':id/confirm-payment')
  async confirmPayment(
    @Param('id') id: string,
    @Body() dto: ConfirmPaymentDto,
  ): Promise<boolean> {
    await this.orderService.confirmPayment(id, dto);
    return true;
  }

  /**
   * 申请退款（用户端）
   */
  @Put(':id/apply-refund')
  async applyRefund(@Param('id') id: string, @Body() dto: RefundDto): Promise<boolean> {
    await this.orderService.applyRefund(id, dto);
    return true;
  }

  /**
   * 处理退款（机构端）
   */
  @Put(':id/process-refund')
  async processRefund(
    @Param('id') id: string,
    @Body('approved') approved: boolean,
    @Body('reason') reason?: string,
  ): Promise<boolean> {
    await this.orderService.processRefund(id, approved, reason);
    return true;
  }

  /**
   * 取消订单（用户端）
   */
  @Put(':id/cancel')
  async cancel(@Param('id') id: string): Promise<boolean> {
    await this.orderService.cancel(id);
    return true;
  }

  /**
   * 机构确认订单（将待确认变为已确认，同时确认预约）
   * 针对正式课：线上支付成功后状态为 pending_confirm，机构确认后变为 confirmed
   */
  @Put(':id/confirm')
  async confirm(@Param('id') id: string): Promise<boolean> {
    await this.orderService.confirm(id);
    return true;
  }

  /**
   * 完成订单（机构端）
   */
  @Put(':id/complete')
  async complete(@Param('id') id: string): Promise<boolean> {
    await this.orderService.complete(id);
    return true;
  }
}
