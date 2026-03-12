import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { InstitutionHonorEntity } from '../entities/institution-honor.entity';
import { UserContextService } from '@/common/services/user-context.service';

@Injectable()
export class InstitutionHonorRepository extends BaseRepository<InstitutionHonorEntity> {
  constructor(
    private dataSource: DataSource,
    private userCtx: UserContextService,
  ) {
    super(InstitutionHonorEntity, dataSource.createEntityManager());
    this.setUserContextService(userCtx);
  }

  /**
   * 根据机构ID查询荣誉列表
   */
  async findByInstitutionId(
    institutionId: string,
  ): Promise<InstitutionHonorEntity[]> {
    return this.getQuery()
      .where('entity.institution_id = :institutionId', { institutionId })
      .orderBy('entity.sort_order', 'ASC')
      .addOrderBy('entity.honor_date', 'DESC')
      .getMany();
  }

  /**
   * 删除机构的所有荣誉
   */
  async deleteByInstitutionId(institutionId: string): Promise<void> {
    await this.createQueryBuilder()
      .delete()
      .from('institution_honors')
      .where('institution_id = :institutionId', { institutionId })
      .execute();
  }
}
