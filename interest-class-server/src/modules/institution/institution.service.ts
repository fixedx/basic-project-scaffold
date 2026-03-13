import { Injectable, BadRequestException } from '@nestjs/common';
import { InstitutionRepository } from './repositories/institution.repository';
import { InstitutionEntity } from './entities/institution.entity';
import { InstitutionHonorRepository } from './repositories/institution-honor.repository';
import { InstitutionShowcaseRepository } from './repositories/institution-showcase.repository';
import { InstitutionTeachingEnvRepository } from './repositories/institution-teaching-env.repository';
import { UserRepository } from '@/modules/auth/repositories/user.repository';
import { UserInstitutionRepository } from '@/modules/auth/repositories/user-institution.repository';
import { TeacherRepository } from '@/modules/teacher/repositories/teacher.repository';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { InstitutionStatsDto } from './dto/institution-stats.dto';
import { Transactional } from '@/common/decorators/transaction.decorator';
import { DataSource } from 'typeorm';
import { UserContextService } from '@/common/services/user-context.service';
import { hashPassword } from '@/utils/crypto.util';
import { CourseRepository } from '@/modules/course/repositories/course.repository';
import { CourseSkuRepository } from '@/modules/course/repositories/course-sku.repository';
import { OrderRepository } from '@/modules/order/repositories/order.repository';
import { UserInviteCodeRepository } from '@/modules/invite/repositories/user-invite-code.repository';
import { MoneyMath } from '@/common/utils/money.util';
import { BookingRepository } from '@/modules/booking/repositories/booking.repository';
import { CheckInRepository } from '@/modules/check-in/repositories/check-in.repository';
import { ClassroomRepository } from '@/modules/classroom/repositories/classroom.repository';

@Injectable()
export class InstitutionService {
  constructor(
    private institutionRepository: InstitutionRepository,
    private honorRepository: InstitutionHonorRepository,
    private showcaseRepository: InstitutionShowcaseRepository,
    private teachingEnvRepository: InstitutionTeachingEnvRepository,
    private userRepository: UserRepository,
    private userInstitutionRepository: UserInstitutionRepository,
    private userContextService: UserContextService,
    private dataSource: DataSource,
    private newTeacherRepository: TeacherRepository,
    private courseRepository: CourseRepository,
    private courseSkuRepository: CourseSkuRepository,
    private orderRepository: OrderRepository,
    private userInviteCodeRepository: UserInviteCodeRepository,
    private bookingRepository: BookingRepository,
    private checkInRepository: CheckInRepository,
    private classroomRepository: ClassroomRepository,
  ) {}

  /**
   * 创建机构（草稿状态）
   */
  @Transactional()
  async create(dto: CreateInstitutionDto): Promise<string> {
    // 分离子表字段（accounts, teachers, honors, showcases 不是实体列）
    const { accounts, teachers: _teachers, honors: _honors, showcases: _showcases, teaching_environments: _teachingEnvs, ...institutionData } = dto as any;

    // 有账号信息时：验证并创建 owner 用户
    let ownerUser: any = null;
    if (accounts && accounts.length > 0) {
      // ⚠️ 校验：必须有一个 owner 角色
      const ownerAccount = accounts.find((acc: any) => acc.role === 'owner');
      if (!ownerAccount) {
        throw new BadRequestException('账号列表中必须包含一个 owner 角色');
      }

      // 验证所有手机号的唯一性
      const phoneSet = new Set<string>();
      for (const account of accounts) {
        if (phoneSet.has(account.phone)) {
          throw new BadRequestException(`手机号 ${account.phone} 重复`);
        }
        phoneSet.add(account.phone);
      }

      // 先创建/查询 owner 用户，获取 user_id 用于填充 created_by
      ownerUser = await this.userRepository.findByPhone(ownerAccount.phone);
      if (!ownerUser) {
        const crypto = require('crypto');
        const uniqueId = crypto.randomUUID();
        ownerUser = this.userRepository.create({
          username: ownerAccount.phone,
          phone: ownerAccount.phone,
          nickname: ownerAccount.real_name || ownerAccount.phone,
          openid: `institution_phone_${ownerAccount.phone}_${uniqueId}`,
        });
        const savedUser = (await this.userRepository.save(ownerUser)) as any;
        ownerUser = savedUser;
      }

      if (!ownerUser || !ownerUser.id) {
        throw new BadRequestException(`创建 owner 用户失败: ${ownerAccount.phone}`);
      }
    }

    // 创建机构信息
    const institution = this.institutionRepository.create({
      ...institutionData,
      audit_status: 'draft',
      ...(ownerUser ? { created_by: ownerUser.id } : {}),
    } as Partial<InstitutionEntity>);

    const saved = await this.institutionRepository.save(institution);
    const institutionId = saved.id;
    
    console.log('[InstitutionService] 创建机构成功:', {
      institutionId,
      savedType: typeof saved,
      savedKeys: Object.keys(saved || {}),
    });

    // 4. 为每个账号创建或关联用户记录（支持多租户，仅当提供了 accounts 时）
    if (accounts && accounts.length > 0) {
      const ownerAccount = accounts.find((acc: any) => acc.role === 'owner');
      for (const account of accounts) {
        let user: any;
        
        // owner 已经在前面创建了，直接复用
        if (ownerUser && ownerAccount && account.phone === ownerAccount.phone) {
          user = ownerUser;
        } else {
          // 查找或创建其他账号的用户
          user = await this.userRepository.findByPhone(account.phone);
          if (!user) {
            const crypto = require('crypto');
            const uniqueId = crypto.randomUUID();
            user = this.userRepository.create({
              username: account.phone,
              phone: account.phone,
              nickname: account.real_name || account.phone,
              openid: `institution_phone_${account.phone}_${uniqueId}`,
            });
            const savedUser = (await this.userRepository.save(user)) as any;
            user = savedUser;
          }
        }

        // 确保 user 存在
        if (!user || !user.id) {
          throw new BadRequestException(`创建用户失败: ${account.phone}`);
        }

        // 建立用户-机构关联（一个用户可以关联多个机构）
        const role = account.role || 'admin';
        
        // 检查该用户是否已关联此机构
        const existingRelation = await this.userInstitutionRepository.findOne({
          where: {
            user_id: user.id,
            institution_id: institutionId,
            is_delete: false,
          },
        });
        
        if (!existingRelation) {
          await this.userInstitutionRepository.addUserInstitution(
            user.id,
            institutionId,
            role,
          );
        }
      }
    }

    // 5. 保存子表数据
    await this.saveSubTables(institutionId, dto);

    // 6. 更新 PostGIS location 字段
    await this.updateLocationField(institutionId, dto.latitude, dto.longitude);

    // 7. 返回机构ID
    return institutionId;
  }

  /**
   * 更新 PostGIS location 字段
   * 当 latitude 和 longitude 存在时，自动计算并更新 geography 类型的 location 字段
   */
  private async updateLocationField(
    institutionId: string,
    latitude?: number,
    longitude?: number,
  ): Promise<void> {
    if (latitude && longitude) {
      // 使用 PostGIS 函数更新 location 字段
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
    dto: CreateInstitutionDto | UpdateInstitutionDto,
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
   * 更新机构信息
   */
  @Transactional()
  async update(id: string, dto: UpdateInstitutionDto): Promise<void> {
    const institution = await this.institutionRepository.findOneById(id);
    if (!institution) {
      throw new BadRequestException('机构不存在');
    }

    // 检查权限（当前用户必须是该机构的成员）
    const userId = this.userContextService.getCurrentUserId();
    const hasPermission = await this.userInstitutionRepository.hasInstitution(
      userId,
      id,
    );
    if (!hasPermission) {
      throw new BadRequestException('无权限修改该机构');
    }

    // 冻结状态：所有字段只读，任何人都不能修改
    if (institution.audit_status === 'frozen') {
      throw new BadRequestException('该机构已被冻结，信息完全只读，无法修改');
    }

    // 敏感字段列表（资质相关字段）
    const sensitiveFields = [
      'license_no',
      'license_img',
      'legal_person',
    ];

    // 审核通过后不允许修改敏感字段
    if (institution.audit_status === 'approved') {
      const hasSensitiveChange = sensitiveFields.some(
        (field) => dto[field] !== undefined,
      );
      if (hasSensitiveChange) {
        throw new BadRequestException(
          '已审核通过的机构不允许修改营业执照、法人等资质信息',
        );
      }
    }

    // 从 DTO 中分离出子表字段（accounts, teachers, honors, showcases, teaching_environments 不是实体列）
    const { accounts, teachers, honors, showcases, teaching_environments, ...entityData } = dto as any;

    // 更新主表（只传实体列字段）
    await this.institutionRepository.update(id, entityData);

    // 更新 PostGIS location 字段（如果 latitude/longitude 有更新）
    // 需要检查 dto 中是否包含位置更新，或者直接基于当前数据更新
    const updatedLatitude = dto.latitude ?? institution.latitude;
    const updatedLongitude = dto.longitude ?? institution.longitude;
    await this.updateLocationField(id, updatedLatitude, updatedLongitude);

    // 删除旧的子表数据
    await this.honorRepository.deleteByInstitutionId(id);
    await this.showcaseRepository.deleteByInstitutionId(id);
    await this.teachingEnvRepository.deleteByInstitutionId(id);

    // 保存新的子表数据
    await this.saveSubTables(id, dto);
  }

  /**
   * 提交审核（未登录状态下可调用，用于机构入驻后直接提交审核）
   */
  @Transactional()
  async submit(id: string): Promise<void> {
    const institution = await this.institutionRepository.findOneById(id);
    if (!institution) {
      throw new BadRequestException('机构不存在');
    }

    // 只有草稿和驳回状态可以提交
    if (!['draft', 'rejected'].includes(institution.audit_status)) {
      throw new BadRequestException('该状态下不允许提交审核');
    }

    // 校验必填字段
    this.validateRequiredFields(institution);

    await this.institutionRepository.update(id, {
      audit_status: 'pending',
      reject_reason: undefined,
    });
  }

  /**
   * 提交签约凭证（机构端调用）
   * 状态：contract_signing → contract_review
   */
  @Transactional()
  async submitContract(id: string, contractScreenshot: string): Promise<void> {
    const institution = await this.institutionRepository.findOneById(id);
    if (!institution) {
      throw new BadRequestException('机构不存在');
    }

    // 检查权限（当前用户必须是该机构的成员）
    const userId = this.userContextService.getCurrentUserId();
    const hasPermission = await this.userInstitutionRepository.hasInstitution(
      userId,
      id,
    );
    if (!hasPermission) {
      throw new BadRequestException('无权限操作该机构');
    }

    // 允许提交签约凭证的状态：空、contract_signing、approved 但未签约
    const approvedWithoutContract =
      institution.audit_status === 'approved' && !institution.contract_screenshot;
    if (
      institution.audit_status &&
      institution.audit_status !== 'contract_signing' &&
      !approvedWithoutContract
    ) {
      throw new BadRequestException('当前状态不允许提交签约凭证');
    }

    await this.institutionRepository.update(id, {
      audit_status: 'contract_review',
      contract_screenshot: contractScreenshot,
      contract_signed_at: new Date(),
    });
  }

  /**
   * 获取当前用户的机构信息（单个，保留用于向后兼容）
   */
  async getMyInstitution() {
    return this.institutionRepository.findByCurrentUser();
  }

  /**
   * 获取当前用户的所有机构列表
   */
  async getMyInstitutions() {
    return this.institutionRepository.findAllByCurrentUser();
  }

  /**
   * 根据ID获取机构详情（包含子表数据）
   */
  async getById(id: string) {
    // 获取机构基本信息
    const institution = await this.institutionRepository.findOneById(id);
    if (!institution) {
      return null;
    }

    // 加载子表数据（使用新的teachers表）
    const [teachers, honors, showcases, teaching_environments] = await Promise.all([
      this.newTeacherRepository
        .getQuery()
        .andWhere('entity.institution_id = :institutionId', { institutionId: id })
        .andWhere('entity.status = :status', { status: 'active' })
        .orderBy('entity.sort_order', 'ASC')
        .getMany(),
      this.honorRepository
        .getQuery()
        .andWhere('entity.institution_id = :institutionId', { institutionId: id })
        .orderBy('entity.sort_order', 'ASC')
        .getMany(),
      this.showcaseRepository
        .getQuery()
        .andWhere('entity.institution_id = :institutionId', { institutionId: id })
        .orderBy('entity.sort_order', 'ASC')
        .getMany(),
      this.teachingEnvRepository
        .getQuery()
        .andWhere('entity.institution_id = :institutionId', { institutionId: id })
        .orderBy('entity.sort_order', 'ASC')
        .getMany(),
    ]);

    // 组装完整数据（处理字段名差异）
    return {
      ...institution,
      teachers: teachers.map(t => ({
        id: t.id,
        name: t.name,
        avatar_url: t.photo,  // photo -> avatar_url
        title: t.title,
        bio: t.bio,
        subjects: t.subjects,
        years_of_experience: t.years_of_experience,
      })),
      honors,
      showcases,
      teaching_environments,
    };
  }

  /**
   * 获取机构列表（支持按状态筛选和距离计算）
   * @param page - 页码
   * @param pageSize - 每页数量
   * @param status - 审核状态筛选条件
   * @param userLatitude - 用户纬度（可选，用于距离计算）
   * @param userLongitude - 用户经度（可选，用于距离计算）
   */
  /**
   * 获取机构列表（支持分页兼容模式、距离排序和距离筛选）
   * @param page - 页码
   * @param pageSize - 每页数量
   * @param status - 审核状态筛选
   * @param userLatitude - 用户纬度
   * @param userLongitude - 用户经度
   * @param maxDistanceKm - 最大距离（公里）
   */
  async getList(
    page?: number,
    pageSize?: number,
    status?: string,
    userLatitude?: number,
    userLongitude?: number,
    maxDistanceKm?: number,
    keyword?: string,
  ) {
    const result = await this.institutionRepository.findInstitutions(
      page,
      pageSize,
      status,
      userLatitude,
      userLongitude,
      maxDistanceKm,
      keyword,
    );
    
    // 获取全平台最高让利比例（用于计算立减金额）
    const maxShareRatio = await this.userInviteCodeRepository.getMaxShareRatio();

    // 计算每个机构的最大立减和返现金额
    // 最高返现 = 最高SKU价格 × 课程返现比例
    // 最高立减 = 最高返现 × 最高让利比例
    const addMaxCashback = async (institution: any) => {
      // 直接使用 courseRepository 查询该机构的课程
      const courses = await this.courseRepository.getQuery()
        .andWhere('entity.institution_id = :institutionId', { institutionId: institution.id })
        .andWhere('entity.is_online = :isOnline', { isOnline: true })
        .andWhere('entity.cashback_enabled = :enabled', { enabled: true })
        .andWhere('entity.type != :trialType', { trialType: 'trial' })
        .getMany();
      
      let maxCashback = 0;
      for (const course of courses) {
        if (course.cashback_ratio > 0) {
          const skus = await this.courseSkuRepository.getQuery()
            .andWhere('entity.course_id = :courseId', { courseId: course.id })
            .getMany();
          
          if (skus.length > 0) {
            const maxPrice = Math.max(...skus.map((s: any) => Number(s.total_price) || 0));
            // 分单位运算，避免浮点误差
            const cashbackAmountFen = MoneyMath.percentOfFen(MoneyMath.yuan2fen(maxPrice), Number(course.cashback_ratio));
            const cashbackAmount = MoneyMath.fen2yuan(cashbackAmountFen);
            if (cashbackAmount > maxCashback) {
              maxCashback = cashbackAmount;
            }
          }
        }
      }
      institution.max_cashback_amount = maxCashback;
      institution.max_discount_amount = MoneyMath.fen2yuan(MoneyMath.percentOfFen(MoneyMath.yuan2fen(maxCashback), maxShareRatio));
      return institution;
    };
    
    // 处理分页和非分页两种情况
    if (Array.isArray(result)) {
      // 非分页模式
      return Promise.all(result.map(addMaxCashback));
    } else {
      // 分页模式
      const enhancedData = await Promise.all(result.data.map(addMaxCashback));
      return {
        ...result,
        data: enhancedData,
      };
    }
  }

  /**
   * 获取当前登录机构的信息（机构端使用）
   */
  async getCurrentInstitution() {
    // 从 JWT token 中获取 institutionId
    const institutionId = this.userContextService.get('institutionId');

    if (!institutionId) {
      throw new BadRequestException('未找到机构信息');
    }

    // 使用 getById 获取完整数据（包含子表：teachers, honors, showcases）
    const institution = await this.getById(institutionId);

    if (!institution) {
      throw new BadRequestException('未找到关联的机构');
    }

    return institution;
  }

  /**
   * 获取机构统计数据（机构端Dashboard使用）
   * @param period 时间段: thisMonth | threeMonths | halfYear | oneYear | all | custom
   * @param startDate 自定义开始日期 (仅 period=custom)
   * @param endDate 自定义结束日期 (仅 period=custom)
   */
  async getInstitutionStats(
    period?: string,
    startDate?: string,
    endDate?: string,
    teacherStatus?: string,
  ): Promise<InstitutionStatsDto> {
    // 获取当前机构
    const institution = await this.getCurrentInstitution();
    const institutionId = institution.id;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const defaultMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // ===== 计算筛选时间范围 =====
    let periodStart: Date | null = null;
    let periodEnd: Date | null = null;
    const hasPeriodFilter = !!period && period !== 'all';

    if (period === 'thisMonth') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'threeMonths') {
      periodStart = new Date(now);
      periodStart.setMonth(periodStart.getMonth() - 3);
    } else if (period === 'halfYear') {
      periodStart = new Date(now);
      periodStart.setMonth(periodStart.getMonth() - 6);
    } else if (period === 'oneYear') {
      periodStart = new Date(now);
      periodStart.setFullYear(periodStart.getFullYear() - 1);
    } else if (period === 'custom') {
      if (startDate) periodStart = new Date(startDate);
      if (endDate) {
        periodEnd = new Date(endDate);
        periodEnd.setHours(23, 59, 59, 999);
      }
    }
    // period === 'all' or undefined → 不限制时间

    // 时段营收开始：有筛选时段 → periodStart, 否则默认本月
    const revenueStart = hasPeriodFilter && periodStart ? periodStart : defaultMonthStart;
    const revenueEnd = hasPeriodFilter && periodEnd ? periodEnd : null;

    // 签到筛选开始：有筛选时段 → periodStart, 否则默认今天
    const checkInStart = hasPeriodFilter && periodStart ? periodStart : todayStart;
    const checkInEnd = hasPeriodFilter && periodEnd ? periodEnd : null;

    // ===== 构建查询 =====

    // 1. 课程数量（受时间筛选影响）
    const courseCountQb = this.courseRepository
      .getQuery()
      .andWhere('entity.institution_id = :institutionId', { institutionId });
    if (hasPeriodFilter && periodStart) {
      courseCountQb.andWhere('entity.created_at >= :courseStart', { courseStart: periodStart });
    }
    if (hasPeriodFilter && periodEnd) {
      courseCountQb.andWhere('entity.created_at <= :courseEnd', { courseEnd: periodEnd });
    }

    // 2. 订单数量（受时间筛选影响，包含所有状态）
    const orderCountQb = this.orderRepository
      .getQuery()
      .andWhere('entity.institution_id = :institutionId', { institutionId });
    if (hasPeriodFilter && periodStart) {
      orderCountQb.andWhere('entity.created_at >= :pStart', { pStart: periodStart });
    }
    if (hasPeriodFilter && periodEnd) {
      orderCountQb.andWhere('entity.created_at <= :pEnd', { pEnd: periodEnd });
    }

    // 3. 学员数量（受时间筛选影响）
    const studentQb = this.orderRepository
      .createQueryBuilder('order')
      .select('COUNT(DISTINCT order.user_id)', 'count')
      .where('order.institution_id = :institutionId', { institutionId })
      .andWhere('order.status NOT IN (:...excludeStatuses)', {
        excludeStatuses: ['cancelled'],
      })
      .andWhere('order.is_delete = false');
    if (hasPeriodFilter && periodStart) {
      studentQb.andWhere('order.created_at >= :pStart', { pStart: periodStart });
    }
    if (hasPeriodFilter && periodEnd) {
      studentQb.andWhere('order.created_at <= :pEnd', { pEnd: periodEnd });
    }

    // 5. 时段营收
    const periodRevenueQb = this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.paid_amount)', 'total')
      .where('order.institution_id = :institutionId', { institutionId })
      .andWhere('order.status IN (:...statuses)', {
        statuses: ['confirmed', 'completed'],
      })
      .andWhere('order.is_delete = false')
      .andWhere('order.created_at >= :revenueStart', { revenueStart });
    if (revenueEnd) {
      periodRevenueQb.andWhere('order.created_at <= :revenueEnd', { revenueEnd });
    }

    // 10. 签到数（受时间筛选影响）
    const checkInQb = this.checkInRepository
      .createQueryBuilder('checkin')
      .where('checkin.institution_id = :institutionId', { institutionId })
      .andWhere('checkin.is_delete = false')
      .andWhere('checkin.created_at >= :checkInStart', { checkInStart });
    if (checkInEnd) {
      checkInQb.andWhere('checkin.created_at <= :checkInEnd', { checkInEnd });
    }

    // ===== 并行执行所有查询 =====
    // 10. 教师数量（受时间筛选影响，可按状态筛选）
    const teacherCountQb = this.newTeacherRepository
      .getQuery()
      .andWhere('entity.institution_id = :institutionId', { institutionId });
    if (teacherStatus) {
      teacherCountQb.andWhere('entity.status = :teacherStatus', { teacherStatus });
    }
    if (hasPeriodFilter && periodStart) {
      teacherCountQb.andWhere('entity.created_at >= :teacherStart', { teacherStart: periodStart });
    }
    if (hasPeriodFilter && periodEnd) {
      teacherCountQb.andWhere('entity.created_at <= :teacherEnd', { teacherEnd: periodEnd });
    }

    // 12. 教室数量（受时间筛选影响）
    const classroomCountQb = this.classroomRepository
      .getQuery()
      .andWhere('entity.institution_id = :institutionId', { institutionId });
    if (hasPeriodFilter && periodStart) {
      classroomCountQb.andWhere('entity.created_at >= :classroomStart', { classroomStart: periodStart });
    }
    if (hasPeriodFilter && periodEnd) {
      classroomCountQb.andWhere('entity.created_at <= :classroomEnd', { classroomEnd: periodEnd });
    }

    const [
      courseCount,
      orderCount,
      studentResult,
      revenueResult,
      periodRevenueResult,
      todayRevenueResult,
      pendingOrderCount,
      refundingOrderCount,
      pendingCancelBookingCount,
      teacherCount,
      classroomCount,
      completedOrderCount,
      totalValidOrderCount,
    ] = await Promise.all([
      // 1. 课程数量（受时间筛选影响）
      courseCountQb.getCount(),

      // 2. 订单数量
      orderCountQb.getCount(),

      // 3. 学员数量
      studentQb.getRawOne(),

      // 4. 总营收（不受时间筛选，始终为全部）
      this.orderRepository
        .createQueryBuilder('order')
        .select('SUM(order.paid_amount)', 'total')
        .where('order.institution_id = :institutionId', { institutionId })
        .andWhere('order.status IN (:...statuses)', {
          statuses: ['confirmed', 'completed'],
        })
        .andWhere('order.is_delete = false')
        .getRawOne(),

      // 5. 时段营收
      periodRevenueQb.getRawOne(),

      // 6. 今日收入（始终为今日）
      this.orderRepository
        .createQueryBuilder('order')
        .select('SUM(order.paid_amount)', 'total')
        .where('order.institution_id = :institutionId', { institutionId })
        .andWhere('order.status IN (:...statuses)', {
          statuses: ['confirmed', 'completed'],
        })
        .andWhere('order.is_delete = false')
        .andWhere('order.created_at >= :todayStart', { todayStart })
        .getRawOne(),

      // 7. 待确认订单数（不受时间筛选）
      this.orderRepository
        .getQuery()
        .andWhere('entity.institution_id = :institutionId', { institutionId })
        .andWhere('entity.status = :status', { status: 'pending_confirm' })
        .getCount(),

      // 8. 退款处理中订单数（不受时间筛选）
      this.orderRepository
        .getQuery()
        .andWhere('entity.institution_id = :institutionId', { institutionId })
        .andWhere('entity.status IN (:...statuses)', {
          statuses: ['refund_pending', 'refunding'],
        })
        .getCount(),

      // 9. 取消预约待审核数（不受时间筛选）
      this.bookingRepository
        .getQuery()
        .andWhere('entity.institution_id = :institutionId', { institutionId })
        .andWhere('entity.status = :status', { status: 'pending_cancel' })
        .getCount(),

      // 10. 教师数量（受时间筛选影响）
      teacherCountQb.getCount(),

      // 12. 教室数量（受时间筛选影响）
      classroomCountQb.getCount(),

      // 13. 完课订单数（用于计算完课率）
      this.orderRepository
        .getQuery()
        .andWhere('entity.institution_id = :institutionId', { institutionId })
        .andWhere('entity.status = :status', { status: 'completed' })
        .getCount(),

      // 14. 有效订单总数（确认+完成，不包含退款）= 完课率分母
      this.orderRepository
        .getQuery()
        .andWhere('entity.institution_id = :institutionId', { institutionId })
        .andWhere('entity.status IN (:...statuses)', {
          statuses: ['confirmed', 'completed'],
        })
        .getCount(),
    ]);

    const studentCount = parseInt(studentResult?.count || '0', 10);
    const totalRevenue = parseFloat(revenueResult?.total || '0');
    const thisMonthRevenue = parseFloat(periodRevenueResult?.total || '0');
    const todayRevenue = parseFloat(todayRevenueResult?.total || '0');

    // 完课率 = 已完成订单 / (已确认 + 已完成)订单 × 100
    const completionRate = totalValidOrderCount > 0
      ? Math.round((completedOrderCount / totalValidOrderCount) * 100)
      : 0;

    return {
      courseCount,
      studentCount,
      orderCount,
      teacherCount,
      classroomCount,
      completionRate,
      totalRevenue,
      thisMonthRevenue,
      todayRevenue,
      pendingOrderCount,
      refundingOrderCount,
      pendingCancelBookingCount,
      avgRating: Number(institution.avg_rating) || 0,
      reviewCount: institution.review_count || 0,
    };
  }

  /**
   * 获取机构学员列表
   * 从机构订单中聚合学员信息，展示每个学员的课程及进度
   */
  async getInstitutionStudents(
    page?: number,
    pageSize?: number,
    keyword?: string,
    period?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const institutionId =
      this.userContextService.get<string>('institutionId');
    if (!institutionId) {
      throw new BadRequestException('未找到机构信息');
    }

    // 计算时间过滤范围
    const now = new Date();
    let periodStart: Date | null = null;
    let periodEnd: Date | null = null;
    const hasPeriodFilter = !!period && period !== 'all';

    if (period === 'thisMonth') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'threeMonths') {
      periodStart = new Date(now);
      periodStart.setMonth(periodStart.getMonth() - 3);
    } else if (period === 'halfYear') {
      periodStart = new Date(now);
      periodStart.setMonth(periodStart.getMonth() - 6);
    } else if (period === 'oneYear') {
      periodStart = new Date(now);
      periodStart.setFullYear(periodStart.getFullYear() - 1);
    } else if (period === 'custom') {
      if (startDate) periodStart = new Date(startDate);
      if (endDate) {
        periodEnd = new Date(endDate);
        periodEnd.setHours(23, 59, 59, 999);
      }
    }

    // 查询该机构所有有效订单，关联学员信息
    const params: any[] = [institutionId];
    let dateCondition = '';
    if (hasPeriodFilter && periodStart) {
      params.push(periodStart);
      dateCondition += ` AND o.created_at >= $${params.length}`;
    }
    if (hasPeriodFilter && periodEnd) {
      params.push(periodEnd);
      dateCondition += ` AND o.created_at <= $${params.length}`;
    }

    let sql = `
      SELECT 
        o.id as order_id,
        o.user_id,
        o.course_id,
        o.course_name,
        o.sku_name,
        o.total_lessons,
        o.completed_lessons,
        o.status as order_status,
        o.student_name,
        o.student_phone,
        o.paid_amount,
        o.created_at as order_created_at,
        b.child_id,
        c.name as child_name,
        c.avatar as child_avatar,
        c.gender as child_gender,
        c.birthday as child_birthday,
        c.age as child_age
      FROM orders o
      LEFT JOIN bookings b ON b.id = o.booking_id AND b.is_delete = false
      LEFT JOIN children c ON c.id = b.child_id AND c.is_delete = false
      WHERE o.institution_id = $1
        AND o.is_delete = false
        AND o.status NOT IN ('cancelled', 'pending')
        ${dateCondition}
      ORDER BY o.created_at DESC
    `;

    const rawData = await this.dataSource.query(sql, params);

    // 按学员分组（优先用 child_id，否则用 user_id + student_name）
    const studentMap = new Map<string, any>();

    for (const row of rawData) {
      const key = row.child_id || `user_${row.user_id}_${row.student_name || 'unknown'}`;

      if (!studentMap.has(key)) {
        studentMap.set(key, {
          childId: row.child_id || null,
          name: row.child_name || row.student_name || '未知学员',
          avatar: row.child_avatar || null,
          gender: row.child_gender || null,
          birthday: row.child_birthday || null,
          age: row.child_age || null,
          phone: row.student_phone || null,
          parentUserId: row.user_id,
          totalCourses: 0,
          totalLessons: 0,
          completedLessons: 0,
          courses: [],
        });
      }

      const student = studentMap.get(key);
      student.courses.push({
        orderId: row.order_id,
        courseId: row.course_id,
        courseName: row.course_name,
        skuName: row.sku_name,
        totalLessons: Number(row.total_lessons) || 0,
        completedLessons: Number(row.completed_lessons) || 0,
        orderStatus: row.order_status,
        paidAmount: Number(row.paid_amount) || 0,
        createdAt: row.order_created_at,
      });

      student.totalCourses = student.courses.length;
      student.totalLessons += Number(row.total_lessons) || 0;
      student.completedLessons += Number(row.completed_lessons) || 0;
    }

    let allStudents = Array.from(studentMap.values());

    // 关键词搜索
    if (keyword) {
      const kw = keyword.toLowerCase();
      allStudents = allStudents.filter(
        (s) =>
          s.name?.toLowerCase().includes(kw) ||
          s.phone?.includes(kw),
      );
    }

    // 分页
    if (page && pageSize) {
      const start = (page - 1) * pageSize;
      const data = allStudents.slice(start, start + pageSize);
      return {
        data,
        total: allStudents.length,
        page,
        pageSize,
        totalPages: Math.ceil(allStudents.length / pageSize),
      };
    }

    return allStudents;
  }

  /**
   *
   * 校验必填字段
   */
  private validateRequiredFields(institution: any): void {
    const required = [
      'name',
      'logo',
      'category_ids',
      'contact_phone',
      'province',
      'city',
      'district',
      'address',
      'latitude',
      'longitude',
      'license_no',
      'license_img',
      'legal_person',
      'id_card_imgs',
      'bank_name',
      'bank_account',
      'account_holder',
    ];

    const missing = required.filter((field) => !institution[field]);

    if (missing.length > 0) {
      throw new BadRequestException(
        `请完善以下必填信息: ${missing.join(', ')}`,
      );
    }
  }

  /**
   * 查询附近的机构
   * @param latitude - 用户纬度
   * @param longitude - 用户经度
   * @param radiusKm - 搜索半径（公里）
   * @param limit - 返回数量限制
   */
  async findNearby(
    latitude: number,
    longitude: number,
    radiusKm: number = 10,
    limit: number = 20,
  ) {
    if (!latitude || !longitude) {
      throw new BadRequestException('请提供有效的位置信息');
    }

    const results = await this.institutionRepository.findNearby(
      latitude,
      longitude,
      radiusKm,
      limit,
      'approved',
    );

    return {
      data: results,
      total: results.length,
    };
  }

  /**
   * 按区域搜索机构（带距离排序）
   * @param province - 省份
   * @param city - 城市
   * @param district - 区县
   * @param userLatitude - 用户纬度（用于距离排序）
   * @param userLongitude - 用户经度（用于距离排序）
   * @param page - 页码
   * @param pageSize - 每页数量
   */
  async findByArea(
    province?: string,
    city?: string,
    district?: string,
    userLatitude?: number,
    userLongitude?: number,
    page: number = 1,
    pageSize: number = 20,
  ) {
    return this.institutionRepository.findByArea(
      province,
      city,
      district,
      userLatitude,
      userLongitude,
      page,
      pageSize,
    );
  }

  /**
   * 添加机构账号
   */
  @Transactional()
  async addAccount(institutionId: string, dto: any): Promise<void> {
    // 验证机构是否存在
    const institution = await this.institutionRepository.findOneById(institutionId);
    if (!institution) {
      throw new BadRequestException('机构不存在');
    }

    // 验证当前用户是否有权限（必须是该机构的owner或admin）
    const userId = this.userContextService.getCurrentUserId();
    const userRole = await this.userInstitutionRepository.getUserRole(userId, institutionId);
    if (!['owner', 'admin'].includes(userRole)) {
      throw new BadRequestException('无权限添加账号');
    }

    // 检查手机号是否已存在
    const existingUser = await this.userRepository.findByPhone(dto.phone);
    if (existingUser) {
      // 检查该用户是否已属于其他机构
      const institutions = await this.userInstitutionRepository.findInstitutionsByUserId(
        existingUser.id,
      );
      if (institutions.length > 0) {
        throw new BadRequestException(`手机号 ${dto.phone} 已属于其他机构`);
      }
    }

    // 创建或关联用户
    let user = existingUser;
    if (!user) {
      const crypto = require('crypto');
      const uniqueId = crypto.randomUUID();
      user = this.userRepository.create({
        username: dto.phone,
        phone: dto.phone,
        nickname: dto.real_name || dto.phone,
        openid: `institution_phone_${dto.phone}_${uniqueId}`,
      });
      user = (await this.userRepository.save(user)) as any;
    }

    // 建立用户-机构关联
    await this.userInstitutionRepository.addUserInstitution(
      user!.id,
      institutionId,
      dto.role || 'staff',
    );
  }

  /**
   * 更新机构状态（激活/冻结）
   */
  @Transactional()
  async updateStatus(id: string, status: 'active' | 'frozen'): Promise<void> {
    const institution = await this.institutionRepository.findOneById(id);
    if (!institution) {
      throw new BadRequestException('机构不存在');
    }

    // 验证当前用户是否有权限
    const userId = this.userContextService.getCurrentUserId();
    const userRole = await this.userInstitutionRepository.getUserRole(userId, id);
    if (!['owner', 'admin'].includes(userRole)) {
      throw new BadRequestException('无权限修改机构状态');
    }

    // 更新is_active字段
    const isActive = status === 'active';
    await this.institutionRepository.update(id, { is_active: isActive });
  }

  /**
   * 删除机构（软删除）
   */
  @Transactional()
  async remove(id: string): Promise<void> {
    const institution = await this.institutionRepository.findOneById(id);
    if (!institution) {
      throw new BadRequestException('机构不存在');
    }

    // 验证当前用户是否有权限（必须是owner）
    const userId = this.userContextService.getCurrentUserId();
    const userRole = await this.userInstitutionRepository.getUserRole(userId, id);
    if (userRole !== 'owner') {
      throw new BadRequestException('只有机构所有者可以删除机构');
    }

    // 软删除机构
    await this.institutionRepository.softRemoveById(id);
  }
}