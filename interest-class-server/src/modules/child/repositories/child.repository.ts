import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { UserContextService } from '@/common/services/user-context.service';
import { ChildEntity } from '../entities/child.entity';

@Injectable()
export class ChildRepository extends BaseRepository<ChildEntity> {
  constructor(
    private dataSource: DataSource,
    private userCtx: UserContextService,
  ) {
    super(ChildEntity, dataSource.createEntityManager());
    this.setUserContextService(userCtx);
  }

  /**
   * 根据用户ID查询所有宝贝
   */
  async findByUserId(userId: string): Promise<ChildEntity[]> {
    return this.getQuery()
      .andWhere('entity.user_id = :userId', { userId })
      .orderBy('entity.sort_order', 'ASC')
      .addOrderBy('entity.created_at', 'DESC')
      .getMany();
  }

  /**
   * 根据用户ID和宝贝ID查询
   */
  async findByUserIdAndId(
    userId: string,
    childId: string,
  ): Promise<ChildEntity | null> {
    return this.getQuery()
      .andWhere('entity.user_id = :userId', { userId })
      .andWhere('entity.id = :childId', { childId })
      .getOne();
  }

  /**
   * 统计用户的宝贝数量
   */
  async countByUserId(userId: string): Promise<number> {
    return this.getQuery()
      .andWhere('entity.user_id = :userId', { userId })
      .getCount();
  }
}
