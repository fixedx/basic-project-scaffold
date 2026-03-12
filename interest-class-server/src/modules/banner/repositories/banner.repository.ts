import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { BannerEntity } from '../entities/banner.entity';
import { UserContextService } from '@/common/services/user-context.service';

@Injectable()
export class BannerRepository extends BaseRepository<BannerEntity> {
  constructor(
    private dataSource: DataSource,
    private userCtx: UserContextService,
  ) {
    super(BannerEntity, dataSource.createEntityManager());
    this.setUserContextService(userCtx);
  }

  /**
   * 查询所有 Banner 列表（平台级）
   */
  async findAll(status?: string): Promise<BannerEntity[]> {
    const query = this.getQuery()
      .orderBy('entity.sort', 'ASC')
      .addOrderBy('entity.id', 'DESC');

    if (status) {
      query.andWhere('entity.status = :status', { status });
    }

    return query.getMany();
  }

  /**
   * 批量更新排序
   */
  async updateSortBatch(
    sortData: Array<{ id: string; sort: number }>,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const item of sortData) {
        await queryRunner.manager.update(BannerEntity, item.id, {
          sort: item.sort,
        });
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
