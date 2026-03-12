import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ClassroomRepository } from './repositories/classroom.repository';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';
import { QueryClassroomDto } from './dto/query-classroom.dto';
import { UserContextService } from '@/common/services/user-context.service';
import { UserInstitutionRepository } from '@/modules/auth/repositories/user-institution.repository';
import { Transactional } from '@/common/decorators/transaction.decorator';
import { DataSource } from 'typeorm';

@Injectable()
export class ClassroomService {
  constructor(
    private classroomRepository: ClassroomRepository,
    private userInstitutionRepository: UserInstitutionRepository,
    private userContextService: UserContextService,
    private dataSource: DataSource,
  ) {}

  /**
   * 验证机构权限
   */
  private async validateInstitutionAccess(
    institutionId: string,
  ): Promise<void> {
    const userId = this.userContextService.getCurrentUserId();
    const hasAccess = await this.userInstitutionRepository.hasInstitution(
      userId,
      institutionId,
    );

    if (!hasAccess) {
      throw new ForbiddenException('您没有权限操作该机构的教室');
    }
  }

  /**
   * 创建教室
   */
  @Transactional()
  async create(dto: CreateClassroomDto): Promise<string> {
    // 验证权限
    await this.validateInstitutionAccess(dto.institution_id);

    // 检查名称是否重复
    const nameExists = await this.classroomRepository.checkNameExists(
      dto.institution_id,
      dto.name,
    );
    if (nameExists) {
      throw new BadRequestException('该教室名称已存在');
    }

    // 创建教室
    const classroom = this.classroomRepository.create({
      institution_id: dto.institution_id,
      name: dto.name,
      capacity: dto.capacity,
      area: dto.area,
      floor: dto.floor,
      facilities: dto.facilities || [],
      status: dto.status,
      sort_order: dto.sort_order || 0,
      description: dto.description,
    });

    const saved = await this.classroomRepository.save(classroom);
    return saved.id;
  }

  /**
   * 更新教室
   */
  @Transactional()
  async update(id: string, dto: UpdateClassroomDto): Promise<void> {
    const classroom = await this.classroomRepository.findOneById(id);
    if (!classroom) {
      throw new BadRequestException('教室不存在');
    }

    // 验证权限
    await this.validateInstitutionAccess(classroom.institution_id);

    // 如果修改了名称，检查是否重复
    if (dto.name && dto.name !== classroom.name) {
      const nameExists = await this.classroomRepository.checkNameExists(
        classroom.institution_id,
        dto.name,
        id,
      );
      if (nameExists) {
        throw new BadRequestException('该教室名称已存在');
      }
    }

    // 更新教室信息
    Object.assign(classroom, {
      name: dto.name ?? classroom.name,
      capacity: dto.capacity ?? classroom.capacity,
      area: dto.area ?? classroom.area,
      floor: dto.floor ?? classroom.floor,
      facilities: dto.facilities ?? classroom.facilities,
      status: dto.status ?? classroom.status,
      sort_order: dto.sort_order ?? classroom.sort_order,
      description: dto.description ?? classroom.description,
    });

    await this.classroomRepository.save(classroom);
  }

  /**
   * 删除教室（软删除）
   */
  @Transactional()
  async delete(id: string): Promise<void> {
    const classroom = await this.classroomRepository.findOneById(id);
    if (!classroom) {
      throw new BadRequestException('教室不存在');
    }

    // 验证权限
    await this.validateInstitutionAccess(classroom.institution_id);

    // 检查是否有未完成的排课（结束时间在当前时间之后的排课）
    const futureScheduleRows = await this.dataSource.query(
      `SELECT id FROM schedules
       WHERE classroom_id = $1
         AND end_time > NOW()
         AND is_delete = false
       LIMIT 1`,
      [id],
    );
    if (futureScheduleRows.length > 0) {
      throw new BadRequestException('该教室存在未完成的排课，无法删除，请先删除或修改相关排课');
    }

    await this.classroomRepository.softRemoveById(id);
  }

  /**
   * 查询教室列表
   */
  async findAll(query: QueryClassroomDto) {
    const userId = this.userContextService.getCurrentUserId();

    // 验证机构权限
    if (query.institutionId) {
      const hasAccess = await this.userInstitutionRepository.hasInstitution(
        userId,
        query.institutionId,
      );
      if (!hasAccess) {
        throw new ForbiddenException('您没有权限查看该机构的教室');
      }

      // 查询该机构的教室
      const classrooms = await this.classroomRepository.findByInstitutionId(
        query.institutionId,
        query.period,
        query.startDate,
        query.endDate,
      );

      // 按状态筛选
      let filtered = classrooms;
      if (query.status) {
        filtered = classrooms.filter((c) => c.status === query.status);
      }

      // 按关键词筛选
      if (query.keyword) {
        const keyword = query.keyword.toLowerCase();
        filtered = filtered.filter(
          (c) =>
            c.name.toLowerCase().includes(keyword) ||
            c.description?.toLowerCase().includes(keyword),
        );
      }

      // 分页兼容模式：有分页参数就分页，否则返回数组
      if (query.page && query.pageSize) {
        const total = filtered.length;
        const start = (query.page - 1) * query.pageSize;
        const data = filtered.slice(start, start + query.pageSize);
        return {
          data,
          total,
          page: query.page,
          pageSize: query.pageSize,
          totalPages: Math.ceil(total / query.pageSize),
        };
      }

      return filtered;
    }

    return [];
  }

  /**
   * 获取教室详情
   */
  async findOne(id: string) {
    const classroom = await this.classroomRepository.findOneById(id);
    if (!classroom) {
      throw new BadRequestException('教室不存在');
    }

    // 验证权限
    await this.validateInstitutionAccess(classroom.institution_id);

    return classroom;
  }

  /**
   * 批量更新排序
   */
  @Transactional()
  async updateSort(
    items: Array<{ id: string; sort_order: number }>,
  ): Promise<void> {
    for (const item of items) {
      const classroom = await this.classroomRepository.findOneById(item.id);
      if (classroom) {
        await this.validateInstitutionAccess(classroom.institution_id);
        classroom.sort_order = item.sort_order;
        await this.classroomRepository.save(classroom);
      }
    }
  }
}
