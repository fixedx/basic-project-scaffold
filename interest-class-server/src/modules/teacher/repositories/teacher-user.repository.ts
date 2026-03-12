import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { TeacherUserEntity } from '../entities/teacher-user.entity';
import { UserContextService } from '@/common/services/user-context.service';

@Injectable()
export class TeacherUserRepository extends BaseRepository<TeacherUserEntity> {
  constructor(
    private dataSource: DataSource,
    private userCtx: UserContextService,
  ) {
    super(TeacherUserEntity, dataSource.createEntityManager());
    this.setUserContextService(userCtx);
  }

  /**
   * 根据用户ID查找教师关联
   */
  async findByUserId(userId: string): Promise<TeacherUserEntity[]> {
    return this.getQuery()
      .andWhere('entity.user_id = :userId', { userId })
      .getMany();
  }

  /**
   * 根据教师ID查找关联
   */
  async findByTeacherId(teacherId: string): Promise<TeacherUserEntity | null> {
    return this.getQuery()
      .andWhere('entity.teacher_id = :teacherId', { teacherId })
      .getOne();
  }

  /**
   * 检查用户是否是某教师
   */
  async isTeacher(
    userId: string,
    teacherId: string,
  ): Promise<boolean> {
    const count = await this.getQuery()
      .andWhere('entity.user_id = :userId', { userId })
      .andWhere('entity.teacher_id = :teacherId', { teacherId })
      .getCount();
    return count > 0;
  }

  /**
   * 添加教师用户关联
   */
  async addTeacherUser(
    userId: string,
    teacherId: string,
    institutionId: string,
  ): Promise<TeacherUserEntity> {
    const entity = this.create({
      user_id: userId,
      teacher_id: teacherId,
      institution_id: institutionId,
      role: 'teacher',
    });
    return this.save(entity);
  }

  /**
   * 获取用户关联的教师列表（返回教师ID）
   */
  async findTeachersByUserId(
    userId: string,
  ): Promise<Array<{ teacher_id: string; institution_id: string }>> {
    const relations = await this.getQuery()
      .andWhere('entity.user_id = :userId', { userId })
      .getMany();

    return relations.map((r) => ({
      teacher_id: r.teacher_id,
      institution_id: r.institution_id,
    }));
  }
}
