import {
  Repository,
  FindOptionsWhere,
  FindManyOptions,
  FindOneOptions,
  SelectQueryBuilder,
  DeepPartial,
  SaveOptions,
  RemoveOptions,
} from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { UserContextService } from '@/common/services/user-context.service';

/**
 * 基础 Repository
 * 提供常用的查询方法，自动处理软删除和其他通用逻辑
 */
export class BaseRepository<T extends BaseEntity> extends Repository<T> {
  protected userContextService: UserContextService;

  /**
   * 设置 UserContextService 实例
   * 在子类构造函数中调用
   */
  setUserContextService(userContextService: UserContextService) {
    this.userContextService = userContextService;
  }
  /**
   * 获取查询构建器（自动过滤已删除数据）
   * @param alias 表别名，默认为 'entity'
   * @returns QueryBuilder
   */
  getQuery(alias: string = 'entity'): SelectQueryBuilder<T> {
    return this.createQueryBuilder(alias).where(
      `${alias}.is_delete = :isDelete`,
      { isDelete: false },
    );
  }

  /**
   * 获取查询构建器（过滤已删除 + 只查询激活的数据）
   * @param alias 表别名，默认为 'entity'
   * @returns QueryBuilder
   */
  getQueryWithActive(alias: string = 'entity'): SelectQueryBuilder<T> {
    return this.getQuery(alias).andWhere(`${alias}.is_active = :isActive`, {
      isActive: true,
    });
  }

  /**
   * 获取查询构建器（过滤已删除 + 只查询当前用户创建的数据）
   * @param alias 表别名，默认为 'entity'
   * @returns QueryBuilder
   */
  getQueryWithMyData(alias: string = 'entity'): SelectQueryBuilder<T> {
    const userId = this.userContextService.getCurrentUserId();
    return this.getQuery(alias).andWhere(`${alias}.created_by = :userId`, {
      userId,
    });
  }

  /**
   * 获取查询构建器（过滤已删除 + 只查询当前用户创建的 + 激活的数据）
   * @param alias 表别名，默认为 'entity'
   * @returns QueryBuilder
   */
  getQueryWithMyActiveData(alias: string = 'entity'): SelectQueryBuilder<T> {
    return this.getQueryWithMyData(alias).andWhere(
      `${alias}.is_active = :isActive`,
      { isActive: true },
    );
  }

  /**
   * 保存实体（重写以自动填充 created_by 和 updated_by）
   * @param entity 实体数组
   * @param options 保存选项
   */
  async save<U extends DeepPartial<T>>(
    entity: U[],
    options?: SaveOptions,
  ): Promise<T[]>;

  /**
   * 保存实体（重写以自动填充 created_by 和 updated_by）
   * @param entity 单个实体
   * @param options 保存选项
   */
  async save<U extends DeepPartial<T>>(
    entity: U,
    options?: SaveOptions,
  ): Promise<T>;

  /**
   * 保存实体（实现）
   */
  async save<U extends DeepPartial<T>>(
    entity: U | U[],
    options?: SaveOptions,
  ): Promise<T | T[]> {
    const userId = this.userContextService?.getCurrentUserIdOrNull();

    if (Array.isArray(entity)) {
      entity.forEach((e: any) => {
        // 新建时设置 created_by
        if (!e.id && userId) {
          e.created_by = userId;
        }
        // 更新时设置 updated_by
        if (userId) {
          e.updated_by = userId;
        }
      });
      return super.save(entity as any, options) as Promise<T[]>;
    } else {
      const e = entity as any;
      // 新建时设置 created_by
      if (!e.id && userId) {
        e.created_by = userId;
      }
      // 更新时设置 updated_by
      if (userId) {
        e.updated_by = userId;
      }
      return super.save(entity as any, options) as Promise<T>;
    }
  }

  /**
   * 查询所有（自动过滤已删除，默认按ID降序）
   * @param options 查询选项
   */
  async findAllActive(options?: FindManyOptions<T>): Promise<T[]> {
    return this.find({
      ...options,
      order: options?.order || ({ id: 'DESC' } as any),
      where: {
        ...(options?.where || {}),
        is_delete: false,
      } as FindOptionsWhere<T>,
    });
  }

  /**
   * 查询所有激活的数据（is_delete = false AND is_active = true，默认按ID降序）
   * @param options 查询选项
   */
  async findAllActiveAndEnabled(options?: FindManyOptions<T>): Promise<T[]> {
    return this.find({
      ...options,
      order: options?.order || ({ id: 'DESC' } as any),
      where: {
        ...(options?.where || {}),
        is_delete: false,
        is_active: true,
      } as FindOptionsWhere<T>,
    });
  }

  /**
   * 根据ID查询（自动过滤已删除）
   * @param id 主键ID
   * @param options 查询选项
   */
  async findOneById(
    id: string,
    options?: FindOneOptions<T>,
  ): Promise<T | null> {
    return this.findOne({
      ...options,
      where: {
        ...(options?.where || {}),
        id,
        is_delete: false,
      } as FindOptionsWhere<T>,
    });
  }

  /**
   * 根据ID查询并确保存在（自动过滤已删除）
   * @param id 主键ID
   * @param options 查询选项
   * @throws NotFoundException 如果找不到
   */
  async findOneByIdOrFail(id: string, options?: FindOneOptions<T>): Promise<T> {
    const entity = await this.findOneById(id, options);
    if (!entity) {
      throw new Error(`${this.metadata.name} #${id} not found`);
    }
    return entity;
  }

  /**
   * 查询当前用户创建的所有数据（自动过滤已删除，默认按ID降序）
   * @param options 查询选项
   */
  async findMyData(options?: FindManyOptions<T>): Promise<T[]> {
    const userId = this.userContextService.getCurrentUserId();
    return this.find({
      ...options,
      order: options?.order || ({ id: 'DESC' } as any),
      where: {
        ...(options?.where || {}),
        created_by: userId,
        is_delete: false,
      } as FindOptionsWhere<T>,
    });
  }

  /**
   * 软删除实体
   * @param entity 实体或实体数组
   * @param options 保存选项
   */
  async softRemoveEntity(
    entity: T | T[],
    options?: SaveOptions,
  ): Promise<T | T[]> {
    if (Array.isArray(entity)) {
      entity.forEach((e) => (e.is_delete = true));
      return this.save(entity as DeepPartial<T>[], options);
    } else {
      entity.is_delete = true;
      return this.save(entity, options);
    }
  }

  /**
   * 软删除（根据ID）
   * @param id 主键ID
   */
  async softRemoveById(id: string): Promise<boolean> {
    const entity = await this.findOneByIdOrFail(id);
    await this.softRemoveEntity(entity);
    return true;
  }

  /**
   * 恢复软删除的数据
   * @param entity 实体或实体数组
   * @param options 保存选项
   */
  async restoreEntity(
    entity: T | T[],
    options?: SaveOptions,
  ): Promise<T | T[]> {
    if (Array.isArray(entity)) {
      entity.forEach((e) => (e.is_delete = false));
      return this.save(entity as DeepPartial<T>[], options);
    } else {
      entity.is_delete = false;
      return this.save(entity, options);
    }
  }

  /**
   * 恢复软删除的数据（根据ID）
   * @param id 主键ID
   */
  async restoreById(id: string): Promise<boolean> {
    // 查询时包含已删除的数据
    const entity = await this.findOne({
      where: { id } as FindOptionsWhere<T>,
    });

    if (!entity) {
      throw new Error(`${this.metadata.name} #${id} not found`);
    }

    await this.restoreEntity(entity);
    return true;
  }

  /**
   * 统计数量（自动过滤已删除）
   * @param options 查询选项
   */
  async countActive(options?: FindManyOptions<T>): Promise<number> {
    return this.count({
      ...options,
      where: {
        ...(options?.where || {}),
        is_delete: false,
      } as FindOptionsWhere<T>,
    });
  }

  /**
   * 检查是否存在（自动过滤已删除）
   * @param options 查询选项
   */
  async existsActive(options?: FindManyOptions<T>): Promise<boolean> {
    const count = await this.countActive(options);
    return count > 0;
  }

  /**
   * 分页查询（自动过滤已删除，默认按ID降序）
   * @param page 页码（从1开始）
   * @param pageSize 每页数量
   * @param options 查询选项
   */
  async paginate(
    page: number = 1,
    pageSize: number = 10,
    options?: FindManyOptions<T>,
  ): Promise<{
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * pageSize;

    const [data, total] = await this.findAndCount({
      ...options,
      order: options?.order || ({ id: 'DESC' } as any),
      where: {
        ...(options?.where || {}),
        is_delete: false,
      } as FindOptionsWhere<T>,
      skip,
      take: pageSize,
    });

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 批量创建（使用事务）
   * @param entities 实体数据数组
   * @param options 保存选项
   */
  async createMany(
    entities: DeepPartial<T>[],
    options?: SaveOptions,
  ): Promise<T[]> {
    const created = this.create(entities);
    return this.save(created as DeepPartial<T>[], options);
  }

  /**
   * 批量更新
   * @param entities 实体数组
   * @param options 保存选项
   */
  async updateMany(entities: T[], options?: SaveOptions): Promise<T[]> {
    return this.save(entities, options);
  }

  /**
   * 批量软删除
   * @param ids ID数组
   */
  async softRemoveByIds(ids: string[]): Promise<boolean> {
    const entities = await this.find({
      where: ids.map((id) => ({ id, is_delete: false }) as FindOptionsWhere<T>),
    });

    if (entities.length > 0) {
      await this.softRemoveEntity(entities);
    }

    return true;
  }

  /**
   * 物理删除多个
   * @param entities 实体数组
   * @param options 删除选项
   */
  async hardRemoveMany(entities: T[], options?: RemoveOptions): Promise<T[]> {
    return this.remove(entities, options);
  }

  /**
   * 对 QueryBuilder 应用时间段过滤
   * @param qb QueryBuilder 实例
   * @param period 时间段类型：thisMonth, threeMonths, halfYear, oneYear, custom, all
   * @param startDate 自定义开始日期（period='custom' 时使用）
   * @param endDate 自定义结束日期（period='custom' 时使用）
   * @param alias 实体别名，默认 'entity'
   */
  protected applyPeriodFilter(
    qb: SelectQueryBuilder<T>,
    period?: string,
    startDate?: string,
    endDate?: string,
    alias: string = 'entity',
  ): void {
    const hasPeriodFilter = !!period && period !== 'all';
    if (!hasPeriodFilter) return;

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
      qb.andWhere(`${alias}.created_at >= :periodStart`, { periodStart });
    }
    if (periodEnd) {
      qb.andWhere(`${alias}.created_at <= :periodEnd`, { periodEnd });
    }
  }
}
