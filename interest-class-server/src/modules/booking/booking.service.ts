import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Transactional } from '@/common/decorators/transaction.decorator';
import { UserContextService } from '@/common/services/user-context.service';
import { BookingRepository } from './repositories/booking.repository';
import { CourseRepository } from '../course/repositories/course.repository';
import { CreateBookingDto, UpdateBookingStatusDto } from './dto/booking.dto';

@Injectable()
export class BookingService {
  constructor(
    private bookingRepository: BookingRepository,
    private courseRepository: CourseRepository,
    private userContextService: UserContextService,
    private dataSource: DataSource,
  ) {}

  /**
   * 批量加载预约的关联数据（course、institution、child、teacher、classroom）
   * 新架构：优先使用 booking 自身的时间/教师/教室快照字段
   * 仅在快照字段为空时（兼容旧数据）才通过 schedule_id 回退查询
   */
  private async loadBookingRelations(bookings: any[]): Promise<any[]> {
    if (!bookings || bookings.length === 0) return [];

    // 收集所有需要查询的ID
    const courseIds = [...new Set(bookings.map(b => b.course_id).filter(Boolean))];
    const institutionIds = [...new Set(bookings.map(b => b.institution_id).filter(Boolean))];
    const childIds = [...new Set(bookings.map(b => b.child_id).filter(Boolean))];

    // 收集需要查名称的教师/教室ID（booking 自身有 teacher_id/classroom_id 但可能没有名称快照）
    const allTeacherIds = [...new Set(bookings.map(b => b.teacher_id).filter(Boolean))];
    const allClassroomIds = [...new Set(bookings.map(b => b.classroom_id).filter(Boolean))];

    // 仅对没有时间快照的旧数据，通过 schedule_id 回退查询
    const legacyBookings = bookings.filter(b => !b.start_time && b.schedule_id);
    const legacyScheduleIds = [...new Set(legacyBookings.map(b => b.schedule_id))];

    // 定义类型
    type ScheduleRow = { id: string; start_time: string; end_time: string; day_of_week: string; teacher_id: string; classroom_id: string };
    type CourseRow = { id: string; title: string; subtitle: string };
    type InstitutionRow = { id: string; name: string; address: string };
    type ChildRow = { id: string; name: string; avatar: string };
    type TeacherRow = { id: string; name: string };
    type ClassroomRow = { id: string; name: string };

    // 批量查询关联数据
    const [legacySchedules, courses, institutions, children]: [ScheduleRow[], CourseRow[], InstitutionRow[], ChildRow[]] = await Promise.all([
      legacyScheduleIds.length > 0 
        ? this.dataSource.query<ScheduleRow[]>(
            `SELECT id, start_time, end_time, day_of_week, teacher_id, classroom_id FROM schedules WHERE id = ANY($1) AND is_delete = false`,
            [legacyScheduleIds]
          )
        : [],
      courseIds.length > 0
        ? this.dataSource.query<CourseRow[]>(
            `SELECT id, title, subtitle FROM courses WHERE id = ANY($1) AND is_delete = false`,
            [courseIds]
          )
        : [],
      institutionIds.length > 0
        ? this.dataSource.query<InstitutionRow[]>(
            `SELECT id, name, address FROM institutions WHERE id = ANY($1) AND is_delete = false`,
            [institutionIds]
          )
        : [],
      childIds.length > 0
        ? this.dataSource.query<ChildRow[]>(
            `SELECT id, name, avatar FROM children WHERE id = ANY($1) AND is_delete = false`,
            [childIds]
          )
        : [],
    ]);

    // 合并旧数据中的教师/教室ID
    for (const s of legacySchedules) {
      if (s.teacher_id) allTeacherIds.push(s.teacher_id);
      if (s.classroom_id) allClassroomIds.push(s.classroom_id);
    }
    const uniqueTeacherIds = [...new Set(allTeacherIds)];
    const uniqueClassroomIds = [...new Set(allClassroomIds)];

    // 查询教师和教室名称
    const [teachers, classrooms]: [TeacherRow[], ClassroomRow[]] = await Promise.all([
      uniqueTeacherIds.length > 0
        ? this.dataSource.query<TeacherRow[]>(
            `SELECT id, name FROM teachers WHERE id = ANY($1) AND is_delete = false`,
            [uniqueTeacherIds]
          )
        : [],
      uniqueClassroomIds.length > 0
        ? this.dataSource.query<ClassroomRow[]>(
            `SELECT id, name FROM classrooms WHERE id = ANY($1) AND is_delete = false`,
            [uniqueClassroomIds]
          )
        : [],
    ]);

    // 构建映射
    const legacyScheduleMap = new Map<string, ScheduleRow>(legacySchedules.map(s => [s.id, s]));
    const courseMap = new Map<string, CourseRow>(courses.map(c => [c.id, c]));
    const institutionMap = new Map<string, InstitutionRow>(institutions.map(i => [i.id, i]));
    const childMap = new Map<string, ChildRow>(children.map(c => [c.id, c]));
    const teacherMap = new Map<string, TeacherRow>(teachers.map(t => [t.id, t]));
    const classroomMap = new Map<string, ClassroomRow>(classrooms.map(c => [c.id, c]));

    // 查询预约关联的订单ID（订单表中的 booking_id 可能包含多个预约ID，用逗号分隔）
    const bookingIds = bookings.map(b => b.id);
    type OrderRow = { id: string; booking_id: string };
    const orders: OrderRow[] = bookingIds.length > 0
      ? await this.dataSource.query<OrderRow[]>(
          `SELECT id, booking_id FROM orders 
           WHERE is_delete = false 
           AND status NOT IN ('cancelled', 'refund_pending', 'refunding', 'refunded')
           AND booking_id IS NOT NULL`,
        )
      : [];
    
    // 构建 booking_id -> order_id 的映射（一个预约可能关联一个订单）
    const bookingToOrderMap = new Map<string, string>();
    for (const order of orders) {
      if (order.booking_id) {
        const relatedBookingIds = order.booking_id.split(',').map(id => id.trim()).filter(Boolean);
        for (const bookingId of relatedBookingIds) {
          bookingToOrderMap.set(bookingId, order.id);
        }
      }
    }

    // 组装数据
    return bookings.map(booking => {
      const course = courseMap.get(booking.course_id);
      const institution = institutionMap.get(booking.institution_id);
      const child = childMap.get(booking.child_id);
      const orderId = bookingToOrderMap.get(booking.id);

      // ⭐ 优先使用 booking 自身的快照字段，仅在快照为空时回退到旧数据的 schedule 查询
      let startTime = booking.start_time;
      let endTime = booking.end_time;
      let dayOfWeek = booking.day_of_week;
      let teacherId = booking.teacher_id;
      let classroomId = booking.classroom_id;

      // 兼容旧数据：如果 booking 没有时间快照，从 schedule 获取
      if (!startTime && booking.schedule_id) {
        const schedule = legacyScheduleMap.get(booking.schedule_id);
        if (schedule) {
          startTime = schedule.start_time;
          endTime = schedule.end_time;
          dayOfWeek = schedule.day_of_week;
          teacherId = schedule.teacher_id;
          classroomId = schedule.classroom_id;
        }
      }

      const teacher = teacherId ? teacherMap.get(teacherId) : null;
      const classroom = classroomId ? classroomMap.get(classroomId) : null;

      return {
        ...booking,
        order_id: orderId || null,
        schedule: startTime ? {
          id: booking.schedule_id,
          start_time: startTime,
          end_time: endTime,
          day_of_week: dayOfWeek,
        } : null,
        course: course ? {
          id: course.id,
          title: course.title,
          subtitle: course.subtitle,
        } : null,
        institution: institution ? {
          id: institution.id,
          name: institution.name,
          address: institution.address,
        } : null,
        child: child ? {
          id: child.id,
          name: child.name,
          avatar: child.avatar,
        } : null,
        teacher: teacher ? {
          id: teacher.id,
          name: booking.teacher_name || teacher.name,
        } : null,
        classroom: classroom ? {
          id: classroom.id,
          name: booking.classroom_name || classroom.name,
        } : null,
      };
    });
  }

  /**
   * 创建预约（支持多选排课）
   * - 如果传入 schedule_ids 数组，为每个排课创建一条预约
   * - 如果传入 schedule_id 单个值，创建一条预约（兼容旧逻辑）
   * @returns 创建的预约ID（多个时返回逗号分隔的字符串）
   */
  @Transactional()
  async create(dto: CreateBookingDto): Promise<string> {
    const userId = this.userContextService.getCurrentUserId();

    // 验证课程是否存在
    const course = await this.courseRepository.findOneById(dto.course_id);
    if (!course) {
      throw new NotFoundException('课程不存在');
    }

    // 处理排课ID：优先使用 schedule_ids 数组，否则使用 schedule_id 单个值
    const scheduleIds = dto.schedule_ids || (dto.schedule_id ? [dto.schedule_id] : []);

    if (scheduleIds.length === 0) {
      throw new BadRequestException('请至少选择一个上课时段');
    }

    const bookingIds: string[] = [];

    // 为每个排课创建一条预约
    for (const scheduleId of scheduleIds) {
      // 查询排课信息，获取时间/教师/教室快照
      const scheduleRows = await this.dataSource.query(
        `SELECT s.start_time, s.end_time, s.day_of_week,
                s.teacher_id, s.classroom_id,
                t.name AS teacher_name, c.name AS classroom_name
         FROM schedules s
         LEFT JOIN teachers t ON t.id = s.teacher_id AND t.is_delete = false
         LEFT JOIN classrooms c ON c.id = s.classroom_id AND c.is_delete = false
         WHERE s.id = $1 AND s.is_delete = false`,
        [scheduleId],
      );
      const schedule = scheduleRows?.[0];

      const booking = this.bookingRepository.create({
        user_id: userId,
        institution_id: course.institution_id,
        course_id: dto.course_id,
        sku_id: dto.sku_id,
        schedule_id: scheduleId,
        child_id: dto.child_id,
        student_name: dto.student_name,
        student_phone: dto.student_phone,
        student_age: dto.student_age,
        booking_time: dto.booking_time ? new Date(dto.booking_time) : undefined,
        remark: dto.remark,
        status: 'pending',
        // 快照字段：从排课信息填充
        start_time: schedule?.start_time ? new Date(schedule.start_time) : undefined,
        end_time: schedule?.end_time ? new Date(schedule.end_time) : undefined,
        day_of_week: schedule?.day_of_week,
        teacher_id: schedule?.teacher_id,
        classroom_id: schedule?.classroom_id,
        teacher_name: schedule?.teacher_name,
        classroom_name: schedule?.classroom_name,
      });

      const saved = await this.bookingRepository.save(booking);
      const savedId = Array.isArray(saved) ? saved[0].id : saved.id;
      bookingIds.push(savedId);
    }

    // 返回所有创建的预约ID
    return bookingIds.join(',');
  }

  /**
   * 查询我的预约列表（支持分页兼容模式）
   * 返回包含 schedule、course、institution、child 等关联信息
   */
  async findMyBookings(page?: number, pageSize?: number, status?: string) {
    const userId = this.userContextService.getCurrentUserId();

    const queryBuilder = this.bookingRepository
      .getQuery()
      .andWhere('entity.user_id = :userId', { userId });

    if (status) {
      const statuses = status
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (statuses.length === 1) {
        queryBuilder.andWhere('entity.status = :status', {
          status: statuses[0],
        });
      } else {
        queryBuilder.andWhere('entity.status IN (:...statuses)', { statuses });
      }
    }

    // 分页兼容模式：有分页参数就分页，否则返回数组
    if (page && pageSize) {
      const skip = (page - 1) * pageSize;
      const [data, total] = await queryBuilder
        .skip(skip)
        .take(pageSize)
        .getManyAndCount();

      // 加载关联数据
      const enrichedData = await this.loadBookingRelations(data);

      return {
        data: enrichedData,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }

    // 无分页参数，直接返回数组（也加载关联数据）
    const data = await queryBuilder.getMany();
    return this.loadBookingRelations(data);
  }

  /**
   * 查询机构预约列表（支持分页兼容模式）
   */
  async findInstitutionBookings(
    institutionId: string,
    page?: number,
    pageSize?: number,
    status?: string,
  ) {
    const queryBuilder = this.bookingRepository
      .getQuery()
      .andWhere('entity.institution_id = :institutionId', { institutionId });

    if (status) {
      const statuses = status
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (statuses.length === 1) {
        queryBuilder.andWhere('entity.status = :status', {
          status: statuses[0],
        });
      } else {
        queryBuilder.andWhere('entity.status IN (:...statuses)', { statuses });
      }
    }

    // 分页兼容模式
    if (page && pageSize) {
      const skip = (page - 1) * pageSize;
      const [data, total] = await queryBuilder
        .skip(skip)
        .take(pageSize)
        .getManyAndCount();

      const enrichedData = await this.loadBookingRelations(data);
      return {
        data: enrichedData,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }

    // 无分页参数，直接返回数组
    const rawData = await queryBuilder.getMany();
    return this.loadBookingRelations(rawData);
  }

  /**
   * 查询课程预约列表
   */
  async findCourseBookings(courseId: string, page = 1, pageSize = 10) {
    return this.bookingRepository.findByCourseId(courseId, page, pageSize);
  }

  /**
   * 查询预约详情
   */
  async findOne(id: string) {
    const booking = await this.bookingRepository.findOneById(id);
    if (!booking) {
      throw new NotFoundException('预约不存在');
    }
    const enriched = await this.loadBookingRelations([booking]);
    return enriched[0];
  }

  /**
   * 更新预约状态（机构端）
   */
  @Transactional()
  async updateStatus(id: string, dto: UpdateBookingStatusDto): Promise<void> {
    const booking = await this.bookingRepository.findOneById(id);
    if (!booking) {
      throw new NotFoundException('预约不存在');
    }

    // 状态流转校验
    if (booking.status === 'completed' || booking.status === 'cancelled') {
      throw new BadRequestException('预约已完成或已取消，无法修改');
    }

    booking.status = dto.status;
    booking.reason = dto.reason;

    // 更新时间戳
    const now = new Date();
    switch (dto.status) {
      case 'confirmed':
        booking.confirmed_at = now;
        break;
      case 'rejected':
        booking.rejected_at = now;
        // 预约被拒绝，释放该时段项数
        if (booking.schedule_id) {
          await this.dataSource.query(
            `UPDATE schedules SET booked_count = GREATEST(booked_count - 1, 0) WHERE id = $1`,
            [booking.schedule_id],
          );
        }
        break;
      case 'cancelled':
        booking.cancelled_at = now;
        break;
      case 'completed':
        booking.completed_at = now;
        break;
    }

    await this.bookingRepository.save(booking);
  }

  /**
   * 取消预约（用户端）
   * 取消预约需要机构审核，状态先设为 pending_cancel
   */
  @Transactional()
  async cancel(id: string, reason?: string): Promise<void> {
    const userId = this.userContextService.getCurrentUserId();
    const booking = await this.bookingRepository.findOneById(id);

    if (!booking) {
      throw new NotFoundException('预约不存在');
    }

    if (booking.user_id !== userId) {
      throw new BadRequestException('无权取消此预约');
    }

    if (booking.status === 'cancelled' || booking.status === 'completed' || booking.status === 'pending_cancel') {
      throw new BadRequestException('预约已取消、已完成或已在取消审核中');
    }

    booking.status = 'pending_cancel';
    booking.reason = reason;

    await this.bookingRepository.save(booking);
  }

  /**
   * 审核取消预约（机构端）
   * @param id 预约ID
   * @param action approve-同意取消, reject-拒绝取消
   * @param reason 审核原因
   */
  @Transactional()
  async reviewCancel(
    id: string,
    action: 'approve' | 'reject',
    reason?: string,
  ): Promise<void> {
    const booking = await this.bookingRepository.findOneById(id);
    if (!booking) {
      throw new NotFoundException('预约不存在');
    }

    if (booking.status !== 'pending_cancel') {
      throw new BadRequestException('该预约不在取消审核状态');
    }

    if (action === 'approve') {
      booking.status = 'cancelled';
      booking.cancelled_at = new Date();
      // 取消预约，释放该时段项数
      if (booking.schedule_id) {
        await this.dataSource.query(
          `UPDATE schedules SET booked_count = GREATEST(booked_count - 1, 0) WHERE id = $1`,
          [booking.schedule_id],
        );
      }
    } else {
      // 拒绝取消，恢复为已确认状态
      booking.status = 'confirmed';
      booking.reason = reason || '机构拒绝了您的取消申请';
    }

    await this.bookingRepository.save(booking);
  }

  /**
   * 修改预约排课（用户端）
   * 只允许修改处于 pending 或 confirmed 状态的预约
   * 如果距离上课时间不足24小时，需要机构审核
   */
  @Transactional()
  async changeSchedule(
    id: string,
    newScheduleId: string,
  ): Promise<{ needsApproval: boolean }> {
    const userId = this.userContextService.getCurrentUserId();
    const booking = await this.bookingRepository.findOneById(id);

    if (!booking) {
      throw new NotFoundException('预约不存在');
    }

    if (booking.user_id !== userId) {
      throw new BadRequestException('无权修改此预约');
    }

    // 只允许修改 pending 或 confirmed 状态的预约
    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      throw new BadRequestException('当前预约状态不允许修改排课');
    }

    // 验证新排课是否存在且属于同一课程
    const schedule = await this.dataSource.query(
      `SELECT id, course_id, max_students, booked_count, start_time, end_time, day_of_week, teacher_id, classroom_id FROM schedules WHERE id = $1 AND is_delete = false`,
      [newScheduleId],
    );

    if (!schedule || schedule.length === 0) {
      throw new NotFoundException('排课不存在');
    }

    if (schedule[0].course_id !== booking.course_id) {
      throw new BadRequestException('排课不属于当前课程');
    }

    // 检查排课是否有名额（如果是换到不同的排课）
    if (booking.schedule_id !== newScheduleId) {
      const availableSpots = schedule[0].max_students - schedule[0].booked_count;
      if (availableSpots <= 0) {
        throw new BadRequestException('该时段已满，请选择其他时段');
      }
    }

    // 判断是否需要审核（使用 booking 自身的 start_time，兼容旧数据回退到 schedule）
    let needsApproval = false;
    const currentStartTime = booking.start_time;

    if (currentStartTime) {
      const startTime = new Date(currentStartTime);
      const now = new Date();
      const hoursUntilClass =
        (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      needsApproval = hoursUntilClass < 24;
    } else if (booking.schedule_id) {
      // 兼容旧数据：从原排课获取时间
      const currentSchedule = await this.dataSource.query(
        `SELECT id, start_time FROM schedules WHERE id = $1 AND is_delete = false`,
        [booking.schedule_id],
      );
      if (currentSchedule && currentSchedule.length > 0) {
        const startTime = new Date(currentSchedule[0].start_time);
        const now = new Date();
        const hoursUntilClass =
          (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        needsApproval = hoursUntilClass < 24;
      }
    }

    // 查询新排课的教师和教室名称
    const newScheduleData = schedule[0];
    let teacherName: string | undefined = undefined;
    let classroomName: string | undefined = undefined;

    if (newScheduleData.teacher_id) {
      const teacherRows = await this.dataSource.query(
        `SELECT name FROM teachers WHERE id = $1 AND is_delete = false`,
        [newScheduleData.teacher_id],
      );
      if (teacherRows.length > 0) teacherName = teacherRows[0].name;
    }
    if (newScheduleData.classroom_id) {
      const classroomRows = await this.dataSource.query(
        `SELECT name FROM classrooms WHERE id = $1 AND is_delete = false`,
        [newScheduleData.classroom_id],
      );
      if (classroomRows.length > 0) classroomName = classroomRows[0].name;
    }

    if (needsApproval) {
      // 需要审核：保存待审核的排课ID，状态改为 pending_change
      booking.pending_change_schedule_id = newScheduleId;
      booking.status = 'pending_change';
    } else {
      // 不需要审核：直接修改排课和时间快照
      booking.schedule_id = newScheduleId;
      booking.start_time = newScheduleData.start_time;
      booking.end_time = newScheduleData.end_time;
      booking.day_of_week = newScheduleData.day_of_week;
      booking.teacher_id = newScheduleData.teacher_id;
      booking.classroom_id = newScheduleData.classroom_id;
      booking.teacher_name = teacherName;
      booking.classroom_name = classroomName;
    }

    await this.bookingRepository.save(booking);
    return { needsApproval };
  }

  /**
   * 审核修改预约请求（机构端）
   * @param id 预约ID
   * @param action approve-同意, reject-拒绝
   * @param reason 拒绝原因
   */
  @Transactional()
  async reviewChangeSchedule(
    id: string,
    action: 'approve' | 'reject',
    reason?: string,
  ): Promise<void> {
    const booking = await this.bookingRepository.findOneById(id);

    if (!booking) {
      throw new NotFoundException('预约不存在');
    }

    if (booking.status !== 'pending_change') {
      throw new BadRequestException('该预约没有待审核的修改请求');
    }

    if (!booking.pending_change_schedule_id) {
      throw new BadRequestException('找不到待审核的排课信息');
    }

    if (action === 'approve') {
      // 同意：更新排课ID + 时间快照，恢复 confirmed 状态
      const newScheduleId = booking.pending_change_schedule_id;
      const scheduleRows = await this.dataSource.query(
        `SELECT id, start_time, end_time, day_of_week, teacher_id, classroom_id FROM schedules WHERE id = $1 AND is_delete = false`,
        [newScheduleId],
      );

      if (scheduleRows && scheduleRows.length > 0) {
        const newSchedule = scheduleRows[0];
        booking.schedule_id = newScheduleId;
        booking.start_time = newSchedule.start_time;
        booking.end_time = newSchedule.end_time;
        booking.day_of_week = newSchedule.day_of_week;
        booking.teacher_id = newSchedule.teacher_id;
        booking.classroom_id = newSchedule.classroom_id;

        // 更新名称快照
        if (newSchedule.teacher_id) {
          const teacherRows = await this.dataSource.query(
            `SELECT name FROM teachers WHERE id = $1 AND is_delete = false`,
            [newSchedule.teacher_id],
          );
          booking.teacher_name = teacherRows.length > 0 ? teacherRows[0].name : null;
        }
        if (newSchedule.classroom_id) {
          const classroomRows = await this.dataSource.query(
            `SELECT name FROM classrooms WHERE id = $1 AND is_delete = false`,
            [newSchedule.classroom_id],
          );
          booking.classroom_name = classroomRows.length > 0 ? classroomRows[0].name : null;
        }
      } else {
        // 排课已不存在，但仍然更新 schedule_id
        booking.schedule_id = newScheduleId;
      }

      (booking as any).pending_change_schedule_id = null;
      booking.status = 'confirmed';
    } else {
      // 拒绝：清除待审核的排课ID，恢复 confirmed 状态
      (booking as any).pending_change_schedule_id = null;
      booking.status = 'confirmed';
      booking.reason = reason || '机构拒绝了修改请求';
    }

    await this.bookingRepository.save(booking);
  }

  /**
   * 删除预约（软删除）
   */
  @Transactional()
  async remove(id: string): Promise<void> {
    const booking = await this.bookingRepository.findOneById(id);
    if (!booking) {
      throw new NotFoundException('预约不存在');
    }

    await this.bookingRepository.softRemoveById(id);
  }
}
