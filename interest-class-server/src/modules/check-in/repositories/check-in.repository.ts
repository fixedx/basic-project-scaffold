import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { UserContextService } from '@/common/services/user-context.service';
import { CheckInEntity } from '../entities/check-in.entity';

@Injectable()
export class CheckInRepository extends BaseRepository<CheckInEntity> {
  constructor(
    private dataSource: DataSource,
    private userCtx: UserContextService,
  ) {
    super(CheckInEntity, dataSource.createEntityManager());
    this.setUserContextService(userCtx);
  }

  /**
   * 根据订单ID查询签到记录
   */
  async findByOrderId(orderId: string): Promise<CheckInEntity[]> {
    return this.getQuery()
      .andWhere('entity.order_id = :orderId', { orderId })
      .orderBy('entity.lesson_no', 'ASC')
      .getMany();
  }

  /**
   * 根据用户ID查询签到记录
   */
  async findByUserId(
    userId: string,
    options?: { page?: number; pageSize?: number },
  ): Promise<CheckInEntity[]> {
    const qb = this.getQuery()
      .andWhere('entity.user_id = :userId', { userId })
      .orderBy('entity.check_in_time', 'DESC');

    if (options?.page && options?.pageSize) {
      qb.skip((options.page - 1) * options.pageSize).take(options.pageSize);
    }

    return qb.getMany();
  }

  /**
   * 统计订单的签到次数
   */
  async countByOrderId(orderId: string): Promise<number> {
    return this.getQuery()
      .andWhere('entity.order_id = :orderId', { orderId })
      .getCount();
  }

  /**
   * 检查指定日期是否已补卡
   */
  async hasMakeupForDate(orderId: string, date: Date): Promise<boolean> {
    const dateStr = date.toISOString().split('T')[0];

    const count = await this.getQuery()
      .andWhere('entity.order_id = :orderId', { orderId })
      .andWhere('entity.is_makeup = true')
      .andWhere('entity.makeup_date = :dateStr', { dateStr })
      .getCount();

    return count > 0;
  }

  /**
   * 检查某个预约是否已签到
   * @param bookingId 预约ID
   * @returns 是否已签到
   */
  async hasCheckedInByBookingId(bookingId: string): Promise<boolean> {
    const count = await this.getQuery()
      .andWhere('entity.booking_id = :bookingId', { bookingId })
      .getCount();
    return count > 0;
  }

  /**
   * 批量查询多个预约的签到状态
   * @param bookingIds 预约ID数组
   * @returns Map<bookingId, hasCheckedIn>
   */
  async batchCheckBookingStatus(bookingIds: string[]): Promise<Map<string, boolean>> {
    if (!bookingIds || bookingIds.length === 0) {
      return new Map();
    }

    const records = await this.getQuery()
      .andWhere('entity.booking_id IN (:...bookingIds)', { bookingIds })
      .select('entity.booking_id')
      .getMany();

    const checkedInBookingIds = new Set(records.map(r => r.booking_id));
    const result = new Map<string, boolean>();
    
    for (const bookingId of bookingIds) {
      result.set(bookingId, checkedInBookingIds.has(bookingId));
    }
    
    return result;
  }
}
