import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { InstitutionTeachingEnvEntity } from '../entities/institution-teaching-env.entity';
import { UserContextService } from '@/common/services/user-context.service';

@Injectable()
export class InstitutionTeachingEnvRepository extends BaseRepository<InstitutionTeachingEnvEntity> {
  constructor(
    private dataSource: DataSource,
    private userCtx: UserContextService,
  ) {
    super(InstitutionTeachingEnvEntity, dataSource.createEntityManager());
    this.setUserContextService(userCtx);
  }

  /**
   * 根据机构ID查询教学环境列表
   */
  async findByInstitutionId(
    institutionId: string,
  ): Promise<InstitutionTeachingEnvEntity[]> {
    return this.getQuery()
      .where('entity.institution_id = :institutionId', { institutionId })
      .orderBy('entity.sort_order', 'ASC')
      .addOrderBy('entity.created_at', 'DESC')
      .getMany();
  }

  /**
   * 删除机构的所有教学环境
   */
  async deleteByInstitutionId(institutionId: string): Promise<void> {
    await this.createQueryBuilder()
      .delete()
      .from('institution_teaching_environments')
      .where('institution_id = :institutionId', { institutionId })
      .execute();
  }
}
