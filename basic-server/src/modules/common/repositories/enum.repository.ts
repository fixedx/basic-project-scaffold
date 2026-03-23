import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { EnumEntity } from '../entities/enum.entity';
import { UserContextService } from '@/common/services/user-context.service';

@Injectable()
export class EnumRepository extends BaseRepository<EnumEntity> {
  constructor(
    private dataSource: DataSource,
    private userCtx: UserContextService,
  ) {
    super(EnumEntity, dataSource.createEntityManager());
    this.setUserContextService(userCtx);
  }

  /**
   * 根据类型查询枚举列表
   */
  async findByType(type: string): Promise<EnumEntity[]> {
    return this.getQueryWithActive()
      .where('entity.type = :type', { type })
      .orderBy('entity.sort_order', 'DESC')
      .addOrderBy('entity.created_at', 'ASC')
      .getMany();
  }

  /**
   * 根据类型和代码查询单个枚举
   */
  async findByTypeAndCode(
    type: string,
    code: string,
  ): Promise<EnumEntity | null> {
    return this.getQueryWithActive()
      .where('entity.type = :type', { type })
      .andWhere('entity.code = :code', { code })
      .getOne();
  }

  /**
   * 批量查询多种类型的枚举
   */
  async findByTypes(types: string[]): Promise<Record<string, EnumEntity[]>> {
    const result: Record<string, EnumEntity[]> = {};

    for (const type of types) {
      result[type] = await this.findByType(type);
    }

    return result;
  }

  /**
   * 获取所有枚举类型
   */
  async getAllTypes(): Promise<string[]> {
    const result = await this.getQueryWithActive()
      .select('DISTINCT entity.type', 'type')
      .getRawMany();

    return result.map((r) => r.type);
  }
}
