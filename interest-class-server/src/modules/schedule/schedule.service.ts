import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ScheduleRepository } from './repositories/schedule.repository';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { QueryScheduleDto } from './dto/query-schedule.dto';
import { BatchCreateScheduleDto } from './dto/batch-create-schedule.dto';
import { Transactional } from '@/common/decorators/transaction.decorator';
import { UserContextService } from '@/common/services/user-context.service';
import { UserInstitutionRepository } from '@/modules/auth/repositories/user-institution.repository';
import { CourseRepository } from '@/modules/course/repositories/course.repository';
import { TeacherRepository } from '@/modules/teacher/repositories/teacher.repository';
import { ClassroomRepository } from '@/modules/classroom/repositories/classroom.repository';

@Injectable()
export class ScheduleService {
  constructor(
    private scheduleRepository: ScheduleRepository,
    private userInstitutionRepository: UserInstitutionRepository,
    private userContextService: UserContextService,
    private dataSource: DataSource,
    private courseRepository: CourseRepository,
    private teacherRepository: TeacherRepository,
    private classroomRepository: ClassroomRepository,
  ) {}

  /**
   * 创建排课
   */
  @Transactional()
  async create(dto: CreateScheduleDto): Promise<string> {
    // 获取当前用户的机构ID（通过 user_institutions 表）
    const userId = this.userContextService.getCurrentUserId();
    const userInstitutions =
      await this.userInstitutionRepository.findByUserId(userId);
    
    if (!userInstitutions || userInstitutions.length === 0) {
      throw new BadRequestException('未找到关联的机构');
    }
    
    // 获取第一个机构（用户可能关联多个机构，这里简化处理）
    const institutionId = userInstitutions[0].institution_id;

    // 验证时间
    const startTime = new Date(dto.start_time);
    const endTime = new Date(dto.end_time);
    if (startTime >= endTime) {
      throw new BadRequestException('开始时间必须早于结束时间');
    }

    // 验证教室状态（只有 available 状态的教室才可以排课）
    const classroom = await this.classroomRepository.findOneById(dto.classroom_id);
    if (!classroom) {
      throw new BadRequestException('教室不存在');
    }
    if (classroom.status === 'maintenance') {
      throw new BadRequestException('该教室正在维护中，暂时无法安排课程');
    }
    if (classroom.status === 'disabled') {
      throw new BadRequestException('该教室已停用，无法安排课程');
    }

    // 验证教师状态（只有 active 状态的教师才可以排课）
    const teacher = await this.teacherRepository.findOneById(dto.teacher_id);
    if (!teacher) {
      throw new BadRequestException('教师不存在');
    }
    if (teacher.status === 'on_leave') {
      throw new BadRequestException('该教师正在休假中，暂时无法安排课程');
    }
    if (teacher.status === 'inactive') {
      throw new BadRequestException('该教师已离职，无法安排课程');
    }

    // 检查教师时间冲突
    const teacherConflict = await this.scheduleRepository.checkTeacherConflict(
      dto.teacher_id,
      startTime,
      endTime,
    );
    if (teacherConflict) {
      throw new BadRequestException('该教师在此时间段已有其他排课');
    }

    // 检查教室时间冲突
    const classroomConflict =
      await this.scheduleRepository.checkClassroomConflict(
        dto.classroom_id,
        startTime,
        endTime,
      );
    if (classroomConflict) {
      throw new BadRequestException('该教室在此时间段已被占用');
    }

    // 创建排课
    const schedule = this.scheduleRepository.create({
      ...dto,
      institution_id: institutionId,
      start_time: startTime,
      end_time: endTime,
      booked_count: 0,
    });

    const saved = await this.scheduleRepository.save(schedule);
    return saved.id;
  }

  /**
   * 批量创建排课
   * 根据日期范围和星期几，自动生成多条排课记录
   * 采用"尽量创建"策略：跳过有冲突的日期，创建无冲突的日期
   */
  @Transactional()
  async batchCreate(dto: BatchCreateScheduleDto): Promise<{
    created: number;
    skipped: number;
    total: number;
    conflicts: string[];
  }> {
    // 获取当前用户的机构ID
    const userId = this.userContextService.getCurrentUserId();
    const userInstitutions =
      await this.userInstitutionRepository.findByUserId(userId);

    if (!userInstitutions || userInstitutions.length === 0) {
      throw new BadRequestException('未找到关联的机构');
    }

    const institutionId = userInstitutions[0].institution_id;

    // 验证时间格式
    if (dto.start_time >= dto.end_time) {
      throw new BadRequestException('开始时间必须早于结束时间');
    }

    // 验证日期范围
    const [startYear, startMonth, startDay] = dto.start_date
      .split('-')
      .map(Number);
    const [endYear, endMonth, endDay] = dto.end_date.split('-').map(Number);
    const rangeStart = new Date(startYear, startMonth - 1, startDay);
    const rangeEnd = new Date(endYear, endMonth - 1, endDay);

    if (rangeStart > rangeEnd) {
      throw new BadRequestException('开始日期必须早于结束日期');
    }

    // 限制最长范围 365 天
    const diffDays =
      (rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 365) {
      throw new BadRequestException('日期范围不能超过365天');
    }

    // 将 days_of_week（"1"=周一 ~ "7"=周日）转换为 JS getDay()（0=周日 ~ 6=周六）
    const targetJsDays = dto.days_of_week.map((d) => {
      const n = parseInt(d);
      return n === 7 ? 0 : n; // "7" → 0 (Sunday)
    });

    // 生成所有匹配日期
    const matchingDates: Date[] = [];
    const current = new Date(rangeStart);
    while (current <= rangeEnd) {
      if (targetJsDays.includes(current.getDay())) {
        matchingDates.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }

    if (matchingDates.length === 0) {
      throw new BadRequestException(
        '所选日期范围内没有匹配的日期，请调整日期范围或上课日期',
      );
    }

    // 解析时间
    const [startHour, startMin] = dto.start_time.split(':').map(Number);
    const [endHour, endMin] = dto.end_time.split(':').map(Number);

    // 批量获取已有排课（教师和教室），用于内存冲突检测，避免 N+1 查询
    const batchRangeStart = new Date(matchingDates[0]);
    batchRangeStart.setHours(0, 0, 0, 0);
    const batchRangeEnd = new Date(matchingDates[matchingDates.length - 1]);
    batchRangeEnd.setHours(23, 59, 59, 999);

    const [existingTeacherSchedules, existingClassroomSchedules] =
      await Promise.all([
        this.scheduleRepository
          .getQuery()
          .andWhere('entity.teacher_id = :teacherId', {
            teacherId: dto.teacher_id,
          })
          .andWhere('entity.start_time <= :rangeEnd', {
            rangeEnd: batchRangeEnd,
          })
          .andWhere('entity.end_time >= :rangeStart', {
            rangeStart: batchRangeStart,
          })
          .getMany(),
        this.scheduleRepository
          .getQuery()
          .andWhere('entity.classroom_id = :classroomId', {
            classroomId: dto.classroom_id,
          })
          .andWhere('entity.start_time <= :rangeEnd', {
            rangeEnd: batchRangeEnd,
          })
          .andWhere('entity.end_time >= :rangeStart', {
            rangeStart: batchRangeStart,
          })
          .getMany(),
      ]);

    // 内存冲突检测辅助函数
    const hasTimeOverlap = (
      existingSchedules: any[],
      newStart: Date,
      newEnd: Date,
    ): string | null => {
      for (const s of existingSchedules) {
        const sStart = new Date(s.start_time);
        const sEnd = new Date(s.end_time);
        if (sStart < newEnd && sEnd > newStart) {
          return s.id;
        }
      }
      return null;
    };

    const weekLabels: Record<number, string> = {
      0: '周日',
      1: '周一',
      2: '周二',
      3: '周三',
      4: '周四',
      5: '周五',
      6: '周六',
    };

    // 逐日创建排课
    let created = 0;
    let skipped = 0;
    const conflicts: string[] = [];

    for (const date of matchingDates) {
      const scheduleStartTime = new Date(date);
      scheduleStartTime.setHours(startHour, startMin, 0, 0);

      const scheduleEndTime = new Date(date);
      scheduleEndTime.setHours(endHour, endMin, 0, 0);

      const jsDay = date.getDay();
      const dayOfWeek = jsDay === 0 ? '7' : String(jsDay);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      // 教师冲突检测
      const teacherConflict = hasTimeOverlap(
        existingTeacherSchedules,
        scheduleStartTime,
        scheduleEndTime,
      );
      if (teacherConflict) {
        skipped++;
        conflicts.push(`${dateStr}(${weekLabels[jsDay]}): 教师时间冲突`);
        continue;
      }

      // 教室冲突检测
      const classroomConflict = hasTimeOverlap(
        existingClassroomSchedules,
        scheduleStartTime,
        scheduleEndTime,
      );
      if (classroomConflict) {
        skipped++;
        conflicts.push(`${dateStr}(${weekLabels[jsDay]}): 教室被占用`);
        continue;
      }

      // 创建排课记录
      const schedule = this.scheduleRepository.create({
        course_id: dto.course_id,
        teacher_id: dto.teacher_id,
        classroom_id: dto.classroom_id,
        institution_id: institutionId,
        start_time: scheduleStartTime,
        end_time: scheduleEndTime,
        day_of_week: dayOfWeek,
        max_students: dto.max_students,
        notes: dto.notes,
        booked_count: 0,
      });

      const saved = await this.scheduleRepository.save(schedule);
      created++;

      // 新建的排课也要加入已有列表，防止同批次内互相冲突
      existingTeacherSchedules.push(saved);
      existingClassroomSchedules.push(saved);
    }

    return {
      created,
      skipped,
      total: matchingDates.length,
      conflicts,
    };
  }

  /**
   * 查询排课列表
   */
  async findAll(query: QueryScheduleDto) {
    const { page, pageSize, ...filters } = query;

    const queryBuilder = this.scheduleRepository.getQuery();

    // 如果未指定机构ID，使用当前用户的机构ID
    if (!filters.institution_id) {
      const userId = this.userContextService.getCurrentUserId();
      const userInstitutions =
        await this.userInstitutionRepository.findByUserId(userId);
      if (userInstitutions && userInstitutions.length > 0) {
        filters.institution_id = userInstitutions[0].institution_id;
      }
    }

    // 应用筛选条件
    if (filters.institution_id) {
      queryBuilder.andWhere('entity.institution_id = :institutionId', {
        institutionId: filters.institution_id,
      });
    }

    if (filters.course_id) {
      queryBuilder.andWhere('entity.course_id = :courseId', {
        courseId: filters.course_id,
      });
    }

    if (filters.teacher_id) {
      queryBuilder.andWhere('entity.teacher_id = :teacherId', {
        teacherId: filters.teacher_id,
      });
    }

    if (filters.classroom_id) {
      queryBuilder.andWhere('entity.classroom_id = :classroomId', {
        classroomId: filters.classroom_id,
      });
    }

    if (filters.day_of_week) {
      queryBuilder.andWhere('entity.day_of_week = :dayOfWeek', {
        dayOfWeek: filters.day_of_week,
      });
    }

    if (filters.start_date) {
      queryBuilder.andWhere('entity.start_time >= :startDate', {
        startDate: new Date(filters.start_date),
      });
    }

    if (filters.end_date) {
      queryBuilder.andWhere('entity.end_time <= :endDate', {
        endDate: new Date(filters.end_date),
      });
    }

    // 分页兼容模式：有分页参数就分页，否则返回数组
    let schedules;
    if (page && pageSize) {
      const skip = (page - 1) * pageSize;
      const [data, total] = await queryBuilder
        .skip(skip)
        .take(pageSize)
        .getManyAndCount();

      // 手动加载关联数据
      await this.loadRelationsForSchedules(data);

      return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }

    // 无分页参数，直接返回数组
    schedules = await queryBuilder.getMany();
    await this.loadRelationsForSchedules(schedules);
    return schedules;
  }

  /**
   * 为排课列表手动加载关联数据
   */
  private async loadRelationsForSchedules(schedules: any[]) {
    if (!schedules || schedules.length === 0) return;

    // 收集所有ID
    const courseIds = [...new Set(schedules.map(s => s.course_id).filter(Boolean))];
    const teacherIds = [...new Set(schedules.map(s => s.teacher_id).filter(Boolean))];
    const classroomIds = [...new Set(schedules.map(s => s.classroom_id).filter(Boolean))];

    // 批量查询关联数据
    const [courses, teachers, classrooms] = await Promise.all([
      courseIds.length > 0 ? this.courseRepository.getQuery()
        .andWhere('entity.id IN (:...courseIds)', { courseIds })
        .getMany() : [],
      teacherIds.length > 0 ? this.teacherRepository.getQuery()
        .andWhere('entity.id IN (:...teacherIds)', { teacherIds })
        .getMany() : [],
      classroomIds.length > 0 ? this.classroomRepository.getQuery()
        .andWhere('entity.id IN (:...classroomIds)', { classroomIds })
        .getMany() : [],
    ]);

    // 创建 Map 便于查找
    const courseMap = new Map(courses.map(c => [c.id, c] as [string, any]));
    const teacherMap = new Map(teachers.map(t => [t.id, t] as [string, any]));
    const classroomMap = new Map(classrooms.map(c => [c.id, c] as [string, any]));

    // 填充关联数据
    for (const schedule of schedules) {
      schedule.course = courseMap.get(schedule.course_id);
      schedule.teacher = teacherMap.get(schedule.teacher_id);
      schedule.classroom = classroomMap.get(schedule.classroom_id);
    }
  }

  /**
   * 获取排课详情
   */
  async findOne(id: string) {
    const schedule = await this.scheduleRepository.findOneById(id);

    if (!schedule) {
      throw new NotFoundException('排课不存在');
    }

    // 手动加载关联数据
    await this.loadRelationsForSchedules([schedule]);

    return schedule;
  }

  /**
   * 更新排课
   */
  @Transactional()
  async update(id: string, dto: UpdateScheduleDto): Promise<void> {
    const schedule = await this.scheduleRepository.findOneById(id);
    if (!schedule) {
      throw new NotFoundException('排课不存在');
    }

    // 如果修改了时间，需要验证
    if (dto.start_time || dto.end_time) {
      const startTime = dto.start_time
        ? new Date(dto.start_time)
        : schedule.start_time;
      const endTime = dto.end_time ? new Date(dto.end_time) : schedule.end_time;

      if (startTime >= endTime) {
        throw new BadRequestException('开始时间必须早于结束时间');
      }

      // 检查教师时间冲突
      const teacherId = dto.teacher_id || schedule.teacher_id;
      const teacherConflict =
        await this.scheduleRepository.checkTeacherConflict(
          teacherId,
          startTime,
          endTime,
          id,
        );
      if (teacherConflict) {
        throw new BadRequestException('该教师在此时间段已有其他排课');
      }

      // 检查教室时间冲突
      const classroomId = dto.classroom_id || schedule.classroom_id;
      const classroomConflict =
        await this.scheduleRepository.checkClassroomConflict(
          classroomId,
          startTime,
          endTime,
          id,
        );
      if (classroomConflict) {
        throw new BadRequestException('该教室在此时间段已被占用');
      }

      Object.assign(schedule, {
        ...dto,
        start_time: startTime,
        end_time: endTime,
      });
    } else {
      Object.assign(schedule, dto);
    }

    await this.scheduleRepository.save(schedule);
  }

  /**
   * 删除排课
   */
  @Transactional()
  async remove(id: string): Promise<void> {
    const schedule = await this.scheduleRepository.findOneById(id);
    if (!schedule) {
      throw new NotFoundException('排课不存在');
    }

    // 检查是否已有预约
    if (schedule.booked_count > 0) {
      throw new BadRequestException('该排课已有预约，无法删除');
    }

    await this.scheduleRepository.softRemoveById(id);
  }

  /**
   * 获取指定课程的排课列表
   * 排课表只保存机构创建的模板数据，不再被订单流程污染
   */
  async findByCourse(courseId: string) {
    const schedules = await this.scheduleRepository.findByCourse(courseId);
    await this.loadRelationsForSchedules(schedules);
    return schedules;
  }
}
