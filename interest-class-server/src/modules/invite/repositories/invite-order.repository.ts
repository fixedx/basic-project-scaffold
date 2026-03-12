import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { UserContextService } from '@/common/services/user-context.service';
import { InviteOrderEntity } from '../entities/invite-order.entity';
import { MoneyMath } from '@/common/utils/money.util';

@Injectable()
export class InviteOrderRepository extends BaseRepository<InviteOrderEntity> {
  constructor(
    private dataSource: DataSource,
    private userCtx: UserContextService,
  ) {
    super(InviteOrderEntity, dataSource.createEntityManager());
    this.setUserContextService(userCtx);
  }

  /**
   * 根据订单ID查询邀请订单
   */
  async findByOrderId(orderId: string): Promise<InviteOrderEntity | null> {
    return this.getQuery()
      .andWhere('entity.order_id = :orderId', { orderId })
      .getOne();
  }

  /**
   * 根据邀请人ID查询邀请订单列表
   */
  async findByInviterId(
    inviterId: string,
    status?: string,
  ): Promise<InviteOrderEntity[]> {
    const qb = this.getQuery().andWhere('entity.inviter_id = :inviterId', {
      inviterId,
    });

    if (status) {
      qb.andWhere('entity.status = :status', { status });
    }

    return qb.orderBy('entity.created_at', 'DESC').getMany();
  }

  /**
   * 根据邀请人ID分页查询
   */
  async findByInviterIdPaginated(
    inviterId: string,
    page: number,
    pageSize: number,
    status?: string,
  ) {
    const qb = this.getQuery().andWhere('entity.inviter_id = :inviterId', {
      inviterId,
    });

    if (status) {
      qb.andWhere('entity.status = :status', { status });
    }

    const skip = (page - 1) * pageSize;
    const [data, total] = await qb
      .orderBy('entity.created_at', 'DESC')
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

  /**
   * 根据机构ID查询邀请订单列表
   */
  async findByInstitutionId(
    institutionId: string,
    status?: string,
  ): Promise<InviteOrderEntity[]> {
    const qb = this.getQuery().andWhere(
      'entity.institution_id = :institutionId',
      { institutionId },
    );

    if (status) {
      qb.andWhere('entity.status = :status', { status });
    }

    return qb.orderBy('entity.created_at', 'DESC').getMany();
  }

  /**
   * 根据邀请码ID查询邀请订单列表
   */
  async findByInviteCodeId(inviteCodeId: string): Promise<InviteOrderEntity[]> {
    return this.getQuery()
      .andWhere('entity.invite_code_id = :inviteCodeId', { inviteCodeId })
      .orderBy('entity.created_at', 'DESC')
      .getMany();
  }

  /**
   * 更新完课进度并计算解锁金额
   */
  async updateCompletionProgress(
    id: string,
    completedLessons: number,
  ): Promise<{ newUnlockAmount: number; inviteOrder: InviteOrderEntity }> {
    const inviteOrder = await this.findOneById(id);
    if (!inviteOrder) {
      throw new Error('邀请订单不存在');
    }

    const totalLessons = inviteOrder.total_lessons;
    const actualCashbackFen = MoneyMath.yuan2fen(Number(inviteOrder.actual_cashback));
    const previousUnlockedFen = MoneyMath.yuan2fen(Number(inviteOrder.unlocked_amount));

    // 计算新的解锁比例和金额
    const newUnlockRatio =
      totalLessons > 0
        ? Math.min(100, (completedLessons / totalLessons) * 100)
        : 0;
    const newUnlockedAmountFen = MoneyMath.percentOfFen(
      actualCashbackFen,
      newUnlockRatio,
    );
    const incrementAmountFen = Math.max(0, newUnlockedAmountFen - previousUnlockedFen);

    // 更新状态
    let newStatus: 'pending' | 'unlocking' | 'completed' = inviteOrder.status as
      | 'pending'
      | 'unlocking'
      | 'completed';
    if (completedLessons >= totalLessons) {
      newStatus = 'completed';
    } else if (completedLessons > 0) {
      newStatus = 'unlocking';
    }

    await this.update(id, {
      completed_lessons: completedLessons,
      unlock_ratio: newUnlockRatio,
      unlocked_amount: MoneyMath.fen2yuan(newUnlockedAmountFen),
      status: newStatus,
    });

    return {
      newUnlockAmount: MoneyMath.fen2yuan(incrementAmountFen),
      inviteOrder: { ...inviteOrder, status: newStatus } as InviteOrderEntity,
    };
  }

  /**
   * 统计邀请人的返现数据
   */
  async getInviterStats(inviterId: string) {
    const result = await this.getQuery()
      .andWhere('entity.inviter_id = :inviterId', { inviterId })
      .select([
        'COUNT(entity.id) as total_orders',
        'SUM(entity.cashback_total) as total_cashback',
        'SUM(entity.discount_amount) as total_discount',
        'SUM(entity.actual_cashback) as total_actual_cashback',
        'SUM(entity.unlocked_amount) as total_unlocked',
        'SUM(CASE WHEN entity.status = \'pending\' THEN entity.actual_cashback - entity.unlocked_amount ELSE 0 END) as total_pending',
      ])
      .getRawOne();

    return {
      totalOrders: parseInt(result.total_orders) || 0,
      totalCashback: parseFloat(result.total_cashback) || 0,
      totalDiscount: parseFloat(result.total_discount) || 0,
      totalActualCashback: parseFloat(result.total_actual_cashback) || 0,
      totalUnlocked: parseFloat(result.total_unlocked) || 0,
      totalPending: parseFloat(result.total_pending) || 0,
    };
  }
}
