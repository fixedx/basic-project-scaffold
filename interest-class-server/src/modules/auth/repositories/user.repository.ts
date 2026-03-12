import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { UserEntity } from '../entities/user.entity';
import { UserContextService } from '@/common/services/user-context.service';

@Injectable()
export class UserRepository extends BaseRepository<UserEntity> {
  constructor(
    private dataSource: DataSource,
    private userCtx: UserContextService,
  ) {
    super(UserEntity, dataSource.createEntityManager());
    this.setUserContextService(userCtx);
  }

  /**
   * 根据 openid 查找用户
   */
  async findByOpenid(openid: string): Promise<UserEntity | null> {
    return this.getQuery()
      .where('entity.openid = :openid', { openid })
      .getOne();
  }

  /**
   * 根据 unionid 查找用户
   */
  async findByUnionid(unionid: string): Promise<UserEntity | null> {
    if (!unionid) return null;
    return this.getQuery()
      .where('entity.unionid = :unionid', { unionid })
      .getOne();
  }

  /**
   * 根据用户名查找用户（机构用户）
   */
  async findByUsername(username: string): Promise<UserEntity | null> {
    if (!username) return null;
    return this.getQuery()
      .andWhere('entity.username = :username', { username })
      .getOne();
  }

  /**
   * 根据手机号查找用户
   */
  async findByPhone(phone: string): Promise<UserEntity | null> {
    if (!phone) return null;
    return this.getQuery()
      .andWhere('entity.phone = :phone', { phone })
      .getOne();
  }

  /**
   * 检查用户名是否已存在
   */
  async checkUsernameExists(
    username: string,
    excludeUserId?: string,
  ): Promise<boolean> {
    const query = this.getQuery().andWhere('entity.username = :username', {
      username,
    });

    if (excludeUserId) {
      query.andWhere('entity.id != :excludeUserId', { excludeUserId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  /**
   * 根据昵称查找用户
   */
  async findByNickname(nickname: string): Promise<UserEntity | null> {
    if (!nickname) return null;
    return this.getQuery()
      .where('entity.nickname = :nickname', { nickname })
      .getOne();
  }

  /**
   * 更新最后登录时间
   */
  async updateLastLogin(userId: string): Promise<void> {
    await this.update(userId, {
      lastLoginAt: new Date(),
    });
  }
}
