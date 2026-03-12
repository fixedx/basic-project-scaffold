import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { InstitutionAccountEntity } from '../entities/institution-account.entity';
import { UserContextService } from '@/common/services/user-context.service';

@Injectable()
export class InstitutionAccountRepository extends BaseRepository<InstitutionAccountEntity> {
  constructor(
    private dataSource: DataSource,
    private userCtx: UserContextService,
  ) {
    super(InstitutionAccountEntity, dataSource.createEntityManager());
    this.setUserContextService(userCtx);
  }

  /**
   * 根据机构ID查询账号列表
   */
  async findByInstitutionId(
    institutionId: string,
  ): Promise<InstitutionAccountEntity[]> {
    return this.getQuery()
      .where('entity.institution_id = :institutionId', { institutionId })
      .getMany();
  }

  /**
   * 根据用户名查询账号
   */
  async findByUsername(
    username: string,
  ): Promise<InstitutionAccountEntity | null> {
    return this.getQuery()
      .where('entity.username = :username', { username })
      .getOne();
  }

  /**
   * 检查用户名是否已存在
   */
  async existsByUsername(
    username: string,
    excludeId?: string,
  ): Promise<boolean> {
    let query = this.getQuery().andWhere('entity.username = :username', {
      username,
    });

    if (excludeId) {
      query = query.andWhere('entity.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }
}
