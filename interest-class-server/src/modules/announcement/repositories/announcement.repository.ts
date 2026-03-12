import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { AnnouncementEntity } from '../entities/announcement.entity';
import { UserContextService } from '@/common/services/user-context.service';

@Injectable()
export class AnnouncementRepository extends BaseRepository<AnnouncementEntity> {
  constructor(
    private dataSource: DataSource,
    private userCtx: UserContextService,
  ) {
    super(AnnouncementEntity, dataSource.createEntityManager());
    this.setUserContextService(userCtx);
  }

  /**
   * 查询所有公告列表
   */
  async findAll(status?: string, type?: string): Promise<AnnouncementEntity[]> {
    const query = this.getQuery()
      .orderBy('entity.priority', 'DESC')
      .addOrderBy('entity.created_at', 'DESC');

    if (status) {
      query.andWhere('entity.status = :status', { status });
    }
    if (type) {
      query.andWhere('entity.type = :type', { type });
    }

    return query.getMany();
  }

  /**
   * 查询当前生效的公告（首页展示用）
   */
  async findActiveAnnouncements(): Promise<AnnouncementEntity[]> {
    const now = new Date();
    return this.getQuery()
      .andWhere('entity.status = :status', { status: 'active' })
      .andWhere(
        '(entity.start_time IS NULL OR entity.start_time <= :now)',
        { now },
      )
      .andWhere(
        '(entity.end_time IS NULL OR entity.end_time >= :now)',
        { now },
      )
      .orderBy('entity.priority', 'DESC')
      .addOrderBy('entity.created_at', 'DESC')
      .getMany();
  }
}
