import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { UserInstitutionEntity } from '../entities/user-institution.entity';
import { UserContextService } from '@/common/services/user-context.service';

@Injectable()
export class UserInstitutionRepository extends BaseRepository<UserInstitutionEntity> {
  constructor(
    private dataSource: DataSource,
    private userCtx: UserContextService,
  ) {
    super(UserInstitutionEntity, dataSource.createEntityManager());
    this.setUserContextService(userCtx);
  }

  /**
   * 获取用户的所有机构
   */
  async findByUserId(userId: string): Promise<UserInstitutionEntity[]> {
    return this.getQuery()
      .where('entity.user_id = :userId', { userId })
      .orderBy('entity.created_at', 'DESC')
      .getMany();
  }

  /**
   * 检查用户是否拥有某个机构
   */
  async hasInstitution(
    userId: string,
    institutionId: string,
  ): Promise<boolean> {
    const count = await this.createQueryBuilder('user_institution')
      .where('user_institution.user_id = :userId', { userId })
      .andWhere('user_institution.institution_id = :institutionId', {
        institutionId,
      })
      .andWhere('user_institution.is_delete = :isDelete', { isDelete: false })
      .getCount();
    return count > 0;
  }

  /**
   * 添加用户-机构关联
   */
  async addUserInstitution(
    userId: string,
    institutionId: string,
    role = 'owner',
  ): Promise<UserInstitutionEntity> {
    const entity = this.create({
      user_id: userId,
      institution_id: institutionId,
      role,
    });
    return this.save(entity);
  }

  /**
   * 获取用户关联的机构列表（返回机构ID）
   */
  async findInstitutionsByUserId(
    userId: string,
  ): Promise<Array<{ institution_id: string; role: string }>> {
    const relations = await this.getQuery()
      .where('entity.user_id = :userId', { userId })
      .orderBy('entity.created_at', 'DESC')
      .getMany();

    return relations.map((r) => ({
      institution_id: r.institution_id,
      role: r.role,
    }));
  }

  /**
   * 获取用户在某机构的角色
   * @returns 角色字符串（owner/admin/staff），如果不存在返回空字符串
   */
  async getUserRole(userId: string, institutionId: string): Promise<string> {
    const relation = await this.getQuery()
      .andWhere('entity.user_id = :userId', { userId })
      .andWhere('entity.institution_id = :institutionId', { institutionId })
      .getOne();
    
    return relation?.role || '';
  }
}
