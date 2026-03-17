import { Injectable, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { InstitutionRepository } from '@/modules/institution/repositories/institution.repository';
import { InstitutionHonorRepository } from '@/modules/institution/repositories/institution-honor.repository';
import { InstitutionShowcaseRepository } from '@/modules/institution/repositories/institution-showcase.repository';
import { InstitutionTeachingEnvRepository } from '@/modules/institution/repositories/institution-teaching-env.repository';
import { UserRepository } from '@/modules/auth/repositories/user.repository';
import { CourseRepository } from '@/modules/course/repositories/course.repository';
import { OrderRepository } from '@/modules/order/repositories/order.repository';
import { BookingRepository } from '@/modules/booking/repositories/booking.repository';
import { UserContextService } from '@/common/services/user-context.service';
import { AdminStatsDto } from './dto/admin-stats.dto';
import { AuditInstitutionDto } from './dto/audit-institution.dto';
import { ReviewContractDto } from '@/modules/institution/dto/review-contract.dto';
import { UpdateInstitutionDto } from '@/modules/institution/dto/update-institution.dto';
import { Transactional } from '@/common/decorators/transaction.decorator';
import { DataSource } from 'typeorm';
import { generateSnowflakeId } from '@/utils/snowflake.util';
import { UpdatePlatformConfigDto } from './dto/update-platform-config.dto';

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger(AdminService.name);
  constructor(
    private institutionRepository: InstitutionRepository,
    private honorRepository: InstitutionHonorRepository,
    private showcaseRepository: InstitutionShowcaseRepository,
    private teachingEnvRepository: InstitutionTeachingEnvRepository,
    private userRepository: UserRepository,
    private courseRepository: CourseRepository,
    private orderRepository: OrderRepository,
    private bookingRepository: BookingRepository,
    private userContextService: UserContextService,
    private dataSource: DataSource,
  ) {}

  /**
   * 模块初始化：写入平台配置默认值（幂等）
   */
  async onModuleInit() {
    try {
      const defaults = [
        {
          key: 'invite_daily_use_limit',
          value: '50',
          desc: '邀请码单日使用上限，-1 表示不限制',
        },
        {
          key: 'withdraw_min_amount',
          value: '50',
          desc: '提现最低门槛（元）',
        },
      ];
      for (const cfg of defaults) {
        await this.dataSource.query(
          `INSERT INTO platform_configs
             (id, config_key, config_value, description, is_active, is_delete, created_at, updated_at)
           VALUES ($1, $2, $3, $4, true, false, NOW(), NOW())
           ON CONFLICT (config_key) DO NOTHING`,
          [generateSnowflakeId(), cfg.key, cfg.value, cfg.desc],
        );
      }
      this.logger.log('✅ 平台配置默认值已就绪');
    } catch (error: any) {
      this.logger.error(`❌ 初始化平台配置失败: ${error.message}`);
    }
  }

  // ─────────────────────────────────────────────────
  //  平台配置（管理员 CRUD）
  // ─────────────────────────────────────────────────

  /**
   * 获取全部平台配置
   */
  async getPlatformConfigs() {
    this.assertAdmin();
    const rows = await this.dataSource.query(
      `SELECT config_key, config_value, description, updated_at
       FROM platform_configs
       WHERE is_delete = false
       ORDER BY config_key ASC`,
    );
    return rows;
  }

  /**
   * 更新单个平台配置
   */
  async setPlatformConfig(key: string, dto: UpdatePlatformConfigDto): Promise<void> {
    this.assertAdmin();
    const affected = await this.dataSource.query(
      `UPDATE platform_configs
       SET config_value = $1,
           description  = COALESCE($2, description),
           updated_at   = NOW()
       WHERE config_key = $3 AND is_delete = false
       RETURNING config_key`,
      [dto.config_value, dto.description ?? null, key],
    );
    // UPDATE/DELETE RETURNING 返回 [rows, rowCount] 格式，规范化取第一项
    const rows = Array.isArray(affected[0]) ? affected[0] : affected;
    if (!rows || rows.length === 0) {
      throw new BadRequestException(`配置项 "${key}" 不存在`);
    }
  }

  /**
   * 验证当前用户是否为管理员
   */
  private assertAdmin(): void {
    const hasAdmin = this.userContextService.hasRole('admin');
    if (!hasAdmin) {
      throw new BadRequestException('仅管理员可执行此操作');
    }
  }

  /**
   * 根据 period 字符串计算时间范围
   */
  private getPeriodRange(
    period?: string,
    startDate?: string,
    endDate?: string,
  ): { start: Date | null; end: Date | null } {
    if (!period || period === 'all') return { start: null, end: null };
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = now;
    if (period === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'thisWeek') {
      const day = now.getDay() || 7;
      start = new Date(now);
      start.setDate(now.getDate() - day + 1);
      start.setHours(0, 0, 0, 0);
    } else if (period === 'thisMonth') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'threeMonths') {
      start = new Date(now);
      start.setMonth(now.getMonth() - 3);
    } else if (period === 'halfYear') {
      start = new Date(now);
      start.setMonth(now.getMonth() - 6);
    } else if (period === 'oneYear') {
      start = new Date(now);
      start.setFullYear(now.getFullYear() - 1);
    } else if (period === 'custom' && startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    }
    return { start, end };
  }

  /**
   * 管理员获取平台统计数据
   * @param period 时间筛选: today|thisWeek|thisMonth|threeMonths|halfYear|oneYear|all|custom
   */
  async getStats(
    period?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<AdminStatsDto> {
    this.assertAdmin();

    const { start: periodStart, end: periodEnd } = this.getPeriodRange(period, startDate, endDate);
    const hasFilter = !!(periodStart && periodEnd);

    // ===== 机构各状态统计（一次 SQL，避免参数名冲突）=====
    const [instCounts] = await this.dataSource.query(`
      SELECT
        COUNT(*)                                                         AS total,
        COUNT(*) FILTER (WHERE audit_status = 'pending')                 AS pending_audit,
        COUNT(*) FILTER (WHERE audit_status = 'contract_review')         AS contract_review,
        COUNT(*) FILTER (WHERE audit_status = 'approved')                AS contract_signed,
        COUNT(*) FILTER (WHERE audit_status = 'rejected')                AS rejected
      FROM institutions
      WHERE is_delete = false
    `);

    const totalInstitutions    = Number(instCounts.total);
    const pendingAuditCount    = Number(instCounts.pending_audit);
    const contractReviewCount  = Number(instCounts.contract_review);
    const contractSignedCount  = Number(instCounts.contract_signed);
    const rejectedInstitutions = Number(instCounts.rejected);

    // ===== 全量统计 =====
    const totalUsers    = await this.userRepository.getQuery().getCount();
    const totalCourses  = await this.courseRepository.getQuery().getCount();
    const totalOrders   = await this.orderRepository.getQuery().getCount();
    const totalBookings = await this.bookingRepository.getQuery().getCount();

    // ===== 期间新增统计 =====
    let periodInstitutions = totalInstitutions;
    let periodUsers        = totalUsers;
    let periodCourses      = totalCourses;
    let periodOrders       = totalOrders;
    let periodBookings     = totalBookings;

    if (hasFilter) {
      const [periodCounts] = await this.dataSource.query(
        `SELECT
          (SELECT COUNT(*) FROM institutions WHERE is_delete = false AND created_at >= $1 AND created_at <= $2) AS institutions,
          (SELECT COUNT(*) FROM users       WHERE is_delete = false AND created_at >= $1 AND created_at <= $2) AS users,
          (SELECT COUNT(*) FROM courses     WHERE is_delete = false AND created_at >= $1 AND created_at <= $2) AS courses,
          (SELECT COUNT(*) FROM orders      WHERE is_delete = false AND created_at >= $1 AND created_at <= $2) AS orders,
          (SELECT COUNT(*) FROM bookings    WHERE is_delete = false AND created_at >= $1 AND created_at <= $2) AS bookings`,
        [periodStart, periodEnd],
      );
      periodInstitutions = Number(periodCounts.institutions);
      periodUsers        = Number(periodCounts.users);
      periodCourses      = Number(periodCounts.courses);
      periodOrders       = Number(periodCounts.orders);
      periodBookings     = Number(periodCounts.bookings);
    }

    const commissionExpression = this.orderRepository.getPlatformCommissionExpression('order');

    // ===== 平台累计佣金（全量）=====
    const totalCommRow = await this.orderRepository
      .createQueryBuilder('order')
      .select(`COALESCE(SUM(${commissionExpression}), 0)`, 'total')
      .where('order.status IN (:...statuses)', {
        statuses: ['confirmed', 'completed', 'refund_rejected', 'refunded'],
      })
      .andWhere('order.is_delete = false')
      .getRawOne();
    const totalPlatformCommission = Number(totalCommRow?.total || 0);

    // ===== 期间佣金 =====
    let periodPlatformCommission = totalPlatformCommission;
    if (hasFilter) {
      const periodCommRow = await this.orderRepository
        .createQueryBuilder('order')
        .select(`COALESCE(SUM(${commissionExpression}), 0)`, 'total')
        .where('order.status IN (:...statuses)', {
          statuses: ['confirmed', 'completed', 'refund_rejected', 'refunded'],
        })
        .andWhere('order.is_delete = false')
        .andWhere('order.created_at >= :periodStart', { periodStart })
        .andWhere('order.created_at <= :periodEnd', { periodEnd })
        .getRawOne();
      periodPlatformCommission = Number(periodCommRow?.total || 0);
    }

    return {
      totalInstitutions,
      pendingAuditCount,
      contractReviewCount,
      contractSignedCount,
      rejectedInstitutions,
      totalUsers,
      totalCourses,
      totalOrders,
      totalBookings,
      periodInstitutions,
      periodUsers,
      periodCourses,
      periodOrders,
      periodBookings,
      totalPlatformCommission,
      periodPlatformCommission,
      // 向后兼容旧字段
      pendingReview: pendingAuditCount + contractReviewCount,
      approvedInstitutions: contractSignedCount,
    };
  }

  /**
   * 管理员设置机构佣金
   */
  async setCommission(
    id: string,
    commissionType: string,
    commissionValue: number,
  ): Promise<void> {
    this.assertAdmin();
    const institution = await this.institutionRepository.findOneById(id);
    if (!institution) throw new BadRequestException('机构不存在');
    if (!['percentage', 'fixed_amount'].includes(commissionType)) {
      throw new BadRequestException('佣金类型无效，应为 percentage 或 fixed_amount');
    }
    if (commissionValue < 0) throw new BadRequestException('佣金数值不能为负数');
    if (commissionType === 'percentage' && commissionValue > 1) {
      throw new BadRequestException('百分比佣金不能超过 1（100%）');
    }
    await this.institutionRepository.update(id, {
      commission_type: commissionType,
      commission_value: commissionValue,
    } as any);
  }

  /**
   * 管理员获取机构列表（带分页和筛选）
   */
  async getInstitutionList(
    page: number = 1,
    pageSize: number = 10,
    auditStatus?: string,
  ) {
    this.assertAdmin();

    const whereCondition = auditStatus ? { audit_status: auditStatus } : {};

    return this.institutionRepository.paginate(page, pageSize, {
      where: whereCondition,
      order: { created_at: 'DESC' },
    });
  }

  /**
   * 管理员审核机构
   * 审核通过 → contract_signing（待签约），而非直接 approved
   * 审核驳回 → rejected
   */
  @Transactional()
  async auditInstitution(id: string, dto: AuditInstitutionDto): Promise<void> {
    this.assertAdmin();

    const institution = await this.institutionRepository.findOneById(id);
    if (!institution) {
      throw new BadRequestException('机构不存在');
    }

    if (dto.auditStatus === 'rejected' && !dto.rejectReason) {
      throw new BadRequestException('驳回时必须填写驳回原因');
    }

    // 审核通过 → 进入签约流程（contract_signing），而非直接 approved
    const newStatus =
      dto.auditStatus === 'approved' ? 'contract_signing' : dto.auditStatus;

    const updateData: any = {
      audit_status: newStatus,
    };
    if (dto.auditStatus === 'rejected') {
      updateData.reject_reason = dto.rejectReason;
    } else {
      updateData.reject_reason = undefined;
    }

    await this.institutionRepository.update(id, updateData);
  }

  /**
   * 管理员审核签约凭证
   * contract_review → approved（通过）或 contract_signing（驳回，让机构重新签约）
   */
  @Transactional()
  async reviewContract(
    id: string,
    dto: ReviewContractDto,
  ): Promise<void> {
    this.assertAdmin();

    const institution = await this.institutionRepository.findOneById(id);
    if (!institution) {
      throw new BadRequestException('机构不存在');
    }

    if (institution.audit_status !== 'contract_review') {
      throw new BadRequestException(
        '当前状态不允许审核签约，仅"签约审核中"状态可操作',
      );
    }

    if (dto.status === 'rejected' && !dto.rejectReason) {
      throw new BadRequestException('驳回签约时必须填写驳回原因');
    }

    if (dto.status === 'approved') {
      // 签约审核通过 → 机构正式上线
      await this.institutionRepository.update(id, {
        audit_status: 'approved',
        reject_reason: undefined,
      } as any);
    } else {
      // 签约审核驳回 → 退回待签约状态，机构需重新签约
      await this.institutionRepository.update(id, {
        audit_status: 'contract_signing',
        reject_reason: dto.rejectReason,
        contract_screenshot: undefined,
        contract_signed_at: undefined,
      } as any);
    }
  }

  /**
   * 管理员编辑机构信息
   * 与普通 update 不同：
   * 1. 不检查用户-机构关联关系（管理员可编辑任何机构）
   * 2. 允许编辑敏感字段（资质信息）
   * 3. 需要管理员角色
   */
  @Transactional()
  async updateInstitution(id: string, dto: UpdateInstitutionDto): Promise<void> {
    this.assertAdmin();

    const institution = await this.institutionRepository.findOneById(id);
    if (!institution) {
      throw new BadRequestException('机构不存在');
    }

    // 冻结状态下，即使管理员也无法修改机构信息
    if (institution.audit_status === 'frozen') {
      throw new BadRequestException('该机构已被冻结，信息完全只读，无法修改');
    }

    // 管理员可以编辑所有字段（不限制敏感字段）
    // 从 DTO 中分离出子表字段
    const { accounts, teachers, honors, showcases, teaching_environments, ...entityData } = dto as any;

    // 更新主表（只传实体列字段）
    await this.institutionRepository.update(id, entityData);

    // 更新 PostGIS location 字段
    const updatedLatitude = dto.latitude ?? institution.latitude;
    const updatedLongitude = dto.longitude ?? institution.longitude;
    await this.updateLocationField(id, updatedLatitude, updatedLongitude);

    // 如果提供了子表数据，删除旧的并重新保存
    if (honors !== undefined) {
      await this.honorRepository.deleteByInstitutionId(id);
    }
    if (showcases !== undefined) {
      await this.showcaseRepository.deleteByInstitutionId(id);
    }
    if (teaching_environments !== undefined) {
      await this.teachingEnvRepository.deleteByInstitutionId(id);
    }

    // 保存新的子表数据
    await this.saveSubTables(id, dto);
  }

  /**
   * 更新 PostGIS location 字段
   */
  private async updateLocationField(
    institutionId: string,
    latitude?: number,
    longitude?: number,
  ): Promise<void> {
    if (latitude && longitude) {
      await this.dataSource.query(
        `UPDATE institutions 
         SET location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
         WHERE id = $3`,
        [longitude, latitude, institutionId],
      );
    }
  }

  /**
   * 保存子表数据
   */
  private async saveSubTables(
    institutionId: string,
    dto: UpdateInstitutionDto,
  ): Promise<void> {
    // 保存荣誉
    if (dto.honors && dto.honors.length > 0) {
      const honors = dto.honors.map((h) =>
        this.honorRepository.create({
          ...h,
          institution_id: institutionId,
          honor_date: h.honor_date ? new Date(h.honor_date) : undefined,
        }),
      );
      await this.honorRepository.save(honors);
    }

    // 保存风采
    if (dto.showcases && dto.showcases.length > 0) {
      const showcases = dto.showcases.map((s) =>
        this.showcaseRepository.create({
          ...s,
          institution_id: institutionId,
          type: s.type || 'student_work',
        }),
      );
      await this.showcaseRepository.save(showcases);
    }

    // 保存教学环境
    if (dto.teaching_environments && dto.teaching_environments.length > 0) {
      const envs = dto.teaching_environments.map((e) =>
        this.teachingEnvRepository.create({
          ...e,
          institution_id: institutionId,
        }),
      );
      await this.teachingEnvRepository.save(envs);
    }
  }

  /**
   * 管理员冻结机构（已审核通过的机构可被冻结）
   */
  @Transactional()
  async freezeInstitution(id: string): Promise<void> {
    this.assertAdmin();

    const institution = await this.institutionRepository.findOneById(id);
    if (!institution) {
      throw new BadRequestException('机构不存在');
    }

    if (institution.audit_status === 'frozen') {
      throw new BadRequestException('该机构已处于冻结状态');
    }

    if (!['approved', 'contract_review', 'contract_signing'].includes(institution.audit_status)) {
      throw new BadRequestException('只有已审核通过的机构才能被冻结');
    }

    await this.institutionRepository.update(id, { audit_status: 'frozen' } as any);
  }

  /**
   * 管理员解冻机构（自动恢复至 approved 状态）
   */
  @Transactional()
  async unfreezeInstitution(id: string): Promise<void> {
    this.assertAdmin();

    const institution = await this.institutionRepository.findOneById(id);
    if (!institution) {
      throw new BadRequestException('机构不存在');
    }

    if (institution.audit_status !== 'frozen') {
      throw new BadRequestException('该机构未处于冻结状态');
    }

    await this.institutionRepository.update(id, { audit_status: 'approved' } as any);
  }

  /**
   * 获取用户列表（分页 + 搜索）
   */
  async getUserList(
    page: number = 1,
    pageSize: number = 20,
    keyword?: string,
  ) {
    const qb = this.userRepository.getQuery();

    if (keyword) {
      qb.andWhere(
        '(entity.nickname ILIKE :keyword OR entity.phone ILIKE :keyword OR entity.username ILIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    qb.orderBy('entity.created_at', 'DESC');

    const skip = (page - 1) * pageSize;
    const [data, total] = await qb.skip(skip).take(pageSize).getManyAndCount();

    // 移除敏感字段
    const safeData = data.map((user: any) => {
      const { password, sessionKey, ...rest } = user;
      return rest;
    });

    return {
      data: safeData,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
