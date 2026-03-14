import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Transactional } from '@/common/decorators/transaction.decorator';
import { UserContextService } from '@/common/services/user-context.service';
import { CourseRepository } from './repositories/course.repository';
import { CourseSkuRepository } from './repositories/course-sku.repository';
import { UserInstitutionRepository } from '@/modules/auth/repositories/user-institution.repository';
import { ScheduleRepository } from '@/modules/schedule/repositories/schedule.repository';
import { UserInviteCodeRepository } from '@/modules/invite/repositories/user-invite-code.repository';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { QueryCourseDto } from './dto/query-course.dto';
import { MoneyMath } from '@/common/utils/money.util';

@Injectable()
export class CourseService {
  constructor(
    private courseRepository: CourseRepository,
    private courseSkuRepository: CourseSkuRepository,
    private userInstitutionRepository: UserInstitutionRepository,
    private scheduleRepository: ScheduleRepository,
    private userInviteCodeRepository: UserInviteCodeRepository,
    private userContextService: UserContextService,
    private dataSource: DataSource,
  ) {}

  /**
   * 批量为课程 SKU 添加 display_price（含佣金的展示价格）并更新 min_price。
   * 这是全系统唯一的课程展示价格计算入口，与 calculateAmount 的佣金逻辑保持一致。
   * HomeService / CourseService 统一调用此方法，禁止在其他地方重复计算佣金。
   */
  async addDisplayPricesToCourses(courses: any[]): Promise<void> {
    if (!courses || courses.length === 0) return;

    // 收集唯一机构 ID，批量查询佣金配置
    const institutionIds = [...new Set(courses.map((c) => c.institution_id))];
    const commRows = await this.dataSource.query(
      `SELECT id, commission_type, commission_value FROM institutions WHERE id = ANY($1) AND is_delete = false`,
      [institutionIds],
    );
    const commMap = new Map<string, { commission_type: string; commission_value: number }>(
      commRows.map((r: any) => [
        r.id,
        { commission_type: r.commission_type || 'percentage', commission_value: Number(r.commission_value) || 0 },
      ]),
    );

    for (const course of courses) {
      const comm = commMap.get(course.institution_id);
      if (!comm) continue;

      const { commission_type, commission_value } = comm;

      if (course.skus && course.skus.length > 0) {
        // 有 SKU 数组（课程详情/列表）：逐个 SKU 计算 display_price，并更新 course.min_price
        let minDisplayPriceFen = Infinity;

        for (const sku of course.skus) {
          const originalFen = MoneyMath.yuan2fen(Number(sku.total_price) || 0);
          let commFen = 0;
          if (commission_type === 'percentage') {
            commFen = MoneyMath.ratioOfFen(originalFen, commission_value);
          } else if (commission_type === 'fixed_amount') {
            commFen = MoneyMath.yuan2fen(commission_value);
          }
          sku.display_price = MoneyMath.fen2yuan(originalFen + commFen);
          if (originalFen + commFen < minDisplayPriceFen) {
            minDisplayPriceFen = originalFen + commFen;
          }
        }

        if (minDisplayPriceFen !== Infinity) {
          course.min_price = MoneyMath.fen2yuan(minDisplayPriceFen);
        }
      } else if (course.min_price != null) {
        // 无 SKU 数组但有 min_price（如首页 SQL 查询结果）：对 min_price 直接加佣金
        // 数学上等价：min(display_price) = apply_commission(min(total_price))
        // 百分比佣金：min(p*(1+r)) = min(p)*(1+r)  ✓
        // 固定佣金：  min(p+f)    = min(p)+f        ✓
        const originalFen = MoneyMath.yuan2fen(Number(course.min_price) || 0);
        let commFen = 0;
        if (commission_type === 'percentage') {
          commFen = MoneyMath.ratioOfFen(originalFen, commission_value);
        } else if (commission_type === 'fixed_amount') {
          commFen = MoneyMath.yuan2fen(commission_value);
        }
        course.min_price = MoneyMath.fen2yuan(originalFen + commFen);
      }
    }
  }

  /**
   * 计算SKU价格
   */
  private calculateSkuPrices(
    courseType: string,
    skuType: string,
    totalPrice: number,
    cashbackType: string,
    cashbackValue: number,
  ): { onlinePayPrice: number; offlinePayPrice: number } {
    let onlinePayPrice = 0;
    let offlinePayPrice = 0;

    if (courseType === 'trial' || skuType === 'trial') {
      // 试听课：全额线上支付
      onlinePayPrice = totalPrice;
      offlinePayPrice = 0;
    } else {
      // 正式课：计算返现金额
      if (cashbackType === 'percentage') {
        onlinePayPrice = totalPrice * (cashbackValue / 100);
      } else if (cashbackType === 'fixed') {
        onlinePayPrice = cashbackValue;
      }
      offlinePayPrice = totalPrice - onlinePayPrice;
    }

    return { onlinePayPrice, offlinePayPrice };
  }

  /**
   * 业务校验
   */
  private validateCourseDto(dto: CreateCourseDto | UpdateCourseDto): void {
    if (!dto.skus || dto.skus.length === 0) {
      throw new BadRequestException('至少需要一个规格');
    }

    dto.skus.forEach((sku, index) => {
      // 检查必填字段
      if (!sku.name) {
        throw new BadRequestException(`规格${index + 1}的名称不能为空`);
      }
      if (!sku.total_lessons || sku.total_lessons <= 0) {
        throw new BadRequestException(`规格${index + 1}的课时数必须大于0`);
      }
      if (!sku.total_price || sku.total_price <= 0) {
        throw new BadRequestException(`规格${index + 1}的价格必须大于0`);
      }

      // 正式课校验返现金额（体验课套餐 type='trial' 跳过此校验）
      if (dto.type === 'standard' && sku.type !== 'trial') {
        if (!sku.cashback_value || sku.cashback_value <= 0) {
          throw new BadRequestException(
            `正式课规格${index + 1}必须设置返现金额`,
          );
        }

        if (
          sku.cashback_type === 'fixed' &&
          sku.cashback_value > sku.total_price
        ) {
          throw new BadRequestException(
            `规格${index + 1}的返现金额不能超过课程总价`,
          );
        }
        if (sku.cashback_type === 'percentage' && sku.cashback_value > 100) {
          throw new BadRequestException(
            `规格${index + 1}的返现比例不能超过100%`,
          );
        }
      }
    });
  }

  /**
   * 创建课程
   */
  @Transactional()
  async create(dto: CreateCourseDto): Promise<string> {
    const userId = this.userContextService.getCurrentUserId();

    // 验证用户是否拥有该机构
    const hasInstitution = await this.userInstitutionRepository.hasInstitution(
      userId,
      dto.institution_id,
    );
    if (!hasInstitution) {
      throw new ForbiddenException('您没有权限操作该机构的课程');
    }

    // 业务校验
    this.validateCourseDto(dto);

    // 创建课程主表
    const course = this.courseRepository.create({
      institution_id: dto.institution_id,
      title: dto.title,
      subtitle: dto.subtitle,
      category_code: dto.category_code,
      slider_imgs: dto.slider_imgs || [],
      tags: dto.tags,
      description: dto.description,
      min_age: dto.min_age,
      max_age: dto.max_age,
      lesson_duration: dto.lesson_duration,
      type: dto.type,
      is_online: dto.is_online || false,
      cashback_enabled: dto.cashback_enabled || false,
      cashback_ratio: dto.cashback_ratio || 10,
    });

    const savedCourse = await this.courseRepository.save(course);

    // 创建SKU
    const skus = dto.skus.map((skuDto) => {
      // SKU 类型：课程是 trial 则全部为 trial，否则用前端传的 type 或默认 standard
      const skuType = dto.type === 'trial' ? 'trial' : (skuDto.type || 'standard');

      // 计算线上线下金额（需先确定 skuType）
      const { onlinePayPrice, offlinePayPrice } = this.calculateSkuPrices(
        dto.type,
        skuType,
        skuDto.total_price,
        skuDto.cashback_type,
        skuDto.cashback_value,
      );

      return this.courseSkuRepository.create({
        course_id: savedCourse.id,
        name: skuDto.name,
        type: skuType,
        total_lessons: skuDto.total_lessons,
        total_price: skuDto.total_price,
        cashback_type: skuType === 'trial' ? 'none' : skuDto.cashback_type,
        cashback_value: skuType === 'trial' ? 0 : skuDto.cashback_value,
        online_pay_price: onlinePayPrice,
        offline_pay_price: offlinePayPrice,
        stock: skuDto.stock ?? -1,
        validity_days: skuDto.validity_days,
        is_refundable: skuType === 'standard', // 体验课套餐不可退
      });
    });

    await this.courseSkuRepository.save(skus);

    return savedCourse.id;
  }

  /**
   * 更新课程
   */
  @Transactional()
  async update(id: string, dto: UpdateCourseDto): Promise<void> {
    const course = await this.courseRepository.findOneById(id);
    if (!course) {
      throw new BadRequestException('课程不存在');
    }

    // ⚠️ 权限验证：检查当前用户是否有权限修改该课程
    const userId = this.userContextService.getCurrentUserId();
    const hasInstitution =
      await this.userInstitutionRepository.hasInstitution(
        userId,
        course.institution_id,
      );
    if (!hasInstitution) {
      throw new ForbiddenException('您没有权限修改该课程');
    }

    // 业务校验
    if (dto.skus) {
      this.validateCourseDto({ ...dto, type: course.type } as CreateCourseDto);
    }

    // 更新课程基本信息
    Object.assign(course, {
      title: dto.title ?? course.title,
      subtitle: dto.subtitle ?? course.subtitle,
      category_code: dto.category_code ?? course.category_code,
      slider_imgs: dto.slider_imgs ?? course.slider_imgs,
      tags: dto.tags ?? course.tags,
      description: dto.description ?? course.description,
      min_age: dto.min_age ?? course.min_age,
      max_age: dto.max_age ?? course.max_age,
      lesson_duration: dto.lesson_duration ?? course.lesson_duration,
      is_online: dto.is_online ?? course.is_online,
    });

    await this.courseRepository.save(course);

    // 更新SKU
    if (dto.skus) {
      // 软删除旧的SKU
      await this.courseSkuRepository.softDeleteByCourseId(id);

      // 创建新的SKU
      const skus = dto.skus.map((skuDto) => {
        // 检查必填字段
        if (!skuDto.name) {
          throw new BadRequestException('SKU名称不能为空');
        }
        if (!skuDto.total_lessons) {
          throw new BadRequestException('SKU课时数不能为空');
        }
        if (!skuDto.total_price) {
          throw new BadRequestException('SKU价格不能为空');
        }

        // SKU 类型：课程是 trial 则全部为 trial，否则用前端传的 type 或默认 standard
        const skuType = course.type === 'trial' ? 'trial' : (skuDto.type || 'standard');

        const { onlinePayPrice, offlinePayPrice } = this.calculateSkuPrices(
          course.type,
          skuType,
          skuDto.total_price,
          skuDto.cashback_type || 'none',
          skuDto.cashback_value || 0,
        );

        return this.courseSkuRepository.create({
          course_id: id,
          name: skuDto.name,
          type: skuType,
          total_lessons: skuDto.total_lessons,
          total_price: skuDto.total_price,
          cashback_type: skuType === 'trial' ? 'none' : skuDto.cashback_type || 'fixed',
          cashback_value: skuType === 'trial' ? 0 : skuDto.cashback_value || 0,
          online_pay_price: onlinePayPrice,
          offline_pay_price: offlinePayPrice,
          stock: skuDto.stock ?? -1,
          validity_days: skuDto.validity_days,
          is_refundable: skuType === 'standard',
        });
      });

      await this.courseSkuRepository.save(skus);
    }
  }

  /**
   * 查询课程列表（支持距离筛选）
   * 返回结果包含 max_cashback_amount（最高返现金额 = 最高SKU价格 × 返现比例）
   */
  async findAll(query: QueryCourseDto) {
    // 查询课程列表（支持有或无 institutionId）
    const result = await this.courseRepository.findCourses({
      institutionId: query.institutionId,
      isOnline: query.is_online,
      type: query.type,
      keyword: query.keyword,
      categoryCode: query.category_code,
      minPrice: query.min_price,
      maxPrice: query.max_price,
      page: query.page,
      pageSize: query.pageSize,
      latitude: query.latitude,
      longitude: query.longitude,
      maxDistance: query.maxDistance,  // 距离筛选（公里）
      period: query.period,
      startDate: query.startDate,
      endDate: query.endDate,
      sortBy: query.sortBy,            // 排序方式
    });
    
    // 获取全平台最高让利比例（用于计算立减金额）
    const maxShareRatio = await this.userInviteCodeRepository.getMaxShareRatio();

    // 计算每个课程的最高立减和返现金额
    // 最高返现 = 最高SKU价格 × 课程返现比例（或固定返现金额）
    // 最高立减 = 最高返现 × 最高让利比例
    // 体验课不参与返现
    const addMaxCashback = (courses: any[]) => {
      for (const course of courses) {
        if (course.cashback_enabled && course.type !== 'trial' && course.skus && course.skus.length > 0) {
          // 获取最高 SKU 价格（排除体验课 SKU）
          const nonTrialSkus = course.skus.filter((sku: any) => sku.type !== 'trial');
          if (nonTrialSkus.length === 0) {
            course.max_cashback_amount = 0;
            course.max_discount_amount = 0;
            continue;
          }
          const maxPrice = Math.max(...nonTrialSkus.map((sku: any) => Number(sku.total_price) || 0));
          const cashbackRatio = Number(course.cashback_ratio) || 10;
          // 最高返现 = 最高价格 × 返现比例（分单位运算，避免浮点误差）
          const cashbackAmountFen = MoneyMath.percentOfFen(MoneyMath.yuan2fen(maxPrice), cashbackRatio);
          const cashbackAmount = MoneyMath.fen2yuan(cashbackAmountFen);
          course.max_cashback_amount = cashbackAmount;
          // 最高立减 = 最高返现 × 最高让利比例
          course.max_discount_amount = MoneyMath.fen2yuan(MoneyMath.percentOfFen(cashbackAmountFen, maxShareRatio));
        } else {
          course.max_cashback_amount = 0;
          course.max_discount_amount = 0;
        }
      }
    };
    
    // 处理分页和非分页两种返回格式
    if (Array.isArray(result)) {
      addMaxCashback(result);
      await this.addDisplayPricesToCourses(result);
    } else if (result.data) {
      addMaxCashback(result.data);
      await this.addDisplayPricesToCourses(result.data);
    }
    
    return result;
  }

  /**
   * 查询课程详情
   */
  async findOne(id: string) {
    // 查询课程详情（浏览场景，不需要登录）
    const course = await this.courseRepository.findByIdWithSkus(id);

    if (!course) {
      throw new BadRequestException('课程不存在');
    }

    // ⚠️ 浏览课程详情不需要权限检查，任何人都可以查看
    // 只有修改、删除等操作才需要验证机构成员身份

    // 计算最高立减和返现金额（基于最高SKU价格）
    // 最高返现 = 最高SKU价格 × 课程返现比例
    // 最高立减 = 最高返现 × 最高让利比例
    // 体验课(trial)不参与返现
    const maxShareRatio = await this.userInviteCodeRepository.getMaxShareRatio();

    if (course.cashback_enabled && course.type !== 'trial' && course.skus && course.skus.length > 0) {
      const nonTrialSkus = course.skus.filter((sku: any) => sku.type !== 'trial');
      if (nonTrialSkus.length > 0) {
        const maxPrice = Math.max(...nonTrialSkus.map((sku: any) => Number(sku.total_price) || 0));
        const cashbackRatio = Number(course.cashback_ratio) || 10;
        // 分单位运算，避免浮点误差
        const cashbackAmountFen = MoneyMath.percentOfFen(MoneyMath.yuan2fen(maxPrice), cashbackRatio);
        const cashbackAmount = MoneyMath.fen2yuan(cashbackAmountFen);
        (course as any).max_cashback_amount = cashbackAmount;
        (course as any).max_discount_amount = MoneyMath.fen2yuan(MoneyMath.percentOfFen(cashbackAmountFen, maxShareRatio));
        (course as any).max_share_ratio = maxShareRatio;
      } else {
        (course as any).max_cashback_amount = 0;
        (course as any).max_discount_amount = 0;
        (course as any).max_share_ratio = maxShareRatio;
      }
    } else {
      (course as any).max_cashback_amount = 0;
      (course as any).max_discount_amount = 0;
      (course as any).max_share_ratio = maxShareRatio;
    }

    // 为每个 SKU 添加含佣金的展示价格
    await this.addDisplayPricesToCourses([course]);

    return course;
  }

  /**
   * 删除课程（软删除）
   */
  @Transactional()
  async remove(id: string): Promise<void> {
    const userId = this.userContextService.getCurrentUserId();
    const course = await this.courseRepository.findOneById(id);

    if (!course) {
      throw new BadRequestException('课程不存在');
    }

    // 权限检查
    const hasInstitution = await this.userInstitutionRepository.hasInstitution(
      userId,
      course.institution_id,
    );
    if (!hasInstitution) {
      throw new ForbiddenException('无权删除该课程');
    }

    // 检查是否有未完成的订单（有效订单存在时不允许删除）
    const activeOrderRows = await this.dataSource.query(
      `SELECT id FROM orders
       WHERE course_id = $1
         AND status IN ('pending', 'pending_confirm', 'confirmed', 'refund_pending', 'refunding')
         AND is_delete = false
       LIMIT 1`,
      [id],
    );
    if (activeOrderRows.length > 0) {
      throw new BadRequestException('该课程存在未完成的订单，无法删除');
    }

    await this.courseRepository.softRemoveById(id);
    await this.courseSkuRepository.softDeleteByCourseId(id);
  }

  /**
   * 上架/下架课程
   * 上架时检查是否有排课，没有排课不能上架
   */
  @Transactional()
  async toggleOnline(id: string, isOnline: boolean): Promise<void> {
    const userId = this.userContextService.getCurrentUserId();
    const course = await this.courseRepository.findOneById(id);

    if (!course) {
      throw new BadRequestException('课程不存在');
    }

    // 权限检查
    const hasInstitution = await this.userInstitutionRepository.hasInstitution(
      userId,
      course.institution_id,
    );
    if (!hasInstitution) {
      throw new ForbiddenException('无权操作该课程');
    }

    // 上架时检查是否有排课
    if (isOnline) {
      const schedules = await this.scheduleRepository.findByCourse(id);
      if (!schedules || schedules.length === 0) {
        throw new BadRequestException('课程没有排课，无法上架。请先为课程添加排课时间');
      }
    }

    course.is_online = isOnline;
    await this.courseRepository.save(course);
  }

  /**
   * 查询附近的课程（基于机构位置）
   * @param latitude - 用户纬度
   * @param longitude - 用户经度
   * @param radiusKm - 搜索半径（公里）
   * @param options - 筛选条件
   */
  async findNearby(
    latitude: number,
    longitude: number,
    radiusKm: number = 10,
    options?: {
      type?: string;
      categoryCode?: string;
      keyword?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    if (!latitude || !longitude) {
      throw new BadRequestException('请提供有效的位置信息');
    }

    return this.courseRepository.findNearby(
      latitude,
      longitude,
      radiusKm,
      options,
    );
  }

  /**
   * 按区域搜索课程（支持距离排序）
   */
  async findByArea(
    province?: string,
    city?: string,
    district?: string,
    userLatitude?: number,
    userLongitude?: number,
    options?: {
      type?: string;
      categoryCode?: string;
      keyword?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    return this.courseRepository.findByArea(
      province,
      city,
      district,
      userLatitude,
      userLongitude,
      options,
    );
  }
}

