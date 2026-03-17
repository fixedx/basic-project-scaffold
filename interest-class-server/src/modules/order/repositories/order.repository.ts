import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { OrderEntity } from '../entities/order.entity';
import { UserContextService } from '@/common/services/user-context.service';

@Injectable()
export class OrderRepository extends BaseRepository<OrderEntity> {
  constructor(
    private dataSource: DataSource,
    private userCtx: UserContextService,
  ) {
    super(OrderEntity, dataSource.createEntityManager());
    this.setUserContextService(userCtx);
  }

  /**
   * 机构收入确认口径：
   * - confirmed / completed / refund_rejected：按整单确认收入
   * - refunded：按已上课比例确认收入（兼容“部分履约后退款”）
   *
   * 基础收入口径统一使用：original_price - cashback_amount
   * 即机构应得课程收入，不包含平台佣金，也不受支付结构影响。
   */
  getInstitutionRevenueExpression(alias = 'order'): string {
    const baseRevenue = `GREATEST(COALESCE(${alias}.original_price, 0) - COALESCE(${alias}.cashback_amount, 0), 0)`;
    const completedLessons = `LEAST(GREATEST(COALESCE(${alias}.completed_lessons, 0), 0), COALESCE(${alias}.total_lessons, 0))`;

    return `CASE
      WHEN ${alias}.status IN ('confirmed', 'completed', 'refund_rejected') THEN ${baseRevenue}
      WHEN ${alias}.status = 'refunded' AND COALESCE(${alias}.total_lessons, 0) > 0
        THEN (${baseRevenue} * ${completedLessons} / NULLIF(${alias}.total_lessons, 0))
      ELSE 0
    END`;
  }

  /**
   * 平台佣金确认口径：
   * - completed / confirmed / refund_rejected / refunded：统一按已上课比例确认佣金
   */
  getPlatformCommissionExpression(alias = 'order'): string {
    const baseCommission = `GREATEST(COALESCE(${alias}.commission_amount, 0), 0)`;
    const completedLessons = `LEAST(GREATEST(COALESCE(${alias}.completed_lessons, 0), 0), COALESCE(${alias}.total_lessons, 0))`;

    return `CASE
      WHEN ${alias}.status IN ('confirmed', 'refund_rejected', 'completed', 'refunded')
        AND COALESCE(${alias}.total_lessons, 0) > 0
        THEN (${baseCommission} * ${completedLessons} / NULLIF(${alias}.total_lessons, 0))
      ELSE 0
    END`;
  }

  /**
   * 根据订单号查询
   */
  async findByOrderNo(orderNo: string): Promise<OrderEntity | null> {
    return this.getQuery()
      .andWhere('entity.order_no = :orderNo', { orderNo })
      .getOne();
  }

  /**
   * 根据用户ID查询订单列表
   */
  async findByUserId(userId: string, page?: number, pageSize?: number, status?: string) {
    const queryBuilder = this.getQuery().andWhere('entity.user_id = :userId', {
      userId,
    });

    if (status) {
      const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
      if (statuses.length === 1) {
        queryBuilder.andWhere('entity.status = :status', { status: statuses[0] });
      } else if (statuses.length > 1) {
        queryBuilder.andWhere('entity.status IN (:...statuses)', { statuses });
      }
    }

    // 分页兼容模式
    if (page && pageSize) {
      const skip = (page - 1) * pageSize;
      const [data, total] = await queryBuilder
        .skip(skip)
        .take(pageSize)
        .getManyAndCount();

      return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }

    return queryBuilder.getMany();
  }

  /**
   * 根据机构ID查询订单列表
   */
  async findByInstitutionId(
    institutionId: string,
    page?: number,
    pageSize?: number,
    status?: string,
    period?: string,
    startDate?: string,
    endDate?: string,
    commissionOnly?: boolean,
  ) {
    const queryBuilder = this.getQuery().andWhere(
      'entity.institution_id = :institutionId',
      { institutionId },
    );
    const commissionExpression = this.getPlatformCommissionExpression('entity');

    if (status) {
      const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
      if (statuses.length === 1) {
        queryBuilder.andWhere('entity.status = :status', { status: statuses[0] });
      } else if (statuses.length > 1) {
        queryBuilder.andWhere('entity.status IN (:...statuses)', { statuses });
      }
    }

    // 时间过滤
    const hasPeriodFilter = !!period && period !== 'all';
    if (hasPeriodFilter) {
      const now = new Date();
      let periodStart: Date | null = null;
      let periodEnd: Date | null = null;

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

      if (periodStart) {
        queryBuilder.andWhere('entity.created_at >= :periodStart', { periodStart });
      }
      if (periodEnd) {
        queryBuilder.andWhere('entity.created_at <= :periodEnd', { periodEnd });
      }
    }

    if (commissionOnly) {
      queryBuilder.andWhere(`${commissionExpression} > 0`);
    }

    // 分页兼容模式
    if (page && pageSize) {
      const skip = (page - 1) * pageSize;
      const [data, total] = await queryBuilder
        .skip(skip)
        .take(pageSize)
        .getManyAndCount();

      return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }

    return queryBuilder.getMany();
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
    commissionOnly?: boolean,
  ) {
    const queryBuilder = this.getQuery();
    const commissionExpression = this.getPlatformCommissionExpression('entity');

    if (status) {
      const statuses = status
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (statuses.length === 1) {
        queryBuilder.andWhere('entity.status = :status', {
          status: statuses[0],
        });
      } else if (statuses.length > 1) {
        queryBuilder.andWhere('entity.status IN (:...statuses)', { statuses });
      }
    }

    // 时间过滤
    const hasPeriodFilter = !!period && period !== 'all';
    if (hasPeriodFilter) {
      const now = new Date();
      let periodStart: Date | null = null;
      let periodEnd: Date | null = null;

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

      if (periodStart) {
        queryBuilder.andWhere('entity.created_at >= :periodStart', {
          periodStart,
        });
      }
      if (periodEnd) {
        queryBuilder.andWhere('entity.created_at <= :periodEnd', {
          periodEnd,
        });
      }
    }

    if (commissionOnly) {
      queryBuilder.andWhere(`${commissionExpression} > 0`);
    }

    // 分页兼容模式
    if (page && pageSize) {
      const skip = (page - 1) * pageSize;
      const [data, total] = await queryBuilder
        .skip(skip)
        .take(pageSize)
        .getManyAndCount();

      return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }

    return queryBuilder.getMany();
  }

  /**
   * 统计机构收入
   */
  async getInstitutionRevenue(institutionId: string): Promise<number> {
    const revenueExpression = this.getInstitutionRevenueExpression('order');
    const result = await this.createQueryBuilder('order')
      .select(`COALESCE(SUM(${revenueExpression}), 0)`, 'total')
      .where('order.institution_id = :institutionId', { institutionId })
      .andWhere('order.status IN (:...statuses)', {
        statuses: ['confirmed', 'completed', 'refund_rejected', 'refunded'],
      })
      .andWhere('order.is_delete = false')
      .getRawOne();

    return parseFloat(result?.total || '0');
  }

  /**
   * 查询已过期但仍为待支付状态的订单
   */
  async findExpiredPendingOrders(): Promise<OrderEntity[]> {
    return this.getQuery()
      .andWhere('entity.status = :status', { status: 'pending' })
      .andWhere('entity.expire_at IS NOT NULL')
      .andWhere('entity.expire_at < :now', { now: new Date() })
      .getMany();
  }

  /**
   * 查询超过48小时未处理的退款申请
   * PRD §3.5.5: 退款申请提交后48小时内机构必须处理，否则自动同意
   */
  async findExpiredRefundPendingOrders(): Promise<OrderEntity[]> {
    const deadline = new Date(Date.now() - 48 * 60 * 60 * 1000);
    return this.getQuery()
      .andWhere('entity.status = :status', { status: 'refund_pending' })
      .andWhere('entity.refund_applied_at IS NOT NULL')
      .andWhere('entity.refund_applied_at < :deadline', { deadline })
      .getMany();
  }
}
