import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { InviteService } from './invite.service';
import {
  SetShareRatioDto,
  ValidateInviteCodeDto,
  CalculateDiscountDto,
  QueryInviteOrdersDto,
  ApplyWithdrawDto,
  ReviewWithdrawDto,
  DeductBalanceDto,
} from './dto';

@Controller('invite')
export class InviteController {
  constructor(private readonly inviteService: InviteService) {}

  /**
   * 获取我的邀请码（自动生成）
   */
  @Get('code')
  async getMyInviteCode() {
    return this.inviteService.getMyInviteCode();
  }

  /**
   * 设置让利比例
   */
  @Put('share-ratio')
  async setShareRatio(@Body() dto: SetShareRatioDto) {
    return this.inviteService.setShareRatio(dto);
  }

  /**
   * 获取可用邀请码列表（按立减金额排序）
   * 用于用户选择邀请码时展示
   */
  @Get('available')
  async getAvailableInviteCodes(
    @Query('order_amount') orderAmount: string,
    @Query('cashback_ratio') cashbackRatio: string,
  ) {
    const amount = Number(orderAmount);
    const ratio = Number(cashbackRatio);
    
    if (isNaN(amount) || amount <= 0) {
      return [];
    }
    if (isNaN(ratio) || ratio < 0) {
      return [];
    }
    
    return this.inviteService.getAvailableInviteCodes(amount, ratio);
  }

  /**
   * 验证邀请码有效性（公开接口）
   */
  @Post('validate')
  async validateInviteCode(@Body() dto: ValidateInviteCodeDto) {
    return this.inviteService.validateInviteCode(dto);
  }

  /**
   * 计算立减金额（公开接口）
   */
  @Post('calculate-discount')
  async calculateDiscount(@Body() dto: CalculateDiscountDto) {
    return this.inviteService.calculateDiscount(dto);
  }

  /**
   * 获取邀请统计
   */
  @Get('stats')
  async getInviteStats() {
    return this.inviteService.getInviteStats();
  }

  /**
   * 获取邀请订单列表
   */
  @Get('orders')
  async getInviteOrders(@Query() dto: QueryInviteOrdersDto) {
    return this.inviteService.getInviteOrders(dto);
  }

  /**
   * 获取我的余额
   */
  @Get('balance')
  async getBalance() {
    return this.inviteService.getBalance();
  }

  /**
   * 申请提现
   */
  @Post('withdraw')
  async applyWithdraw(@Body() dto: ApplyWithdrawDto) {
    return this.inviteService.applyWithdraw(dto);
  }

  /**
   * 获取流水记录
   */
  @Get('cashback-records')
  async getCashbackRecords(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('type') type?: string,
  ) {
    return this.inviteService.getCashbackRecords(
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 10,
      type,
    );
  }

  /**
   * 获取提现记录
   */
  @Get('withdraw-records')
  async getWithdrawRecords(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('status') status?: string,
  ) {
    return this.inviteService.getWithdrawRecords(
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 10,
      status,
    );
  }

  /**
   * 余额抵扣（下单时使用）
   */
  @Post('deduct')
  async deductBalance(@Body() dto: DeductBalanceDto) {
    return this.inviteService.deductBalance(dto);
  }

  /**
   * 获取待审核提现列表（管理端）
   */
  @Get('admin/pending-withdraws')
  async getPendingWithdraws(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.inviteService.getPendingWithdraws(
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 10,
    );
  }

  /**
   * 审核提现（管理端）
   */
  @Post('admin/withdraw/:id/review')
  async reviewWithdraw(
    @Param('id') id: string,
    @Body() dto: ReviewWithdrawDto,
  ) {
    return this.inviteService.reviewWithdraw(id, dto);
  }
}
