import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { FeedbackEntity } from '../entities/feedback.entity';
import { UserContextService } from '@/common/services/user-context.service';

@Injectable()
export class FeedbackRepository extends BaseRepository<FeedbackEntity> {
  constructor(
    private dataSource: DataSource,
    private userCtx: UserContextService,
  ) {
    super(FeedbackEntity, dataSource.createEntityManager());
    this.setUserContextService(userCtx);
  }

  /**
   * 查询我的反馈列表
   */
  async findMyFeedbacks(userId: string): Promise<FeedbackEntity[]> {
    return this.getQuery()
      .andWhere('entity.created_by = :userId', { userId })
      .orderBy('entity.created_at', 'DESC')
      .getMany();
  }

  /**
   * 分页查询所有反馈（管理员用）
   */
  async findAllPaginated(
    page: number,
    pageSize: number,
    filters?: { status?: string; type?: string },
  ) {
    const qb = this.getQuery().orderBy('entity.created_at', 'DESC');

    if (filters?.status) {
      qb.andWhere('entity.status = :status', { status: filters.status });
    }
    if (filters?.type) {
      qb.andWhere('entity.type = :type', { type: filters.type });
    }

    const skip = (page - 1) * pageSize;
    const [data, total] = await qb.skip(skip).take(pageSize).getManyAndCount();

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 统计各状态数量
   */
  async countByStatus(): Promise<Record<string, number>> {
    const result = await this.getQuery()
      .select('entity.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('entity.status')
      .getRawMany();

    const counts: Record<string, number> = {
      pending: 0,
      processing: 0,
      resolved: 0,
      closed: 0,
      total: 0,
    };

    for (const row of result) {
      counts[row.status] = parseInt(row.count, 10);
      counts.total += parseInt(row.count, 10);
    }

    return counts;
  }
}
