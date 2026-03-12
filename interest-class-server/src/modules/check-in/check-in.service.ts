import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Transactional } from '@/common/decorators/transaction.decorator';
import { UserContextService } from '@/common/services/user-context.service';
import { CheckInRepository } from './repositories/check-in.repository';
import { InviteService } from '../invite/invite.service';
import { CheckInDto, MakeupCheckInDto, QueryCheckInDto } from './dto/check-in.dto';
import { CheckInEntity } from './entities/check-in.entity';

@Injectable()
export class CheckInService {
  private readonly logger = new Logger(CheckInService.name);

  constructor(
    private checkInRepository: CheckInRepository,
    private userContextService: UserContextService,
    private dataSource: DataSource,
    private inviteService: InviteService,
  ) {}

  /**
   * 签到（扣课时）
   */
  @Transactional()
  async checkIn(dto: CheckInDto): Promise<{
    id: string;
    lesson_no: number;
    completed_lessons: number;
    total_lessons: number;
  }> {
    const userId = this.userContextService.getCurrentUserId();

    // 1. 查询订单信息
    const order = await this.dataSource.query(
      `SELECT id, user_id, institution_id, course_id, status, 
              completed_lessons, total_lessons, sku_snapshot
       FROM orders 
       WHERE id = $1 AND is_delete = false`,
      [dto.order_id],
    );

    if (!order || order.length === 0) {
      throw new NotFoundException('订单不存在');
    }

    const orderData = order[0];

    // 2. 验证权限
    if (orderData.user_id !== userId) {
      throw new BadRequestException('无权操作此订单');
    }

    // 3. 验证订单状态
    if (orderData.status !== 'confirmed' && orderData.status !== 'completed') {
      throw new BadRequestException('订单状态不允许签到，请确认订单已支付并确认');
    }

    // 4. 获取总课时数
    let totalLessons = orderData.total_lessons || 0;
    if (!totalLessons && orderData.sku_snapshot) {
      totalLessons = orderData.sku_snapshot.class_count || 0;
    }

    // 5. 检查是否已完成所有课时
    const completedLessons = orderData.completed_lessons || 0;
    if (completedLessons >= totalLessons) {
      throw new BadRequestException('课时已全部用完');
    }

    // 6. 检查这节课是否已签到（必须传入 booking_id）
    if (!dto.booking_id) {
      throw new BadRequestException('缺少预约信息，无法签到');
    }
    
    const hasCheckedIn = await this.checkInRepository.hasCheckedInByBookingId(dto.booking_id);
    if (hasCheckedIn) {
      throw new BadRequestException('这节课已经签到过了');
    }

    // 7. 创建签到记录
    const lessonNo = completedLessons + 1;
    const checkIn = this.checkInRepository.create({
      order_id: dto.order_id,
      user_id: userId,
      institution_id: orderData.institution_id,
      course_id: orderData.course_id,
      booking_id: dto.booking_id,
      schedule_id: dto.schedule_id,
      check_in_time: new Date(),
      is_makeup: false,
      lesson_no: lessonNo,
      latitude: dto.latitude,
      longitude: dto.longitude,
      remark: dto.remark,
    });

    const saved = await this.checkInRepository.save(checkIn);
    const checkInId = Array.isArray(saved) ? saved[0].id : saved.id;

    // 8. 原子递增课时 + 条件自动完成订单（防止并发双签到导致课时超额或双重返现）
    // 使用单条 SQL 确保「读-改-写」在数据库层面原子完成，消除 TOCTOU 竞态
    const updateResult = await this.dataSource.query(
      `UPDATE orders
       SET completed_lessons = completed_lessons + 1,
           status            = CASE WHEN completed_lessons + 1 >= total_lessons THEN 'completed' ELSE status END,
           completed_at      = CASE WHEN completed_lessons + 1 >= total_lessons THEN NOW() ELSE completed_at END,
           updated_at        = NOW()
       WHERE id = $1
         AND completed_lessons < total_lessons
         AND is_delete = false
       RETURNING completed_lessons, total_lessons`,
      [dto.order_id],
    );

    // TypeORM 0.3.28 returns [rows, rowCount] for UPDATE queries (AGENTS.md Error 47)
    // result[0] = rows array, result[1] = rowCount
    const updatedRows = Array.isArray(updateResult[0]) ? updateResult[0] : updateResult;
    if (!updatedRows || updatedRows.length === 0) {
      throw new BadRequestException('课时已全部用完，无法重复签到');
    }

    const updatedRow = updatedRows[0];
    const newCompletedLessons = Number(updatedRow.completed_lessons);
    const finalTotalLessons   = Number(updatedRow.total_lessons);

    // 10. 触发返现解锁（如果订单关联了邀请码）
    try {
      await this.inviteService.updateCompletionAndUnlock(
        dto.order_id,
        newCompletedLessons,
      );
      this.logger.log(
        `订单 ${dto.order_id} 签到触发返现解锁：${newCompletedLessons}/${finalTotalLessons}`,
      );
    } catch (error) {
      this.logger.error(`返现解锁失败: ${error.message} | stack: ${error.stack?.split('\n')[1]}`);
      // 不抛出错误，避免影响签到主流程
    }

    return {
      id: checkInId,
      lesson_no: lessonNo,
      completed_lessons: newCompletedLessons,
      total_lessons: finalTotalLessons,
    };
  }

  /**
   * 补卡
   */
  @Transactional()
  async makeupCheckIn(dto: MakeupCheckInDto): Promise<{
    id: string;
    lesson_no: number;
    completed_lessons: number;
    total_lessons: number;
  }> {
    const userId = this.userContextService.getCurrentUserId();

    // 1. 验证补卡日期不能是未来（使用本地日期字符串比较）
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    if (dto.makeup_date > todayStr) {
      throw new BadRequestException('补卡日期不能是未来日期');
    }

    // 将字符串日期转换为 Date 对象
    const makeupDate = new Date(dto.makeup_date);

    // 2. 查询订单信息
    const order = await this.dataSource.query(
      `SELECT id, user_id, institution_id, course_id, status, 
              completed_lessons, total_lessons, sku_snapshot
       FROM orders 
       WHERE id = $1 AND is_delete = false`,
      [dto.order_id],
    );

    if (!order || order.length === 0) {
      throw new NotFoundException('订单不存在');
    }

    const orderData = order[0];

    // 3. 验证权限
    if (orderData.user_id !== userId) {
      throw new BadRequestException('无权操作此订单');
    }

    // 4. 验证订单状态
    if (orderData.status !== 'confirmed' && orderData.status !== 'completed') {
      throw new BadRequestException('订单状态不允许签到');
    }

    // 5. 获取总课时数
    let totalLessons = orderData.total_lessons || 0;
    if (!totalLessons && orderData.sku_snapshot) {
      totalLessons = orderData.sku_snapshot.class_count || 0;
    }

    // 6. 检查是否已完成所有课时
    const completedLessons = orderData.completed_lessons || 0;
    if (completedLessons >= totalLessons) {
      throw new BadRequestException('课时已全部用完');
    }

    // 7. 检查该日期是否已补卡
    const hasMakeup = await this.checkInRepository.hasMakeupForDate(
      dto.order_id,
      makeupDate,
    );
    if (hasMakeup) {
      throw new BadRequestException('该日期已补卡过了');
    }

    // 8. 创建补卡记录
    const lessonNo = completedLessons + 1;
    const checkIn = this.checkInRepository.create({
      order_id: dto.order_id,
      user_id: userId,
      institution_id: orderData.institution_id,
      course_id: orderData.course_id,
      check_in_time: new Date(),
      is_makeup: true,
      makeup_date: makeupDate,
      lesson_no: lessonNo,
      remark: dto.remark || `补卡：${dto.makeup_date}`,
    });

    const saved = await this.checkInRepository.save(checkIn);
    const checkInId = Array.isArray(saved) ? saved[0].id : saved.id;

    // 9. 原子递增课时 + 条件自动完成订单（防止并发双补卡）
    const updateResult = await this.dataSource.query(
      `UPDATE orders
       SET completed_lessons = completed_lessons + 1,
           status            = CASE WHEN completed_lessons + 1 >= total_lessons THEN 'completed' ELSE status END,
           completed_at      = CASE WHEN completed_lessons + 1 >= total_lessons THEN NOW() ELSE completed_at END,
           updated_at        = NOW()
       WHERE id = $1
         AND completed_lessons < total_lessons
         AND is_delete = false
       RETURNING completed_lessons, total_lessons`,
      [dto.order_id],
    );

    if (!updateResult || updateResult.length === 0) {
      throw new BadRequestException('课时已全部用完，无法补卡');
    }

    // TypeORM 0.3.28 returns [rows, rowCount] for UPDATE queries (AGENTS.md Error 47)
    const updatedRows = Array.isArray(updateResult[0]) ? updateResult[0] : updateResult;
    if (!updatedRows || updatedRows.length === 0) {
      throw new BadRequestException('课时已全部用完，无法补卡');
    }

    const updatedRow = updatedRows[0];
    const newCompletedLessons = Number(updatedRow.completed_lessons);
    const finalTotalLessons   = Number(updatedRow.total_lessons);

    // 11. 触发返现解锁（如果订单关联了邀请码）
    try {
      await this.inviteService.updateCompletionAndUnlock(
        dto.order_id,
        newCompletedLessons,
      );
      this.logger.log(
        `订单 ${dto.order_id} 补卡触发返现解锁：${newCompletedLessons}/${finalTotalLessons}`,
      );
    } catch (error) {
      this.logger.error(`返现解锁失败: ${error.message}`);
      // 不抛出错误，避免影响补卡主流程
    }

    return {
      id: checkInId,
      lesson_no: lessonNo,
      completed_lessons: newCompletedLessons,
      total_lessons: finalTotalLessons,
    };
  }

  /**
   * 查询签到记录
   */
  async findCheckInRecords(query: QueryCheckInDto): Promise<CheckInEntity[]> {
    const userId = this.userContextService.getCurrentUserId();

    if (query.order_id) {
      // 验证订单归属
      const order = await this.dataSource.query(
        `SELECT user_id FROM orders WHERE id = $1 AND is_delete = false`,
        [query.order_id],
      );

      if (!order || order.length === 0) {
        throw new NotFoundException('订单不存在');
      }

      if (order[0].user_id !== userId) {
        throw new BadRequestException('无权查看此订单的签到记录');
      }

      return this.checkInRepository.findByOrderId(query.order_id);
    }

    return this.checkInRepository.findByUserId(userId, {
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  /**
   * 查询订单的签到状态（课时进度）
   */
  async getOrderCheckInStatus(orderId: string): Promise<{
    completed_lessons: number;
    total_lessons: number;
    progress_percent: number;
    records: CheckInEntity[];
  }> {
    const userId = this.userContextService.getCurrentUserId();

    // 查询订单信息
    const order = await this.dataSource.query(
      `SELECT id, user_id, completed_lessons, total_lessons, sku_snapshot
       FROM orders 
       WHERE id = $1 AND is_delete = false`,
      [orderId],
    );

    if (!order || order.length === 0) {
      throw new NotFoundException('订单不存在');
    }

    const orderData = order[0];

    if (orderData.user_id !== userId) {
      throw new BadRequestException('无权查看此订单');
    }

    // 获取总课时数
    let totalLessons = orderData.total_lessons || 0;
    if (!totalLessons && orderData.sku_snapshot) {
      totalLessons = orderData.sku_snapshot.class_count || 0;
    }

    const completedLessons = orderData.completed_lessons || 0;
    const records = await this.checkInRepository.findByOrderId(orderId);

    return {
      completed_lessons: completedLessons,
      total_lessons: totalLessons,
      progress_percent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      records,
    };
  }

  /**
   * 批量查询预约的签到状态
   * @param bookingIds 预约ID数组
   * @returns 每个预约是否已签到的映射 { [bookingId]: hasCheckedIn }
   */
  async batchGetBookingCheckInStatus(bookingIds: string[]): Promise<Record<string, boolean>> {
    if (!bookingIds || bookingIds.length === 0) {
      return {};
    }

    const statusMap = await this.checkInRepository.batchCheckBookingStatus(bookingIds);
    
    // 转换为普通对象返回
    const result: Record<string, boolean> = {};
    for (const [bookingId, hasCheckedIn] of statusMap) {
      result[bookingId] = hasCheckedIn;
    }
    
    return result;
  }
}
