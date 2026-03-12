import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { ScheduleEntity } from '../entities/schedule.entity';
import { UserContextService } from '@/common/services/user-context.service';

@Injectable()
export class ScheduleRepository extends BaseRepository<ScheduleEntity> {
  constructor(
    private dataSource: DataSource,
    private userCtx: UserContextService,
  ) {
    super(ScheduleEntity, dataSource.createEntityManager());
    this.setUserContextService(userCtx);
  }

  /**
   * 查询指定机构的排课列表
   */
  async findByInstitution(institutionId: string) {
    return this.getQuery()
      .andWhere('entity.institution_id = :institutionId', { institutionId })
      .getMany();
  }

  /**
   * 检查教师在指定时间是否有冲突
   */
  async checkTeacherConflict(
    teacherId: string,
    startTime: Date,
    endTime: Date,
    excludeId?: string,
  ): Promise<boolean> {
    const query = this.getQuery()
      .andWhere('entity.teacher_id = :teacherId', { teacherId })
      .andWhere(
        '(entity.start_time < :endTime AND entity.end_time > :startTime)',
        { startTime, endTime },
      );

    if (excludeId) {
      query.andWhere('entity.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  /**
   * 检查教室在指定时间是否有冲突
   */
  async checkClassroomConflict(
    classroomId: string,
    startTime: Date,
    endTime: Date,
    excludeId?: string,
  ): Promise<boolean> {
    const query = this.getQuery()
      .andWhere('entity.classroom_id = :classroomId', { classroomId })
      .andWhere(
        '(entity.start_time < :endTime AND entity.end_time > :startTime)',
        { startTime, endTime },
      );

    if (excludeId) {
      query.andWhere('entity.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  /**
   * 查询指定课程的排课列表（全部）
   */
  async findByCourse(courseId: string) {
    return this.getQuery()
      .andWhere('entity.course_id = :courseId', { courseId })
      .getMany();
  }

  /**
   * 查询指定课程的排课模板列表（去重）
   * 按 (day_of_week, 时间段, teacher_id, classroom_id) 去重，
   * 只返回每个唯一时间模式的最早一条记录。
   * 用于预约表单展示可选时段。
   */
  async findTemplateByCourse(courseId: string) {
    // 使用 PostgreSQL DISTINCT ON 按模板模式去重
    const rows = await this.dataSource.query(
      `SELECT DISTINCT ON (
        day_of_week,
        start_time::time,
        end_time::time,
        teacher_id,
        classroom_id
      ) *
      FROM schedules
      WHERE course_id = $1
        AND is_delete = false
        AND status = 'scheduled'
      ORDER BY
        day_of_week,
        start_time::time,
        end_time::time,
        teacher_id,
        classroom_id,
        created_at ASC`,
      [courseId],
    );
    return rows;
  }
}
