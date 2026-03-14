import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Transactional } from '@/common/decorators/transaction.decorator';
import { UserContextService } from '@/common/services/user-context.service';
import { OrderRepository } from './repositories/order.repository';
import { CourseRepository } from '../course/repositories/course.repository';
import { CourseSkuRepository } from '../course/repositories/course-sku.repository';
import { InstitutionRepository } from '../institution/repositories/institution.repository';
import { BookingRepository } from '../booking/repositories/booking.repository';
import { ScheduleRepository } from '../schedule/repositories/schedule.repository';
import { PaymentService } from '../payment/payment.service';
import { InviteService } from '../invite/invite.service';
import { UserBalanceRepository } from '../invite/repositories/user-balance.repository';
import { CreateOrderDto, ConfirmPaymentDto, RefundDto, CalculateOrderAmountDto, OrderAmountResult } from './dto/order.dto';
import { OrderEntity } from './entities/order.entity';
import { BookingEntity } from '../booking/entities/booking.entity';
import { UserInviteCodeRepository } from '../invite/repositories/user-invite-code.repository';
import { MoneyMath } from '@/common/utils/money.util';

import { generateSnowflakeId } from '@/utils/snowflake.util';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  /**
   * 订单访问权限校验
   * - 管理员：允许访问
   * - 机构账号：只能访问本机构订单
   * - 家长账号：只能访问本人订单
   */
  private assertOrderAccess(order: OrderEntity): void {
    if (this.userContextService.hasRole('admin')) {
      return;
    }

    const currentInstitutionId = this.userContextService.getInstitutionId();
    if (currentInstitutionId) {
      if (order.institution_id !== currentInstitutionId) {
        throw new BadRequestException('无权访问此订单');
      }
      return;
    }

    const currentUserId = this.userContextService.getCurrentUserIdOrNull();
    if (!currentUserId || order.user_id !== currentUserId) {
      throw new BadRequestException('无权访问此订单');
    }
  }

  constructor(
    private orderRepository: OrderRepository,
    private courseRepository: CourseRepository,
    private courseSkuRepository: CourseSkuRepository,
    private institutionRepository: InstitutionRepository,
    private bookingRepository: BookingRepository,
    private scheduleRepository: ScheduleRepository,
    private userContextService: UserContextService,
    private dataSource: DataSource,
    @Inject(forwardRef(() => PaymentService))
    private paymentService: PaymentService,
    private inviteService: InviteService,
    private userBalanceRepository: UserBalanceRepository,
    private userInviteCodeRepository: UserInviteCodeRepository,
  ) {}

  /**
   * 生成订单号
   * 使用雪花 ID 保证全局唯一性，避免 高并发下的 Date.now()+random 第冲突
   */
  private generateOrderNo(): string {
    return `ORD${generateSnowflakeId()}`;
  }

  /**
   * 统一金额计算方法（后端唯一的金额计算入口）
   * 前端通过 POST /order/calculate 调用获取展示数据
   * 后端创建订单时也复用此方法，确保金额一致
   */
  async calculateOrderAmount(dto: CalculateOrderAmountDto): Promise<OrderAmountResult> {
    const userId = this.userContextService.getCurrentUserIdOrNull();

    // 查询课程信息
    const course = await this.courseRepository.findOneById(dto.course_id);
    if (!course) {
      throw new NotFoundException('课程不存在');
    }

    // 查询SKU信息
    const sku = await this.courseSkuRepository.findOneById(dto.sku_id);
    if (!sku || sku.course_id !== dto.course_id) {
      throw new NotFoundException('SKU不存在或不属于该课程');
    }

    const quantity = dto.quantity || 1;
    const unitPriceFen = MoneyMath.yuan2fen(sku.total_price || 0);
    const originalPriceFen = unitPriceFen * quantity;
    const originalPrice = MoneyMath.fen2yuan(originalPriceFen);
    const isTrialCourse = course.type === 'trial' || sku.type === 'trial';
    const cashbackRatio = Number(course.cashback_ratio) || 10;

    // 1. 计算线上定金基数和线下尾款
    let onlinePayBaseFen: number;
    let offlinePayAmountFen: number;

    if (isTrialCourse) {
      onlinePayBaseFen = originalPriceFen;
      offlinePayAmountFen = 0;
    } else {
      onlinePayBaseFen = MoneyMath.percentOfFen(originalPriceFen, cashbackRatio);
      offlinePayAmountFen = originalPriceFen - onlinePayBaseFen;
    }

    // 2. 处理邀请码立减
    let inviteDiscountFen = 0;
    let capturedShareRatio: number | undefined; // ⭐ 快照下单时的让利比例
    if (dto.invite_code && course.cashback_enabled && !isTrialCourse) {
      try {
        const validation = await this.inviteService.validateInviteCode({
          invite_code: dto.invite_code,
          course_id: dto.course_id,
        });
        if (validation.valid) {
          const shareRatio = validation.inviteCode?.share_ratio || 50;
          capturedShareRatio = shareRatio; // ⭐ 锁定下单时的让利比例
          const cashbackTotalFen = MoneyMath.percentOfFen(
            originalPriceFen,
            cashbackRatio,
          );
          inviteDiscountFen = MoneyMath.percentOfFen(cashbackTotalFen, shareRatio);
        }
      } catch {
        // 邀请码无效时不影响计算，优惠为0
      }
    }

    // 3. 处理余额抵扣（只能抵扣线上支付部分）
    let balanceDeductFen = 0;
    let userBalanceFen = 0;
    if (userId) {
      try {
        const balance = await this.userBalanceRepository.getOrCreate(userId);
        userBalanceFen = MoneyMath.yuan2fen(Number(balance.balance) || 0);
      } catch {
        userBalanceFen = 0;
      }
    }

    if (dto.use_balance && userBalanceFen > 0 && !isTrialCourse) {
      const onlineAfterInviteFen = Math.max(0, onlinePayBaseFen - inviteDiscountFen);
      balanceDeductFen = Math.min(userBalanceFen, onlineAfterInviteFen);
    }

    // 4. 计算最终金额
    const totalDiscountFen = inviteDiscountFen + balanceDeductFen;
    const onlinePayAmountFen = Math.max(
      0,
      onlinePayBaseFen - inviteDiscountFen - balanceDeductFen,
    );

    // 5. 计算 SKU 返现和立减展示标签
    let maxCashbackAmountFen = 0;
    let maxDiscountAmountFen = 0;
    let maxShareRatio = 50;

    if (course.cashback_enabled && !isTrialCourse) {
      maxCashbackAmountFen = MoneyMath.percentOfFen(originalPriceFen, cashbackRatio);
      try {
        maxShareRatio = await this.userInviteCodeRepository.getMaxShareRatio();
      } catch {
        maxShareRatio = 50;
      }
      maxDiscountAmountFen = MoneyMath.percentOfFen(maxCashbackAmountFen, maxShareRatio);
    }

    // 6. 计算平台佣金（基于机构配置）
    let commissionAmountFen = 0;
    const institutionForCommission = await this.institutionRepository.findOneById(course.institution_id);
    if (institutionForCommission) {
      const commType = (institutionForCommission as any).commission_type || 'percentage';
      const commValue = Number((institutionForCommission as any).commission_value) || 0;
      if (commType === 'percentage') {
        commissionAmountFen = MoneyMath.ratioOfFen(originalPriceFen, commValue);
      } else {
        commissionAmountFen = MoneyMath.yuan2fen(commValue);
      }
    }

    // 7. 佣金加入线上支付金额
    const finalOnlinePayAmountFen = onlinePayAmountFen + commissionAmountFen;
    const finalPaidAmountFen = finalOnlinePayAmountFen + offlinePayAmountFen;

    // 佣金已折入 online_pay_base，前端无需单独展示服务费
    const onlinePayBase = MoneyMath.fen2yuan(onlinePayBaseFen + commissionAmountFen);
    const inviteDiscount = MoneyMath.fen2yuan(inviteDiscountFen);
    const balanceDeduct = MoneyMath.fen2yuan(balanceDeductFen);
    const totalDiscount = MoneyMath.fen2yuan(totalDiscountFen);
    const finalOnlinePayAmount = MoneyMath.fen2yuan(finalOnlinePayAmountFen);
    const offlinePayAmount = MoneyMath.fen2yuan(offlinePayAmountFen);
    const finalPaidAmount = MoneyMath.fen2yuan(finalPaidAmountFen);
    const userBalance = MoneyMath.fen2yuan(userBalanceFen);
    const maxCashbackAmount = MoneyMath.fen2yuan(maxCashbackAmountFen);
    const maxDiscountAmount = MoneyMath.fen2yuan(maxDiscountAmountFen);
    const commissionAmount = MoneyMath.fen2yuan(commissionAmountFen);

    return {
      is_trial: isTrialCourse,
      original_price: originalPrice,
      display_price: MoneyMath.fen2yuan(originalPriceFen + commissionAmountFen), // 含佣金的展示价格，供前端直接展示用
      cashback_ratio: cashbackRatio,
      online_pay_base: onlinePayBase,
      invite_discount: inviteDiscount,
      balance_deduct: balanceDeduct,
      total_discount: totalDiscount,
      online_pay_amount: finalOnlinePayAmount,
      offline_pay_amount: offlinePayAmount,
      paid_amount: finalPaidAmount,
      user_balance: userBalance,
      max_cashback_amount: maxCashbackAmount,
      max_discount_amount: maxDiscountAmount,
      max_share_ratio: maxShareRatio,
      commission_amount: commissionAmount,
      invite_share_ratio: capturedShareRatio, // ⭐ 下单时邀请码让利比例快照
    };
  }

  /**
   * 创建订单（同时创建关联的预约）
   * 业务流程：用户报名 → 创建订单 + 预约 → 机构确认订单 → 预约自动确认
   * ⚠️ 金额由后端统一计算，不信任前端传递的任何金额
   */
  @Transactional()
  async create(dto: CreateOrderDto): Promise<string> {
    const userId = this.userContextService.getCurrentUserId();

    // 查询课程信息
    const course = await this.courseRepository.findOneById(dto.course_id);
    if (!course) {
      throw new NotFoundException('课程不存在');
    }

    // 查询SKU信息
    const sku = await this.courseSkuRepository.findOneById(dto.sku_id);
    if (!sku || sku.course_id !== dto.course_id) {
      throw new NotFoundException('SKU不存在或不属于该课程');
    }

    // 查询机构信息
    const institution = await this.institutionRepository.findOneById(
      course.institution_id,
    );
    if (!institution) {
      throw new NotFoundException('机构不存在');
    }

    // 验证必须选择排课时段
    if (!dto.schedule_ids || dto.schedule_ids.length === 0) {
      throw new BadRequestException('请至少选择一个上课时段');
    }

    const quantity = dto.quantity || 1;
    const totalLessons = (sku.total_lessons || 1) * quantity;

    // ⚠️ 后端统一计算金额（不信任前端传递的金额）
    const amountResult = await this.calculateOrderAmount({
      course_id: dto.course_id,
      sku_id: dto.sku_id,
      quantity: quantity,
      invite_code: dto.invite_code,
      use_balance: dto.use_balance_amount != null && dto.use_balance_amount > 0,
    });

    // 额外校验：如果传了余额抵扣金额，验证余额充足
    const useBalanceAmount = amountResult.balance_deduct;
    if (useBalanceAmount > 0) {
      const balance = await this.userBalanceRepository.getOrCreate(userId);
      if (Number(balance.balance) < useBalanceAmount) {
        throw new BadRequestException('余额不足');
      }
    }

    // 验证邀请码（用于记录到订单中，同时快照下单时的让利比例）
    let validInviteCode: string | undefined;
    let validInviteShareRatio: number | undefined;
    if (dto.invite_code && amountResult.invite_discount > 0) {
      validInviteCode = dto.invite_code;
      validInviteShareRatio = amountResult.invite_share_ratio; // ⭐ 快照下单时的让利比例
    }

    // 返现金额 = 订单原价 × 课程返现比例（cashback_amount 字段语义：本单总返现池）
    // 后续让利拆分（立减/邀请人收益）存储到 invite_discount_amount 等字段
    const cashbackAmount = amountResult.max_cashback_amount;

    this.logger.log(
      `订单金额计算: 原价=${amountResult.original_price}, 返现比例=${amountResult.cashback_ratio}%, ` +
        `线上定金基数=${amountResult.online_pay_base}, 邀请码优惠=${amountResult.invite_discount}, ` +
        `余额抵扣=${useBalanceAmount}, 线上支付=${amountResult.online_pay_amount}, ` +
        `线下支付=${amountResult.offline_pay_amount}, 实付=${amountResult.paid_amount}`,
    );

    // 1. 根据课时数和选择的排课模板，生成预约记录
    // 新架构：排课模板是不可变的参考数据，预约记录独立存储上课时间信息
    // 不再克隆 schedule 记录，而是将时间/教师/教室信息快照到 booking 中
    const bookingIds: string[] = [];
    const selectedScheduleCount = dto.schedule_ids.length;
    
    // 每周上课次数 = 选择的排课数量
    // 需要的周数 = 向上取整(总课时 / 每周次数)
    const lessonsPerSchedule = Math.ceil(totalLessons / selectedScheduleCount);
    
    // 预加载所有模板排课信息
    const templateSchedules: any[] = [];
    for (const scheduleId of dto.schedule_ids) {
      const schedule = await this.scheduleRepository.findOneById(scheduleId);
      if (!schedule) {
        throw new BadRequestException(`排课 ${scheduleId} 不存在`);
      }
      templateSchedules.push(schedule);
    }
    
    // 批量加载教师和教室名称（用于快照）
    const teacherIds = [...new Set(templateSchedules.map(s => s.teacher_id).filter(Boolean))];
    const classroomIds = [...new Set(templateSchedules.map(s => s.classroom_id).filter(Boolean))];
    
    const [teacherRows, classroomRows] = await Promise.all([
      teacherIds.length > 0
        ? this.dataSource.query(
            `SELECT id, name FROM teachers WHERE id = ANY($1) AND is_delete = false`,
            [teacherIds],
          )
        : [],
      classroomIds.length > 0
        ? this.dataSource.query(
            `SELECT id, name FROM classrooms WHERE id = ANY($1) AND is_delete = false`,
            [classroomIds],
          )
        : [],
    ]);
    
    const teacherNameMap = new Map<string, string>(teacherRows.map((t: any) => [t.id, t.name]));
    const classroomNameMap = new Map<string, string>(classroomRows.map((c: any) => [c.id, c.name]));
    
    for (let scheduleIndex = 0; scheduleIndex < selectedScheduleCount; scheduleIndex++) {
      const templateSchedule = templateSchedules[scheduleIndex];
      
      // 计算这个排课模板需要生成多少次预约
      const lessonsForThisSchedule = Math.min(
        lessonsPerSchedule,
        totalLessons - bookingIds.length
      );
      
      // ⭐ 从下单日期开始计算，找到下单日之后最近的对应星期几
      // day_of_week 可能是英文名("monday"-"sunday")或数字("1"-"7")
      const now = new Date();
      const dayNameToJsDay: Record<string, number> = {
        monday: 1, tuesday: 2, wednesday: 3, thursday: 4,
        friday: 5, saturday: 6, sunday: 0,
      };
      const rawDow = templateSchedule.day_of_week;
      let targetJsDay: number;
      if (dayNameToJsDay[rawDow?.toLowerCase()] !== undefined) {
        targetJsDay = dayNameToJsDay[rawDow.toLowerCase()];
      } else {
        // 数字格式: 1=周一...7=周日
        const num = parseInt(rawDow, 10);
        targetJsDay = num === 7 ? 0 : num;
      }
      const currentJsDay = now.getDay();
      
      // 计算从今天到下一个目标星期几的天数差
      let daysUntilTarget = targetJsDay - currentJsDay;
      if (daysUntilTarget <= 0) {
        // 如果今天已经是目标日或已过，则推到下周
        daysUntilTarget += 7;
      }
      
      // 第一次上课的日期 = 今天 + daysUntilTarget
      const firstLessonDate = new Date(now);
      firstLessonDate.setDate(firstLessonDate.getDate() + daysUntilTarget);
      
      // 从模板中提取上课的时/分/秒
      const templateStart = new Date(templateSchedule.start_time);
      const templateEnd = new Date(templateSchedule.end_time);
      
      // 为每次上课创建预约（从第一次上课日期开始，每隔7天生成下一次）
      for (let weekOffset = 0; weekOffset < lessonsForThisSchedule && bookingIds.length < totalLessons; weekOffset++) {
        // 计算这次上课的具体日期
        const lessonStartTime = new Date(firstLessonDate);
        lessonStartTime.setDate(lessonStartTime.getDate() + (weekOffset * 7));
        // 设置上课时间（时/分/秒从模板获取）
        lessonStartTime.setHours(templateStart.getHours(), templateStart.getMinutes(), templateStart.getSeconds(), 0);
        
        const lessonEndTime = new Date(lessonStartTime);
        // 设置下课时间（时/分/秒从模板获取）
        lessonEndTime.setHours(templateEnd.getHours(), templateEnd.getMinutes(), templateEnd.getSeconds(), 0);
        
        // 创建预约记录（独立存储上课时间信息，不依赖 schedule 表）
        const bookingData: Partial<BookingEntity> = {
          user_id: userId,
          institution_id: course.institution_id,
          course_id: dto.course_id,
          sku_id: dto.sku_id,
          // 保留对原始模板的引用（仅作溯源，不用于获取时间）
          schedule_id: templateSchedule.id,
          // ⭐ 课程时间快照（独立于排课模板）
          start_time: lessonStartTime,
          end_time: lessonEndTime,
          day_of_week: templateSchedule.day_of_week,
          teacher_id: templateSchedule.teacher_id,
          classroom_id: templateSchedule.classroom_id,
          teacher_name: teacherNameMap.get(templateSchedule.teacher_id) || undefined,
          classroom_name: classroomNameMap.get(templateSchedule.classroom_id) || undefined,
          // 学员信息
          child_id: dto.child_id,
          student_name: dto.student_name,
          student_phone: dto.student_phone || '',
          student_age: dto.student_age,
          remark: dto.remark,
          status: 'pending',
        };
        const booking = this.bookingRepository.create(bookingData);

        const savedBooking = await this.bookingRepository.save(booking);
        bookingIds.push(savedBooking.id);
      }
      
      // 只更新原始模板排课的已预约人数（+1 代表多了一位学员选了这个时段）
      await this.dataSource.query(
        `UPDATE schedules SET booked_count = booked_count + 1 WHERE id = $1`,
        [templateSchedule.id]
      );
    }
    
    this.logger.log(`订单创建: 生成 ${bookingIds.length} 个预约记录，总课时 ${totalLessons}`);

    // 2. 创建订单，关联预约ID（多个用逗号分隔）
    // 计算支付过期时间（默认30分钟，可通过配置调整）
    const PAY_TIMEOUT_MINUTES = 30;
    const expireAt = new Date(Date.now() + PAY_TIMEOUT_MINUTES * 60 * 1000);

    const order = this.orderRepository.create({
      order_no: this.generateOrderNo(),
      user_id: userId,
      institution_id: course.institution_id,
      course_id: dto.course_id,
      sku_id: dto.sku_id,
      booking_id: bookingIds.join(','),
      course_name: course.title,
      sku_name: sku.name,
      quantity: quantity,
      original_price: amountResult.original_price,
      paid_amount: amountResult.paid_amount,
      discount_amount: amountResult.total_discount,
      cashback_amount: cashbackAmount,
      online_pay_amount: amountResult.online_pay_amount,
      offline_pay_amount: amountResult.offline_pay_amount,
      commission_amount: amountResult.commission_amount,
      coupon_id: dto.coupon_id,
      payment_method: 'wechat', // 统一使用微信支付
      student_name: dto.student_name,
      student_phone: dto.student_phone,
      remark: dto.remark,
      status: 'pending',
      expire_at: expireAt,
      // 邀友让利相关
      invite_code: validInviteCode,
      invite_share_ratio: validInviteShareRatio, // ⭐ 下单时让利比例快照
      invite_discount_amount: amountResult.invite_discount,
      use_balance_amount: useBalanceAmount,
      // 课时信息
      total_lessons: sku.total_lessons * quantity || 0,
      completed_lessons: 0,
      // 添加快照
      institution_snapshot: {
        id: institution.id,
        name: institution.name,
        contact_phone: institution.contact_phone || undefined,
        address: institution.address || undefined,
        business_hours: undefined,
      },
      course_snapshot: {
        id: course.id,
        title: course.title,
        subtitle: course.subtitle || undefined,
        type: course.type || 'standard', // 课程类型：trial-试听课, standard-正式课
        age_range_min: undefined,
        age_range_max: undefined,
      },
      sku_snapshot: {
        id: sku.id,
        name: sku.name,
        original_price: sku.total_price,
        class_count: sku.total_lessons || undefined,
        class_duration: undefined,
        cashback_type: sku.cashback_type,
        cashback_value: sku.cashback_value,
      },
    });

    const saved = await this.orderRepository.save(order);

    // ⭐ 扣减 SKU 库存（原子操作，防止超卖）
    // stock = -1 表示不限库存，stock >= 0 时才需要扣减
    if (sku.stock !== -1) {
      const stockResult = await this.dataSource.query(
        `UPDATE course_skus SET stock = stock - 1 WHERE id = $1 AND (stock = -1 OR stock > 0) AND is_delete = false RETURNING id`,
        [sku.id],
      );
      if (!stockResult || stockResult.length === 0) {
        throw new BadRequestException('该规格课程库存不足，无法下单');
      }
      this.logger.log(`订单 ${saved.order_no} 扣减 SKU(${sku.id}) 库存`);
    }

    // 处理余额抵扣
    if (useBalanceAmount > 0) {
      await this.userBalanceRepository.deductBalance(userId, useBalanceAmount);
      this.logger.log(`订单 ${saved.order_no} 余额抵扣 ${useBalanceAmount} 元`);
    }

    return saved.id;
  }

  /**
   * 确认支付（机构端线下支付确认）
   * 确认订单后，自动确认关联的预约
   */
  @Transactional()
  async confirmPayment(id: string, dto: ConfirmPaymentDto): Promise<void> {
    // 先查询订单，获取关联的预约ID
    const order = await this.orderRepository.findOneById(id);
    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.status !== 'pending') {
      throw new BadRequestException('订单状态不正确，只能确认待支付的订单');
    }

    // 机构归属校验：仅订单所属机构可确认线下支付
    this.assertOrderAccess(order);

    // 更新订单状态为已确认（线下支付确认后直接生效）
    order.status = 'confirmed';
    order.transaction_no = dto.transaction_no;
    order.paid_at = new Date();
    await this.orderRepository.save(order);

    // 更新课程销量
    await this.incrementSalesCount(order.course_id);

    // 创建邀请订单（如果使用了邀请码）
    await this.createInviteOrderIfNeeded(order);

    // 自动确认关联的预约
    if (order.booking_id) {
      const bookingIds = order.booking_id.split(',').filter(id => id.trim());
      for (const bookingId of bookingIds) {
        await this.bookingRepository
          .createQueryBuilder()
          .update(BookingEntity)
          .set({
            status: 'confirmed',
            confirmed_at: new Date(),
          })
          .where('id = :id', { id: bookingId })
          .andWhere('status = :status', { status: 'pending' })
          .andWhere('is_delete = :isDelete', { isDelete: false })
          .execute();
      }
    }
  }

  /**
   * 增加课程销量
   */
  private async incrementSalesCount(courseId: string): Promise<void> {
    try {
      await this.dataSource.query(
        `UPDATE courses SET sales_count = sales_count + 1 WHERE id = $1 AND is_delete = false`,
        [courseId],
      );
    } catch (error) {
      this.logger.warn(`更新课程销量失败: ${error.message}`);
    }
  }

  /**
   * 减少课程销量
   */
  private async decrementSalesCount(courseId: string): Promise<void> {
    try {
      await this.dataSource.query(
        `UPDATE courses SET sales_count = GREATEST(sales_count - 1, 0) WHERE id = $1 AND is_delete = false`,
        [courseId],
      );
    } catch (error) {
      this.logger.warn(`更新课程销量失败: ${error.message}`);
    }
  }

  /**
   * 取消订单关联的所有预约
   * 将 pending/confirmed 状态的预约更新为 cancelled
   */
  private async cancelOrderBookings(bookingIdStr?: string): Promise<void> {
    if (!bookingIdStr) return;

    const bookingIds = bookingIdStr.split(',').map(id => id.trim()).filter(Boolean);
    if (bookingIds.length === 0) return;

    // 先收集将被取消的预约的 schedule_id（去重），用于后续减少排课占用数
    const scheduleIds = new Set<string>();
    for (const bookingId of bookingIds) {
      const rows = await this.dataSource.query(
        `SELECT schedule_id FROM bookings WHERE id = $1 AND status IN ('pending','confirmed','pending_change') AND is_delete = false`,
        [bookingId],
      );
      if (rows.length > 0 && rows[0].schedule_id) {
        scheduleIds.add(rows[0].schedule_id);
      }
    }

    for (const bookingId of bookingIds) {
      await this.bookingRepository
        .createQueryBuilder()
        .update(BookingEntity)
        .set({ status: 'cancelled' })
        .where('id = :id', { id: bookingId })
        .andWhere('status IN (:...statuses)', { statuses: ['pending', 'confirmed', 'pending_change'] })
        .andWhere('is_delete = :isDelete', { isDelete: false })
        .execute();
    }

    // 释放排课名额（每个排课模板只减 1 次，对应订单创建时的 +1）
    for (const scheduleId of scheduleIds) {
      await this.dataSource.query(
        `UPDATE schedules SET booked_count = GREATEST(booked_count - 1, 0) WHERE id = $1`,
        [scheduleId],
      );
    }

    this.logger.log(`已取消 ${bookingIds.length} 个关联预约，释放 ${scheduleIds.size} 个排课名额`);
  }

  /**
   * 归还 SKU 库存（取消/退款时调用）
   * 仅对有限库存（stock >= 0）的 SKU 归还，stock = -1 表示不限量无需归还
   */
  private async restoreSkuStock(skuId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE course_skus SET stock = stock + 1 WHERE id = $1 AND stock >= 0`,
      [skuId],
    );
  }

  /**
   * 创建邀请订单（如果使用了邀请码）
   */
  private async createInviteOrderIfNeeded(order: OrderEntity): Promise<void> {
    if (!order.invite_code) {
      return;
    }

    try {
      // 获取课程信息以获取返现比例
      const course = await this.courseRepository.findOneById(order.course_id);
      if (!course || !course.cashback_enabled) {
        this.logger.warn(
          `订单 ${order.order_no} 使用了邀请码但课程不支持返现`,
        );
        return;
      }

      await this.inviteService.createInviteOrder({
        invite_code: order.invite_code,
        invitee_id: order.user_id,
        order_id: order.id,
        course_id: order.course_id,
        institution_id: order.institution_id,
        // 返现基数使用课程原价，不含平台佣金；佣金按课程进度在退款中单独处理
        order_amount: Number(order.original_price),
        cashback_ratio: Number(course.cashback_ratio) || 10,
        total_lessons: order.total_lessons || 0,
        // ⭐ 优先使用下单时快照的让利比例，避免事后修改影响已有订单
        share_ratio: order.invite_share_ratio !== undefined ? Number(order.invite_share_ratio) : undefined,
      });

      this.logger.log(
        `订单 ${order.order_no} 创建邀请订单成功`,
      );
    } catch (error) {
      this.logger.error(
        `订单 ${order.order_no} 创建邀请订单失败：${error.message}`,
      );
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * 申请退款
   */
  @Transactional()
  async applyRefund(id: string, dto: RefundDto): Promise<void> {
    const userId = this.userContextService.getCurrentUserId();
    const order = await this.orderRepository.findOneById(id);

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.user_id !== userId) {
      throw new BadRequestException('无权操作此订单');
    }

    // 只有已确认或退款被拒绝的订单才能申请退款
    if (order.status !== 'confirmed' && order.status !== 'refund_rejected') {
      throw new BadRequestException('只能对已确认或退款被拒绝的订单申请退款');
    }

    order.status = 'refund_pending';
    order.refund_reason = dto.refund_reason;
    order.refund_applied_at = new Date();

    await this.orderRepository.save(order);
  }

  /**
   * 机构确认订单
   * 将 pending_confirm 状态的订单变为 confirmed，同时确认关联的预约
   */
  @Transactional()
  async confirm(id: string): Promise<void> {
    const order = await this.orderRepository.findOneById(id);
    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.status !== 'pending_confirm') {
      throw new BadRequestException('只能确认待确认状态的订单');
    }

    // ⚠️ 机构归属校验：确保只有该订单所属机构才能操作
    const institutionId = this.userContextService.getInstitutionId();
    if (institutionId && order.institution_id !== institutionId) {
      throw new BadRequestException('无权确认此订单');
    }

    // 更新订单状态为已确认
    order.status = 'confirmed';
    await this.orderRepository.save(order);

    // 更新课程销量
    await this.incrementSalesCount(order.course_id);

    // 创建邀请订单（如果使用了邀请码）
    await this.createInviteOrderIfNeeded(order);

    // 自动确认关联的预约
    if (order.booking_id) {
      const bookingIds = order.booking_id.split(',').filter((id: string) => id.trim());
      for (const bookingId of bookingIds) {
        await this.bookingRepository
          .createQueryBuilder()
          .update(BookingEntity)
          .set({
            status: 'confirmed',
            confirmed_at: new Date(),
          })
          .where('id = :id', { id: bookingId })
          .andWhere('status = :status', { status: 'pending' })
          .andWhere('is_delete = :isDelete', { isDelete: false })
          .execute();
      }
    }

    this.logger.log(`订单已确认: ${order.order_no}`);
  }

  /**
   * 处理退款（机构端）
   * 机构同意退款时，向微信发起退款请求
   *
   * 三阶段流程（Fix 8: 将 HTTP 调用移出 @Transactional 上下文）：
   *   Phase-1（快速事务）: CAS 订单状态 refund_pending → refunding
   *   Phase-2（无事务）:   调用微信退款 HTTP 接口
   *   Phase-3（快速事务）: DB 收尾 → refunded + 余额/预约/库存/邀请副作用
   * 优势：DB 连接不在 HTTP 等待期间占用，消除连接池耗尽风险
   */
  async processRefund(
    id: string,
    approved: boolean,
    reason?: string,
  ): Promise<void> {
    // --- Phase-0: 读取订单 & 校验 ---
    const order = await this.orderRepository.findOneById(id);

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.status !== 'refund_pending') {
      throw new BadRequestException('订单状态不正确，只能处理退款审批中的订单');
    }

    // ⚠️ 机构归属校验（Fix 3b）：确保只有该订单所属机构才能操作
    const institutionId = this.userContextService.getInstitutionId();
    if (institutionId && order.institution_id !== institutionId) {
      throw new BadRequestException('无权处理此订单的退款');
    }

    if (!approved) {
      // 拒绝退款：纯 DB 操作，直接用事务封装
      await this.dataSource.transaction(async (manager) => {
        await manager.query(
          `UPDATE orders
           SET status = 'refund_rejected', refund_reason = $1, updated_at = NOW()
           WHERE id = $2 AND status = 'refund_pending' AND is_delete = false`,
          [reason || order.refund_reason, id],
        );
      });
      return;
    }

    // --- Phase-1: CAS 过渡到 refunding（快速事务，无 HTTP）---
    const refundInfo = this.calculateRefundAmount(order);
    const refundNo = order.refund_no || `REF${Date.now()}${Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0')}`;

    const casResult = await this.dataSource.query(
      `UPDATE orders
       SET status = 'refunding',
           online_refund_amount  = $1,
           offline_refund_amount = $2,
           refund_no             = $3,
           updated_at            = NOW()
       WHERE id = $4 AND status = 'refund_pending' AND is_delete = false
       RETURNING id`,
      [
        refundInfo.online_refund_amount,
        refundInfo.offline_refund_amount,
        refundNo,
        id,
      ],
    );
    if (!casResult || casResult.length === 0) {
      throw new BadRequestException('订单状态已变更，请刷新重试');
    }

    // --- Phase-2: 调用微信退款 HTTP（无事务，DB 连接已归还）---
    let wechatRefundId = '';

    if (refundInfo.online_refund_amount > 0 && order.transaction_no) {
      // 重新读取订单以获取最新 refund_no
      const freshOrder = await this.orderRepository.findOneById(id);
      const refundResult = await this.paymentService.createRefund(
        freshOrder!,
        refundInfo.online_refund_amount,
        refundNo,
      );

      if (!refundResult.success) {
        // 回滚到 refund_pending，保留已计算的退款金额供重试
        await this.dataSource.query(
          `UPDATE orders
           SET status = 'refund_pending', updated_at = NOW()
           WHERE id = $1`,
          [id],
        );
        throw new BadRequestException(
          refundResult.message || '微信退款请求失败，请稍后重试',
        );
      }

      wechatRefundId = refundResult.refund_id || '';
      this.logger.log(
        `订单退款已受理: ${order.order_no}, 微信状态=${refundResult.status}`,
      );
    } else {
      this.logger.log(`订单退款成功（纯线下）: ${order.order_no}`);
    }

    // --- Phase-3: DB 收尾（快速事务，无 HTTP）---
    await this._finalizeApprovedRefund(id, order, wechatRefundId);
  }

  /**
   * 退款成功后的 DB 收尾（纯 DB，无外部调用）
   * 供 processRefund 和 handleRefundNotify 共用
   */
  @Transactional()
  private async _finalizeApprovedRefund(
    id: string,
    order: OrderEntity,
    wechatRefundId: string,
  ): Promise<void> {
    await this.dataSource.query(
      `UPDATE orders
       SET status = 'refunded', refunded_at = NOW(),
           wechat_refund_id = $1, refund_status = 'success', updated_at = NOW()
       WHERE id = $2`,
      [wechatRefundId, id],
    );

    // 如果订单使用了余额支付，退款成功后归还余额
    if (Number(order.use_balance_amount) > 0) {
      await this.userBalanceRepository.addBalance(
        order.user_id,
        Number(order.use_balance_amount),
      );
      this.logger.log(
        `退款成功，归还余额: 用户=${order.user_id}, 金额=${order.use_balance_amount}`,
      );
    }

    await this.decrementSalesCount(order.course_id);
    await this.cancelOrderBookings(order.booking_id);
    await this.restoreSkuStock(order.sku_id);

    // 取消邀请订单（撤回返现，避免返现被解锁给邀请人）
    try {
      await this.inviteService.cancelInviteOrder(order.id);
    } catch (e) {
      this.logger.warn(`取消邀请订单失败（不影响退款主流程）: ${e.message}`);
    }
  }

  /**
   * 取消订单
   */
  async cancel(id: string): Promise<void> {
    const userId = this.userContextService.getCurrentUserId();
    const order = await this.orderRepository.findOneById(id);

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.user_id !== userId) {
      throw new BadRequestException('无权操作此订单');
    }

    if (order.status !== 'pending') {
      throw new BadRequestException('只能取消待支付订单');
    }

    // 【重要】先关闭微信支付，成功后再修改本地订单状态，保证数据一致性
    if (order.wechat_prepay_id) {
      const closeResult = await this.paymentService.closeWechatOrder(order.order_no);
      
      // 如果不能取消本地订单（如订单已支付），则抛出异常回滚事务
      if (!closeResult.canCancelOrder) {
        throw new BadRequestException(
          closeResult.message || '无法取消订单，微信支付关闭失败'
        );
      }
      
      this.logger.log(`微信订单关闭成功: ${order.order_no}`);
    }

    // 微信支付关闭成功（或无需关闭）后，快速事务收尾
    await this.dataSource.transaction(async () => {
      // CAS: pending -> cancelled，防并发重复取消
      const casRows = await this.dataSource.query(
        `UPDATE orders
         SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND status = 'pending' AND is_delete = false
         RETURNING id`,
        [id],
      );
      if (!casRows || casRows.length === 0) {
        throw new BadRequestException('订单状态已变更，请刷新后重试');
      }

      // 【重要】如果订单使用了余额支付，需要归还余额
      if (Number(order.use_balance_amount) > 0) {
        await this.dataSource.query(
          `UPDATE user_balances
           SET balance = balance + $1, updated_at = NOW()
           WHERE user_id = $2 AND is_delete = false`,
          [Number(order.use_balance_amount), order.user_id],
        );
        this.logger.log(
          `订单取消，归还余额: 用户=${order.user_id}, 金额=${order.use_balance_amount}`,
        );
      }
    });

    // 同步取消关联的预约并归还 SKU 库存
    await this.cancelOrderBookings(order.booking_id);
    await this.restoreSkuStock(order.sku_id);
    // 取消邀请订单（归还尚未解锁的返现资格）
    try {
      await this.inviteService.cancelInviteOrder(id);
    } catch (e) {
      this.logger.warn(`取消邀请订单失败（不影响取消主流程）: ${e.message}`);
    }
  }

  /**
   * 完成订单
   */
  @Transactional()
  async complete(id: string): Promise<void> {
    const order = await this.orderRepository.findOneById(id);

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.status !== 'confirmed') {
      throw new BadRequestException('只能完成已确认的订单');
    }

    order.status = 'completed';
    order.completed_at = new Date();

    await this.orderRepository.save(order);
  }

  /**
   * 为订单列表附加 refund_info
   */
  private attachRefundInfo(orders: OrderEntity[]): any[] {
    return orders.map((order) => ({
      ...order,
      refund_info: this.calculateRefundAmount(order),
    }));
  }

  /**
   * 查询我的订单列表
   */
  async findMyOrders(page?: number, pageSize?: number, status?: string) {
    const userId = this.userContextService.getCurrentUserId();
    const result = await this.orderRepository.findByUserId(userId, page, pageSize, status);

    if (Array.isArray(result)) {
      return this.attachRefundInfo(result);
    }
    // 分页模式
    return {
      ...result,
      data: this.attachRefundInfo(result.data),
    };
  }

  /**
   * 查询机构订单列表
   */
  async findInstitutionOrders(
    institutionId: string,
    page?: number,
    pageSize?: number,
    status?: string,
    period?: string,
    startDate?: string,
    endDate?: string,
  ) {
    // 机构账号只允许查询本机构数据；管理员可跨机构查询
    if (!this.userContextService.hasRole('admin')) {
      const currentInstitutionId = this.userContextService.getInstitutionId();
      if (!currentInstitutionId || currentInstitutionId !== institutionId) {
        throw new BadRequestException('无权查看该机构订单');
      }
    }

    const result = await this.orderRepository.findByInstitutionId(
      institutionId,
      page,
      pageSize,
      status,
      period,
      startDate,
      endDate,
    );

    if (Array.isArray(result)) {
      return this.attachRefundInfo(result);
    }
    // 分页模式
    return {
      ...result,
      data: this.attachRefundInfo(result.data),
    };
  }

  /**
   * 查询所有订单（管理员用）
   */
  async findAllOrders(
    page?: number,
    pageSize?: number,
    status?: string,
    period?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const result = await this.orderRepository.findAllOrders(
      page,
      pageSize,
      status,
      period,
      startDate,
      endDate,
    );

    if (Array.isArray(result)) {
      return this.attachRefundInfo(result);
    }
    return {
      ...result,
      data: this.attachRefundInfo(result.data),
    };
  }

  /**
   * 根据课程进度计算退款金额
   * 退款金额 = 剩余课时比例 × 对应支付金额
   * 线上退款 = 线上支付金额 × 剩余比例
   * 线下退款 = 线下支付金额 × 剩余比例
   */
  calculateRefundAmount(order: OrderEntity): {
    refundable: boolean;
    remaining_ratio: number;
    total_refund_amount: number;
    online_refund_amount: number;
    offline_refund_amount: number;
    completed_lessons: number;
    total_lessons: number;
  } {
    const totalLessons = order.total_lessons || 0;
    const completedLessons = order.completed_lessons || 0;

    // 无课时信息时，按全额退款
    if (totalLessons <= 0) {
      const onlineFen = MoneyMath.yuan2fen(Number(order.online_pay_amount) || 0);
      const offlineFen = MoneyMath.yuan2fen(Number(order.offline_pay_amount) || 0);
      return {
        refundable: true,
        remaining_ratio: 1,
        total_refund_amount: MoneyMath.fen2yuan(onlineFen + offlineFen),
        online_refund_amount: MoneyMath.fen2yuan(onlineFen),
        offline_refund_amount: MoneyMath.fen2yuan(offlineFen),
        completed_lessons: completedLessons,
        total_lessons: totalLessons,
      };
    }

    // 全部课时已完成，不可退款
    if (completedLessons >= totalLessons) {
      return {
        refundable: false,
        remaining_ratio: 0,
        total_refund_amount: 0,
        online_refund_amount: 0,
        offline_refund_amount: 0,
        completed_lessons: completedLessons,
        total_lessons: totalLessons,
      };
    }

    const remainingRatio = (totalLessons - completedLessons) / totalLessons;
    const onlineFen = MoneyMath.yuan2fen(Number(order.online_pay_amount) || 0);
    const offlineFen = MoneyMath.yuan2fen(Number(order.offline_pay_amount) || 0);
    const onlineRefundFen = MoneyMath.ratioOfFen(onlineFen, remainingRatio);
    const offlineRefundFen = MoneyMath.ratioOfFen(offlineFen, remainingRatio);
    const totalRefundFen = onlineRefundFen + offlineRefundFen;

    return {
      refundable: true,
      remaining_ratio: Number(remainingRatio.toFixed(4)),
      total_refund_amount: MoneyMath.fen2yuan(totalRefundFen),
      online_refund_amount: MoneyMath.fen2yuan(onlineRefundFen),
      offline_refund_amount: MoneyMath.fen2yuan(offlineRefundFen),
      completed_lessons: completedLessons,
      total_lessons: totalLessons,
    };
  }

  /**
   * 查询订单详情（附带退款金额信息）
   */
  async findOne(id: string) {
    const order = await this.orderRepository.findOneById(id);
    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    this.assertOrderAccess(order);

    // 计算退款金额信息（对 refund_pending/refunding/confirmed/completed 状态均计算，方便前端展示）
    const refundInfo = this.calculateRefundAmount(order);

    return {
      ...order,
      refund_info: refundInfo,
    };
  }

  /**
   * 根据订单号查询
   */
  async findByOrderNo(orderNo: string) {
    const order = await this.orderRepository.findByOrderNo(orderNo);
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    this.assertOrderAccess(order);
    return order;
  }

  /**
   * 统计机构收入
   */
  async getInstitutionRevenue(institutionId: string): Promise<number> {
    if (!this.userContextService.hasRole('admin')) {
      const currentInstitutionId = this.userContextService.getInstitutionId();
      if (!currentInstitutionId || currentInstitutionId !== institutionId) {
        throw new BadRequestException('无权查看该机构收入');
      }
    }
    return this.orderRepository.getInstitutionRevenue(institutionId);
  }

  /**
   * 处理超时订单（定时任务调用）
   * 查找已过期但仍为待支付状态的订单，自动取消并关闭微信支付
   *
   * Fix 9: 每条订单的 DB 操作（状态更新 + 余额归还 + 预约/库存/邀请副作用）
   * 包裹在独立的 dataSource.transaction() 中，防止中途失败导致部分更新。
   * 微信 HTTP 调用（closeWechatOrder）在事务外执行，确保连接不被长时间占用。
   */
  async handleExpiredOrders(): Promise<{ processed: number; closed: number; skipped: number }> {
    // 查询所有过期的待支付订单
    const expiredOrders = await this.orderRepository.findExpiredPendingOrders();
    
    let processed = 0;
    let closed = 0;
    let skipped = 0;

    for (const order of expiredOrders) {
      try {
        // Step-1: HTTP（无事务，DB 连接不占用）
        if (order.wechat_prepay_id) {
          const closeResult = await this.paymentService.closeWechatOrder(order.order_no);
          
          if (!closeResult.canCancelOrder) {
            this.logger.warn(
              `超时订单无法取消（${closeResult.code}）: ${order.order_no}, ${closeResult.message}`
            );
            skipped++;
            continue;
          }
          
          closed++;
        }

        // Step-2: 所有 DB 副作用包裹在同一事务中，保证原子性（Fix 9）
        await this.dataSource.transaction(async () => {
          // 原子 CAS 更新订单状态，避免并发重复处理
          const casResult = await this.dataSource.query(
            `UPDATE orders
             SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
             WHERE id = $1 AND status = 'pending' AND is_delete = false
             RETURNING id`,
            [order.id],
          );
          if (!casResult || casResult.length === 0) {
            // 已被其他并发路径处理，跳过
            return;
          }

          // 归还余额（若有）
          if (Number(order.use_balance_amount) > 0) {
            await this.dataSource.query(
              `UPDATE user_balances
               SET balance = balance + $1, updated_at = NOW()
               WHERE user_id = $2 AND is_delete = false`,
              [Number(order.use_balance_amount), order.user_id],
            );
          }
        });

        // Step-3: 副作用（预约/库存/邀请）—— 允许单项失败不阻断其他
        await this.cancelOrderBookings(order.booking_id);
        await this.restoreSkuStock(order.sku_id);
        try {
          await this.inviteService.cancelInviteOrder(order.id);
        } catch (e) {
          this.logger.warn(`超时取消邀请订单失败: ${e.message}`);
        }

        processed++;
        this.logger.log(`自动取消超时订单: ${order.order_no}`);
      } catch (error) {
        this.logger.error(`处理超时订单失败: ${order.order_no}`, error);
        skipped++;
      }
    }

    if (processed > 0 || skipped > 0) {
      this.logger.log(
        `超时订单处理完成: 取消 ${processed} 个, 关闭微信支付 ${closed} 个, 跳过 ${skipped} 个`
      );
    }

    return { processed, closed, skipped };
  }

  /**
   * 处理超过48小时未处理的退款申请（定时任务调用）
   * PRD §3.5.5: 退款申请提交后48小时内机构必须处理，否则自动同意
   */
  async handleExpiredRefunds(): Promise<{ processed: number }> {
    const expiredOrders = await this.orderRepository.findExpiredRefundPendingOrders();
    let processed = 0;

    for (const order of expiredOrders) {
      try {
        await this.processRefund(order.id, true, '系统自动审批（超过48小时未处理）');
        processed++;
        this.logger.log(`48h自动审批退款: ${order.order_no}`);
      } catch (error) {
        this.logger.error(`48h自动审批退款失败: ${order.order_no}`, error.message);
      }
    }

    if (processed > 0) {
      this.logger.log(`48h退款自动审批完成: 处理 ${processed} 个`);
    }

    return { processed };
  }
}
