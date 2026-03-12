import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { BookingEntity } from '../entities/booking.entity';
import { UserContextService } from '@/common/services/user-context.service';

@Injectable()
export class BookingRepository extends BaseRepository<BookingEntity> {
  constructor(
    private dataSource: DataSource,
    private userCtx: UserContextService,
  ) {
    super(BookingEntity, dataSource.createEntityManager());
    this.setUserContextService(userCtx);
  }

  /**
   * 根据用户ID查询预约列表
   */
  async findByUserId(userId: string, page = 1, pageSize = 10) {
    const skip = (page - 1) * pageSize;
    const [data, total] = await this.getQuery()
      .where('entity.user_id = :userId', { userId })
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 根据机构ID查询预约列表
   */
  async findByInstitutionId(institutionId: string, page = 1, pageSize = 10) {
    const skip = (page - 1) * pageSize;
    const [data, total] = await this.getQuery()
      .where('entity.institution_id = :institutionId', { institutionId })
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 根据课程ID查询预约列表
   */
  async findByCourseId(courseId: string, page = 1, pageSize = 10) {
    const skip = (page - 1) * pageSize;
    const [data, total] = await this.getQuery()
      .where('entity.course_id = :courseId', { courseId })
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 根据状态查询预约列表
   */
  async findByStatus(
    status: string,
    institutionId?: string,
    page = 1,
    pageSize = 10,
  ) {
    const queryBuilder = this.getQuery().andWhere('entity.status = :status', {
      status,
    });

    if (institutionId) {
      queryBuilder.andWhere('entity.institution_id = :institutionId', {
        institutionId,
      });
    }

    const skip = (page - 1) * pageSize;
    const [data, total] = await queryBuilder
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 更新预约状态
   * @param id 预约ID
   * @param status 新状态
   */
  async updateStatus(
    id: string,
    status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed',
  ): Promise<void> {
    const updateData: any = { status };
    
    if (status === 'confirmed') {
      updateData.confirmed_at = new Date();
    }

    await this.createQueryBuilder()
      .update(BookingEntity)
      .set(updateData)
      .where('id = :id', { id })
      .andWhere('is_delete = :isDelete', { isDelete: false })
      .execute();
  }
}
