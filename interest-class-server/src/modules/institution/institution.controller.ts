import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { InstitutionService } from './institution.service';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { SubmitInstitutionDto } from './dto/submit-institution.dto';
import { SubmitContractDto } from './dto/submit-contract.dto';
import { CreateInstitutionAccountDto } from './dto/create-institution-account.dto';
import { UpdateInstitutionAccountDto } from './dto/update-institution-account.dto';

@Controller('institution')
export class InstitutionController {
  constructor(private readonly institutionService: InstitutionService) {}

  /**
   * 创建机构（草稿）
   */
  @Post()
  async create(@Body() dto: CreateInstitutionDto): Promise<string> {
    return await this.institutionService.create(dto);
  }

  /**
   * 更新机构信息
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateInstitutionDto): Promise<boolean> {
    await this.institutionService.update(id, dto);
    return true;
  }

  /**
   * 提交审核
   */
  @Post('submit')
  async submit(@Body() dto: SubmitInstitutionDto) {
    await this.institutionService.submit(dto.institutionId);
    return { message: '已提交审核' };
  }

  /**
   * 提交签约凭证（机构端调用）
   */
  @Put(':id/submit-contract')
  async submitContract(
    @Param('id') id: string,
    @Body() dto: SubmitContractDto,
  ): Promise<boolean> {
    await this.institutionService.submitContract(id, dto.contract_screenshot);
    return true;
  }

  /**
   * 获取我的机构（单个，保留用于向后兼容）
   */
  @Get('my')
  async getMyInstitution() {
    return this.institutionService.getMyInstitution();
  }

  /**
   * 获取当前机构信息（机构端使用）
   */
  @Get('current')
  async getCurrentInstitution() {
    return this.institutionService.getCurrentInstitution();
  }

  /**
   * 获取机构统计数据（机构端使用）
   * @param period 时间段: thisMonth | threeMonths | halfYear | oneYear | all | custom
   * @param startDate 自定义开始日期 (仅 period=custom 时有效)
   * @param endDate 自定义结束日期 (仅 period=custom 时有效)
   */
  @Get('stats')
  async getStats(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('teacherStatus') teacherStatus?: string,
  ) {
    return this.institutionService.getInstitutionStats(period, startDate, endDate, teacherStatus);
  }

  /**
   * 获取我的所有机构列表
   */
  @Get('my-list')
  async getMyInstitutions() {
    return this.institutionService.getMyInstitutions();
  }
  
  /**
   * 获取机构列表（支持按状态筛选、距离筛选和关键词搜索）
   * @param status - 审核状态：pending(待审核), approved(已通过), rejected(已拒绝), 不传则返回所有
   * @param latitude - 用户纬度（可选，用于距离计算）
   * @param longitude - 用户经度（可选，用于距离计算）
   * @param maxDistance - 最大距离（公里），如 2, 3, 5, 10
   * @param keyword - 搜索关键词（匹配机构名称、简介）
   */
  @Get('list')
  async getList(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('status') status?: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
    @Query('maxDistance') maxDistance?: string,
    @Query('keyword') keyword?: string,
  ) {
    const lat = latitude ? parseFloat(latitude) : undefined;
    const lng = longitude ? parseFloat(longitude) : undefined;
    const maxDist = maxDistance ? parseFloat(maxDistance) : undefined;
    const kw = keyword?.trim() || undefined;
    return this.institutionService.getList(page, pageSize, status, lat, lng, maxDist, kw);
  }

  /**
   * 查询附近的机构（基于用户位置）
   * @param latitude - 用户纬度
   * @param longitude - 用户经度
   * @param radius - 搜索半径（公里），默认10
   * @param limit - 返回数量，默认20
   */
  @Get('nearby')
  async getNearby(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('radius') radius?: string,
    @Query('limit') limit?: string,
  ) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const radiusKm = radius ? parseFloat(radius) : 10;
    const limitNum = limit ? parseInt(limit) : 20;

    if (isNaN(lat) || isNaN(lng)) {
      throw new BadRequestException('请提供有效的经纬度');
    }

    return this.institutionService.findNearby(lat, lng, radiusKm, limitNum);
  }

  /**
   * 按区域搜索机构（支持距离排序）
   * @param province - 省份
   * @param city - 城市
   * @param district - 区县
   * @param latitude - 用户纬度（可选，用于距离排序）
   * @param longitude - 用户经度（可选，用于距离排序）
   * @param page - 页码
   * @param pageSize - 每页数量
   */
  @Get('search/area')
  async searchByArea(
    @Query('province') province?: string,
    @Query('city') city?: string,
    @Query('district') district?: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
  ) {
    const lat = latitude ? parseFloat(latitude) : undefined;
    const lng = longitude ? parseFloat(longitude) : undefined;

    return this.institutionService.findByArea(
      province,
      city,
      district,
      lat,
      lng,
      page,
      pageSize,
    );
  }

  /**
   * 获取机构学员列表（机构端使用）
   * 聚合机构订单中的学员信息，展示每个学员的课程及进度
   * ⚠️ 必须放在 @Get(':id') 之前
   */
  @Get('students')
  async getStudents(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('keyword') keyword?: string,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.institutionService.getInstitutionStudents(
      page ? Number(page) : undefined,
      pageSize ? Number(pageSize) : undefined,
      keyword?.trim() || undefined,
      period || undefined,
      startDate || undefined,
      endDate || undefined,
    );
  }

  /**
   * 添加机构账号
   * ⚠️ 必须放在 @Get(':id') 之前，避免被:id路由捕获
   */
  @Post(':id/accounts')
  async addAccount(
    @Param('id') institutionId: string,
    @Body() dto: CreateInstitutionAccountDto,
  ): Promise<boolean> {
    await this.institutionService.addAccount(institutionId, dto);
    return true;
  }

  /**
   * 更新机构状态（激活/冻结）
   * ⚠️ 必须放在 @Get(':id') 之前
   */
  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: { status: 'active' | 'frozen' },
  ): Promise<boolean> {
    await this.institutionService.updateStatus(id, dto.status);
    return true;
  }

  /**
   * 删除机构（软删除）
   * ⚠️ 必须放在 @Get(':id') 之前
   */
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<boolean> {
    await this.institutionService.remove(id);
    return true;
  }

  /**
   * 根据ID获取机构详情
   * ⚠️ 注意：此路由必须放在最后，避免捕获其他路径（如 /institution/courses）
   */
  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.institutionService.getById(id);
  }

  /**
   * 创建机构账号（已废弃：账号现在在机构入驻时创建）
   */
  @Post('account')
  createAccount() {
    throw new BadRequestException('该接口已废弃，请使用机构入驻接口创建账号');
  }

  /**
   * 更新机构账号（已废弃）
   */
  @Put('account/:id')
  updateAccount() {
    throw new BadRequestException('该接口已废弃');
  }

  /**
   * 删除机构账号（已废弃）
   */
  @Delete('account/:id')
  deleteAccount() {
    throw new BadRequestException('该接口已废弃');
  }

  /**
   * 获取机构账号列表（已废弃）
   */
  @Get('account/list/:institutionId')
  getAccountsByInstitutionId() {
    throw new BadRequestException('该接口已废弃');
  }
}
