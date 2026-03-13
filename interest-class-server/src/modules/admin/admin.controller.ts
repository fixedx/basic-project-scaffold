import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { OrderService } from '@/modules/order/order.service';
import { AuditInstitutionDto } from './dto/audit-institution.dto';
import { ReviewContractDto } from '@/modules/institution/dto/review-contract.dto';
import { UpdateInstitutionDto } from '@/modules/institution/dto/update-institution.dto';
import { UpdatePlatformConfigDto } from './dto/update-platform-config.dto';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly orderService: OrderService,
  ) {}

  /**
   * 获取平台统计数据
   * @param period today|thisWeek|thisMonth|threeMonths|halfYear|oneYear|all|custom
   */
  @Get('stats')
  async getStats(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getStats(period, startDate, endDate);
  }

  /**
   * 设置机构佣金
   */
  @Put('commission/:id')
  async setCommission(
    @Param('id') id: string,
    @Body() body: { commissionType: string; commissionValue: number },
  ): Promise<boolean> {
    await this.adminService.setCommission(id, body.commissionType, body.commissionValue);
    return true;
  }

  /**
   * 获取机构列表（带筛选和分页）
   */
  @Get('institutions')
  async getInstitutionList(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
    @Query('auditStatus') auditStatus?: string,
  ) {
    return this.adminService.getInstitutionList(page, pageSize, auditStatus);
  }

  /**
   * 审核机构
   * ⚠️ 必须放在 institution/:id 之前，避免被 :id 参数路由捕获
   */
  @Put('audit/:id')
  async auditInstitution(
    @Param('id') id: string,
    @Body() dto: AuditInstitutionDto,
  ) {
    await this.adminService.auditInstitution(id, dto);
    return { message: '审核成功' };
  }

  /**
   * 审核签约凭证
   */
  @Put('contract/:id')
  async reviewContract(
    @Param('id') id: string,
    @Body() dto: ReviewContractDto,
  ) {
    await this.adminService.reviewContract(id, dto);
    return { message: '签约审核成功' };
  }

  /**
   * 编辑机构信息
   */
  @Put('institution/:id')
  async updateInstitution(
    @Param('id') id: string,
    @Body() dto: UpdateInstitutionDto,
  ): Promise<boolean> {
    await this.adminService.updateInstitution(id, dto);
    return true;
  }

  /**
   * 获取所有订单列表（管理员）
   */
  @Get('orders')
  async getOrders(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
    @Query('status') status?: string,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.orderService.findAllOrders(
      page,
      pageSize,
      status,
      period,
      startDate,
      endDate,
    );
  }

  /**
   * 获取订单详情（管理员）
   */
  @Get('orders/:id')
  async getOrderDetail(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }

  /**
   * 冻结机构
   */
  @Put('institutions/:id/freeze')
  async freezeInstitution(@Param('id') id: string): Promise<boolean> {
    await this.adminService.freezeInstitution(id);
    return true;
  }

  /**
   * 解冻机构
   */
  @Put('institutions/:id/unfreeze')
  async unfreezeInstitution(@Param('id') id: string): Promise<boolean> {
    await this.adminService.unfreezeInstitution(id);
    return true;
  }

  /**
   * 获取用户列表（管理员）
   */
  @Get('users')
  async getUsers(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @Query('keyword') keyword?: string,
  ) {
    return this.adminService.getUserList(page, pageSize, keyword);
  }

  // ──────────────────────────────────────────────────
  //  平台配置管理
  // ──────────────────────────────────────────────────

  /**
   * 获取全部平台配置项
   * GET /admin/platform-config
   */
  @Get('platform-config')
  async getPlatformConfigs() {
    return this.adminService.getPlatformConfigs();
  }

  /**
   * 更新单个平台配置项
   * PUT /admin/platform-config/:key
   * 支持的 key：
   *   - invite_daily_use_limit  邀请码单日使用上限，-1 = 不限制
   *   - withdraw_min_amount     提现最低门槛（元）
   */
  @Put('platform-config/:key')
  async setPlatformConfig(
    @Param('key') key: string,
    @Body() dto: UpdatePlatformConfigDto,
  ): Promise<boolean> {
    await this.adminService.setPlatformConfig(key, dto);
    return true;
  }
}
