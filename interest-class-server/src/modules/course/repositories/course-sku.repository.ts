import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { CourseSkuEntity } from '../entities/course-sku.entity';
import { UserContextService } from '@/common/services/user-context.service';

@Injectable()
export class CourseSkuRepository extends BaseRepository<CourseSkuEntity> {
  constructor(
    private dataSource: DataSource,
    private userCtx: UserContextService,
  ) {
    super(CourseSkuEntity, dataSource.createEntityManager());
    this.setUserContextService(userCtx);
  }

  /**
   * 根据课程ID查询所有SKU
   */
  async findByCourseId(courseId: string) {
    return this.getQuery()
      .where('entity.course_id = :courseId', { courseId })
      .getMany();
  }

  /**
   * 批量软删除课程的所有SKU
   */
  async softDeleteByCourseId(courseId: string) {
    await this.dataSource
      .createQueryBuilder()
      .update(CourseSkuEntity)
      .set({ is_delete: true })
      .where('course_id = :courseId', { courseId })
      .execute();
  }
}
