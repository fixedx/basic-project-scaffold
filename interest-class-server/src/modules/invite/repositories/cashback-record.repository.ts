import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { UserContextService } from '@/common/services/user-context.service';
import { CashbackRecordEntity } from '../entities/cashback-record.entity';

@Injectable()
export class CashbackRecordRepository extends BaseRepository<CashbackRecordEntity> {
  constructor(
    private dataSource: DataSource,
    private userCtx: UserContextService,
  ) {
    super(CashbackRecordEntity, dataSource.createEntityManager());
    this.setUserContextService(userCtx);
  }

  /**
   * 根据用户ID查询流水记录
   */
  async findByUserId(userId: string): Promise<CashbackRecordEntity[]> {
    return this.getQuery()
      .andWhere('entity.user_id = :userId', { userId })
      .orderBy('entity.created_at', 'DESC')
      .getMany();
  }

  /**
   * 分页查询用户流水
   */
  async findByUserIdPaginated(
    userId: string,
    page: number,
    pageSize: number,
    type?: string,
  ) {
    const qb = this.getQuery().andWhere('entity.user_id = :userId', { userId });

    if (type) {
      qb.andWhere('entity.type = :type', { type });
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
   * 创建流水记录
   */
  async createRecord(data: {
    user_id: string;
    invite_order_id?: string;
    amount: number;
    balance_before: number;
    balance_after: number;
    type: 'unlock' | 'withdraw' | 'deduct' | 'refund';
    remark?: string;
  }): Promise<CashbackRecordEntity> {
    const record = this.create(data);
    return this.save(record);
  }
}
