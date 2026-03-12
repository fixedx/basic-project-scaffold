import { Injectable } from '@nestjs/common';
import { DataSource, FindOptionsWhere } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { DemoEntity } from '../entities/demo.entity';
import { UserContextService } from '@/common/services/user-context.service';

@Injectable()
export class DemoRepository extends BaseRepository<DemoEntity> {
  constructor(
    private dataSource: DataSource,
    private userCtx: UserContextService,
  ) {
    super(DemoEntity, dataSource.createEntityManager());
    this.setUserContextService(userCtx);
  }

  /**
   * 根据名称查询（自动过滤已删除）
   * @param name 名称
   */
  async findByName(name: string): Promise<DemoEntity[]> {
    return this.findAllActive({
      where: { name } as FindOptionsWhere<DemoEntity>,
    });
  }

  /**
   * 根据状态查询（自动过滤已删除）
   * @param status 状态
   */
  async findByStatus(status: string): Promise<DemoEntity[]> {
    return this.findAllActive({
      where: { status } as FindOptionsWhere<DemoEntity>,
    });
  }

  /**
   * 根据标签查询（自动过滤已删除）
   * @param tag 标签
   */
  async findByTag(tag: string): Promise<DemoEntity[]> {
    return this.getQuery()
      .andWhere(':tag = ANY(entity.tags)', { tag })
      .getMany();
  }

  /**
   * 根据时间范围查询（自动过滤已删除）
   * @param startTime 开始时间
   * @param endTime 结束时间
   */
  async findByTimeRange(startTime: Date, endTime: Date): Promise<DemoEntity[]> {
    return this.getQuery()
      .andWhere('entity.start_time >= :startTime', { startTime })
      .andWhere('entity.end_time <= :endTime', { endTime })
      .orderBy('entity.start_time', 'ASC')
      .getMany();
  }

  /**
   * 复杂查询示例：查询当前用户的激活数据，按创建时间倒序
   */
  async findMyActiveDemosSortedByDate(): Promise<DemoEntity[]> {
    return this.getQueryWithMyActiveData()
      .orderBy('entity.created_at', 'DESC')
      .getMany();
  }

  /**
   * 使用 JSONB 查询
   * @param configKey 配置键
   * @param configValue 配置值
   */
  async findByConfigValue(
    configKey: string,
    configValue: any,
  ): Promise<DemoEntity[]> {
    return this.getQuery()
      .andWhere(`entity.config->>'${configKey}' = :value`, {
        value: String(configValue),
      })
      .getMany();
  }
}
