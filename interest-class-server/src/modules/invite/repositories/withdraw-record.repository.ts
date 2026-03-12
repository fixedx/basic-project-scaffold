import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { UserContextService } from '@/common/services/user-context.service';
import { WithdrawRecordEntity } from '../entities/withdraw-record.entity';

@Injectable()
export class WithdrawRecordRepository extends BaseRepository<WithdrawRecordEntity> {
  constructor(
    private dataSource: DataSource,
    private userCtx: UserContextService,
  ) {
    super(WithdrawRecordEntity, dataSource.createEntityManager());
    this.setUserContextService(userCtx);
  }

  /**
   * 根据用户ID查询提现记录
   */
  async findByUserId(userId: string): Promise<WithdrawRecordEntity[]> {
    return this.getQuery()
      .andWhere('entity.user_id = :userId', { userId })
      .orderBy('entity.created_at', 'DESC')
      .getMany();
  }

  /**
   * 分页查询用户提现记录
   */
  async findByUserIdPaginated(
    userId: string,
    page: number,
    pageSize: number,
    status?: string,
  ) {
    const qb = this.getQuery().andWhere('entity.user_id = :userId', { userId });

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
   * 查询待审核的提现记录
   */
  async findPendingRecords(): Promise<WithdrawRecordEntity[]> {
    return this.getQuery()
      .andWhere('entity.status = :status', { status: 'pending' })
      .orderBy('entity.created_at', 'ASC')
      .getMany();
  }

  /**
   * 分页查询所有提现记录（管理端）
   */
  async findAllPaginated(page: number, pageSize: number, status?: string) {
    const qb = this.getQuery();

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
}
