import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { InstitutionShowcaseEntity } from '../entities/institution-showcase.entity';
import { UserContextService } from '@/common/services/user-context.service';

@Injectable()
export class InstitutionShowcaseRepository extends BaseRepository<InstitutionShowcaseEntity> {
  constructor(
    private dataSource: DataSource,
    private userCtx: UserContextService,
  ) {
    super(InstitutionShowcaseEntity, dataSource.createEntityManager());
    this.setUserContextService(userCtx);
  }

  /**
   * 根据机构ID查询风采列表
   */
  async findByInstitutionId(
    institutionId: string,
  ): Promise<InstitutionShowcaseEntity[]> {
    return this.getQuery()
      .where('entity.institution_id = :institutionId', { institutionId })
      .orderBy('entity.sort_order', 'ASC')
      .addOrderBy('entity.created_at', 'DESC')
      .getMany();
  }

  /**
   * 删除机构的所有风采
   */
  async deleteByInstitutionId(institutionId: string): Promise<void> {
    await this.createQueryBuilder()
      .delete()
      .from('institution_showcases')
      .where('institution_id = :institutionId', { institutionId })
      .execute();
  }
}
