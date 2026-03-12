import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { CategoryEntity } from '../entities/category.entity';
import { UserContextService } from '@/common/services/user-context.service';

@Injectable()
export class CategoryRepository extends BaseRepository<CategoryEntity> {
  constructor(
    private dataSource: DataSource,
    private userCtx: UserContextService,
  ) {
    super(CategoryEntity, dataSource.createEntityManager());
    this.setUserContextService(userCtx);
  }

  /**
   * 获取所有一级类目
   */
  async findTopLevel(): Promise<CategoryEntity[]> {
    return this.getQueryWithActive()
      .where('entity.parent_id IS NULL')
      .orderBy('entity.sort_order', 'DESC')
      .addOrderBy('entity.created_at', 'DESC')
      .getMany();
  }

  /**
   * 获取指定父类目的所有子类目
   */
  async findByParentId(parentId: string): Promise<CategoryEntity[]> {
    return this.getQueryWithActive()
      .where('entity.parent_id = :parentId', { parentId })
      .orderBy('entity.sort_order', 'DESC')
      .addOrderBy('entity.created_at', 'DESC')
      .getMany();
  }

  /**
   * 获取所有类目（树形结构）
   */
  async findAllTree(): Promise<CategoryEntity[]> {
    return this.getQueryWithActive()
      .orderBy('entity.sort_order', 'DESC')
      .addOrderBy('entity.created_at', 'DESC')
      .getMany();
  }
}
