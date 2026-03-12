import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { ClassroomEntity } from '../entities/classroom.entity';
import { UserContextService } from '@/common/services/user-context.service';

@Injectable()
export class ClassroomRepository extends BaseRepository<ClassroomEntity> {
  constructor(
    private dataSource: DataSource,
    private userCtx: UserContextService,
  ) {
    super(ClassroomEntity, dataSource.createEntityManager());
    this.setUserContextService(userCtx);
  }

  /**
   * 根据机构ID查询教室列表
   */
  async findByInstitutionId(
    institutionId: string,
    period?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const qb = this.getQueryWithActive()
      .andWhere('entity.institution_id = :institutionId', { institutionId });

    // 时间过滤
    this.applyPeriodFilter(qb, period, startDate, endDate);

    return qb
      .orderBy('entity.sort_order', 'DESC')
      .addOrderBy('entity.created_at', 'DESC')
      .getMany();
  }

  /**
   * 检查教室名称是否重复
   */
  async checkNameExists(
    institutionId: string,
    name: string,
    excludeId?: string,
  ): Promise<boolean> {
    const query = this.getQueryWithActive()
      .where('entity.institution_id = :institutionId', { institutionId })
      .andWhere('entity.name = :name', { name });

    if (excludeId) {
      query.andWhere('entity.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }
}
