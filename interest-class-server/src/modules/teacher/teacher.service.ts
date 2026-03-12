import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { TeacherRepository } from './repositories/teacher.repository';
import { TeacherUserRepository } from './repositories/teacher-user.repository';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { QueryTeacherDto } from './dto/query-teacher.dto';
import { UserContextService } from '@/common/services/user-context.service';
import { UserRepository } from '@/modules/auth/repositories/user.repository';
import { UserInstitutionRepository } from '@/modules/auth/repositories/user-institution.repository';
import { ScheduleRepository } from '@/modules/schedule/repositories/schedule.repository';
import { BookingRepository } from '@/modules/booking/repositories/booking.repository';
import { CourseRepository } from '@/modules/course/repositories/course.repository';
import { CheckInRepository } from '@/modules/check-in/repositories/check-in.repository';
import { Transactional } from '@/common/decorators/transaction.decorator';
import { DataSource } from 'typeorm';

@Injectable()
export class TeacherService {
  constructor(
    private teacherRepository: TeacherRepository,
    private teacherUserRepository: TeacherUserRepository,
    private userRepository: UserRepository,
    private userInstitutionRepository: UserInstitutionRepository,
    private scheduleRepository: ScheduleRepository,
    private bookingRepository: BookingRepository,
    private courseRepository: CourseRepository,
    private checkInRepository: CheckInRepository,
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
      throw new ForbiddenException('您没有权限操作该机构的教师');
    }
  }

  /**
   * 创建教师
   */
  @Transactional()
  async create(dto: CreateTeacherDto): Promise<string> {
    // 验证权限
    await this.validateInstitutionAccess(dto.institution_id);

    // 检查手机号是否已经存在
    let user = await this.userRepository.findByPhone(dto.phone);
    if (user) {
      // 检查该用户是否已经是教师
      const existingTeachers = await this.teacherUserRepository.findByUserId(
        user.id,
      );
      if (existingTeachers.length > 0) {
        throw new BadRequestException(
          `手机号 ${dto.phone} 已经是其他教师的账号`,
        );
      }
      
      // 检查该用户是否已属于机构
      const institutions = await this.userInstitutionRepository.findInstitutionsByUserId(
        user.id,
      );
      if (institutions.length > 0) {
        throw new BadRequestException(
          `手机号 ${dto.phone} 已属于机构账号，不能同时作为教师账号`,
        );
      }
    }

    // 检查在同一机构下手机号是否重复
    const phoneExists = await this.teacherRepository.checkPhoneExists(
      dto.institution_id,
      dto.phone,
    );
    if (phoneExists) {
      throw new BadRequestException('该手机号已被使用');
    }

    // 创建教师
    const teacher = this.teacherRepository.create({
      institution_id: dto.institution_id,
      name: dto.name,
      gender: dto.gender,
      phone: dto.phone,
      photo: dto.photo,
      subjects: dto.subjects || [],
      title: dto.title,
      years_of_experience: dto.years_of_experience,
      bio: dto.bio,
      certificates: dto.certificates || [],
      status: dto.status,
      sort_order: dto.sort_order || 0,
    });

    const saved = (await this.teacherRepository.save(teacher)) as any;
    const teacherId = saved.id;

    // 创建或查找用户账号
    if (!user) {
      user = this.userRepository.create({
        username: dto.phone,
        phone: dto.phone,
        nickname: dto.name,
        openid: `teacher_phone_${dto.phone}_${Date.now()}`,
      });
      const savedUser = (await this.userRepository.save(user)) as any;
      user = savedUser;
    }

    // 确保 user 存在
    if (!user) {
      throw new BadRequestException(`创建用户失败: ${dto.phone}`);
    }

    // 建立教师-用户关联
    await this.teacherUserRepository.addTeacherUser(
      user.id,
      teacherId,
      dto.institution_id,
    );

    return teacherId;
  }

  /**
   * 更新教师
   */
  @Transactional()
  async update(id: string, dto: UpdateTeacherDto): Promise<void> {
    const teacher = await this.teacherRepository.findOneById(id);
    if (!teacher) {
      throw new BadRequestException('教师不存在');
    }

    // 验证权限
    await this.validateInstitutionAccess(teacher.institution_id);

    // 如果修改了手机号，检查是否重复
    if (dto.phone && dto.phone !== teacher.phone) {
      const phoneExists = await this.teacherRepository.checkPhoneExists(
        teacher.institution_id,
        dto.phone,
        id,
      );
      if (phoneExists) {
        throw new BadRequestException('该手机号已被使用');
      }
    }

    // 更新教师信息
    Object.assign(teacher, {
      name: dto.name ?? teacher.name,
      gender: dto.gender ?? teacher.gender,
      phone: dto.phone ?? teacher.phone,
      photo: dto.photo ?? teacher.photo,
      subjects: dto.subjects ?? teacher.subjects,
      title: dto.title ?? teacher.title,
      years_of_experience:
        dto.years_of_experience ?? teacher.years_of_experience,
      bio: dto.bio ?? teacher.bio,
      certificates: dto.certificates ?? teacher.certificates,
      status: dto.status ?? teacher.status,
      sort_order: dto.sort_order ?? teacher.sort_order,
    });

    await this.teacherRepository.save(teacher);
  }

  /**
   * 删除教师（软删除）
   */
  @Transactional()
  async delete(id: string): Promise<void> {
    const teacher = await this.teacherRepository.findOneById(id);
    if (!teacher) {
      throw new BadRequestException('教师不存在');
    }

    // 验证权限
    await this.validateInstitutionAccess(teacher.institution_id);

    // 检查是否有未完成的排课（结束时间在当前时间之后的排课）
    const futureScheduleRows = await this.dataSource.query(
      `SELECT id FROM schedules
       WHERE teacher_id = $1
         AND end_time > NOW()
         AND is_delete = false
       LIMIT 1`,
      [id],
    );
    if (futureScheduleRows.length > 0) {
      throw new BadRequestException('该教师存在未完成的排课，无法删除，请先删除或修改相关排课');
    }

    await this.teacherRepository.softRemoveById(id);
  }

  /**
   * 查询教师列表
   * ⚠️ 这是浏览类接口，C端用户可以不登录查看教师列表
   */
  async findAll(query: QueryTeacherDto) {
    // 浏览类接口不需要权限检查，任何人都可以查看教师列表
    // 查询教师时必须指定机构ID
    if (!query.institutionId) {
      return [];
    }

    // 查询该机构的教师
    const teachers = await this.teacherRepository.findByInstitutionId(
      query.institutionId,
      query.period,
      query.startDate,
      query.endDate,
    );

    // 按状态筛选
    let filtered = teachers;
    if (query.status) {
      filtered = teachers.filter((t) => t.status === query.status);
    }

    // 按科目筛选
    if (query.subject) {
      const subject = query.subject;
      filtered = filtered.filter(
        (t) => t.subjects && t.subjects.includes(subject),
      );
    }

    // 按关键词筛选
    if (query.keyword) {
      const keyword = query.keyword.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(keyword) ||
          t.phone?.toLowerCase().includes(keyword) ||
          t.title?.toLowerCase().includes(keyword) ||
          t.bio?.toLowerCase().includes(keyword),
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

  /**
   * 获取教师详情
   * ⚠️ 这是浏览类接口，不需要登录认证，任何人都可以查看教师详情
   */
  async findOne(id: string) {
    const teacher = await this.teacherRepository.findOneById(id);
    if (!teacher) {
      throw new BadRequestException('教师不存在');
    }

    // ⚠️ 浏览类接口不需要权限检查，只有修改、删除操作才需要
    return teacher;
  }

  /**
   * 批量更新排序
   */
  @Transactional()
  async updateSort(
    items: Array<{ id: string; sort_order: number }>,
  ): Promise<void> {
    for (const item of items) {
      const teacher = await this.teacherRepository.findOneById(item.id);
      if (teacher) {
        await this.validateInstitutionAccess(teacher.institution_id);
        teacher.sort_order = item.sort_order;
        await this.teacherRepository.save(teacher);
      }
    }
  }

  /**
   * 获取当前教师的 teacherId（从 JWT 上下文中获取）
   */
  private getTeacherIdFromContext(): string {
    const teacherId = this.userContextService.get('teacherId');
    if (!teacherId) {
      throw new BadRequestException('未找到教师信息，请使用教师账号登录');
    }
    return teacherId;
  }

  /**
   * 获取教师考勤 - 按课程维度汇总
   * 返回教师负责的每门课程的考勤统计
   */
  async getMyAttendanceCourses() {
    const teacherId = this.getTeacherIdFromContext();

    // 1. 查询该教师的所有排课（模板，用于获取课程列表）
    const schedules = await this.scheduleRepository
      .getQuery()
      .andWhere('entity.teacher_id = :teacherId', { teacherId })
      .getMany();

    if (!schedules || schedules.length === 0) {
      return [];
    }

    // 2. 提取不重复的 course_id
    const courseIds = [...new Set(schedules.map((s) => s.course_id))];
    const scheduleIds = schedules.map((s) => s.id);

    // 3. 批量查询课程信息
    const courses = await this.courseRepository
      .getQuery()
      .andWhere('entity.id IN (:...courseIds)', { courseIds })
      .getMany();

    // 4. 查询该教师关联的预约（通过 booking.teacher_id 直接查询）
    const bookings = await this.bookingRepository
      .getQuery()
      .andWhere('entity.teacher_id = :teacherId', { teacherId })
      .andWhere('entity.status IN (:...statuses)', {
        statuses: ['confirmed', 'completed'],
      })
      .getMany();

    // 5. 查询签到记录（通过 schedule_id 或 course_id + teacher 关联）
    const checkIns = await this.checkInRepository
      .getQuery()
      .andWhere('entity.course_id IN (:...courseIds)', { courseIds })
      .andWhere('entity.schedule_id IN (:...scheduleIds)', { scheduleIds })
      .getMany();

    // 6. 按 course_id 分组统计
    const bookingsByCourse = new Map<string, any[]>();
    for (const b of bookings) {
      const arr = bookingsByCourse.get(b.course_id) || [];
      arr.push(b);
      bookingsByCourse.set(b.course_id, arr);
    }

    const checkInsByCourse = new Map<string, any[]>();
    for (const ci of checkIns) {
      const arr = checkInsByCourse.get(ci.course_id) || [];
      arr.push(ci);
      checkInsByCourse.set(ci.course_id, arr);
    }

    // 7. 组装返回数据
    return courses.map((course) => {
      const courseBookings = bookingsByCourse.get(course.id) || [];
      const courseCheckIns = checkInsByCourse.get(course.id) || [];
      const courseSchedules = schedules.filter((s) => s.course_id === course.id);

      // 去重学员数（按手机号）
      const uniqueStudents = new Set(courseBookings.map((b) => b.student_phone));

      return {
        id: course.id,
        title: course.title,
        subtitle: (course as any).subtitle,
        type: (course as any).type,
        slider_imgs: (course as any).slider_imgs,
        total_schedules: courseSchedules.length,
        total_students: uniqueStudents.size,
        total_bookings: courseBookings.length,
        total_check_ins: courseCheckIns.length,
        attendance_rate:
          courseBookings.length > 0
            ? Math.round((courseCheckIns.length / courseBookings.length) * 100)
            : 0,
      };
    });
  }

  /**
   * 获取某课程的考勤详情
   * 返回该课程下按排课模板分组的学员签到状态
   * 新架构：booking 自身存储 start_time/end_time，按时间分组
   */
  async getCourseAttendance(courseId: string) {
    const teacherId = this.getTeacherIdFromContext();

    // 1. 查询该教师在该课程下的排课模板（用于展示时段信息）
    const schedules = await this.scheduleRepository
      .getQuery()
      .andWhere('entity.teacher_id = :teacherId', { teacherId })
      .andWhere('entity.course_id = :courseId', { courseId })
      .orderBy('entity.start_time', 'DESC')
      .getMany();

    if (!schedules || schedules.length === 0) {
      return { course: null, schedules: [] };
    }

    const scheduleIds = schedules.map((s) => s.id);

    // 2. 查询课程信息
    const course = await this.courseRepository
      .getQuery()
      .andWhere('entity.id = :courseId', { courseId })
      .getOne();

    // 3. 查询该教师该课程的所有预约（通过 booking.teacher_id 直接查询）
    const bookings = await this.bookingRepository
      .getQuery()
      .andWhere('entity.teacher_id = :teacherId', { teacherId })
      .andWhere('entity.course_id = :courseId', { courseId })
      .andWhere('entity.status IN (:...statuses)', {
        statuses: ['confirmed', 'completed'],
      })
      .getMany();

    // 4. 查询签到记录
    const checkIns = await this.checkInRepository
      .getQuery()
      .andWhere('entity.schedule_id IN (:...scheduleIds)', { scheduleIds })
      .getMany();

    // 建立签到映射 booking_id -> checkIn
    const checkInMap = new Map<string, any>();
    for (const ci of checkIns) {
      if (ci.booking_id) {
        checkInMap.set(ci.booking_id, ci);
      }
    }

    // 5. 按排课分组组装数据
    const scheduleDetails = schedules.map((schedule) => {
      const scheduleBookings = bookings.filter(
        (b) => b.schedule_id === schedule.id,
      );

      const students = scheduleBookings.map((booking) => {
        const checkIn = checkInMap.get(booking.id);
        return {
          booking_id: booking.id,
          student_name: booking.student_name,
          student_phone: booking.student_phone,
          student_age: booking.student_age,
          child_id: booking.child_id,
          checked_in: !!checkIn,
          check_in_time: checkIn ? checkIn.check_in_time : null,
          is_makeup: checkIn ? checkIn.is_makeup : false,
        };
      });

      return {
        schedule_id: schedule.id,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        day_of_week: schedule.day_of_week,
        status: schedule.status,
        total_students: students.length,
        checked_count: students.filter((s) => s.checked_in).length,
        students,
      };
    });

    // 6. 全局统计
    const allStudents = scheduleDetails.flatMap((s) => s.students);
    const totalBookings = allStudents.length;
    const totalCheckedIn = allStudents.filter((s) => s.checked_in).length;

    return {
      course: course
        ? {
            id: course.id,
            title: course.title,
            type: (course as any).type,
          }
        : null,
      stats: {
        total_schedules: schedules.length,
        total_bookings: totalBookings,
        total_checked_in: totalCheckedIn,
        attendance_rate:
          totalBookings > 0
            ? Math.round((totalCheckedIn / totalBookings) * 100)
            : 0,
      },
      schedules: scheduleDetails,
    };
  }

  /**
   * 获取当前教师的授课课程列表
   * 通过 schedules 表关联查询：teacher_id -> schedule -> course_id -> course
   */
  async getMyCourses() {
    const teacherId = this.getTeacherIdFromContext();

    // 1. 查询该教师的所有排课记录
    const schedules = await this.scheduleRepository
      .getQuery()
      .andWhere('entity.teacher_id = :teacherId', { teacherId })
      .getMany();

    if (!schedules || schedules.length === 0) {
      return [];
    }

    // 2. 提取不重复的 course_id
    const courseIds = [...new Set(schedules.map((s) => s.course_id))];

    // 3. 批量查询课程信息
    const courses = await this.courseRepository
      .getQuery()
      .andWhere('entity.id IN (:...courseIds)', { courseIds })
      .getMany();

    // 4. 为每个课程附加排课数量和最近排课时间
    return courses.map((course) => {
      const courseSchedules = schedules.filter(
        (s) => s.course_id === course.id,
      );
      const nextSchedule = courseSchedules
        .filter((s) => new Date(s.start_time) > new Date())
        .sort(
          (a, b) =>
            new Date(a.start_time).getTime() -
            new Date(b.start_time).getTime(),
        )[0];

      return {
        ...course,
        schedule_count: courseSchedules.length,
        next_schedule_time: nextSchedule
          ? nextSchedule.start_time
          : null,
        total_students: courseSchedules.reduce(
          (sum, s) => sum + (s.booked_count || 0),
          0,
        ),
      };
    });
  }

  /**
   * 获取当前教师的学员列表
   * 通过 booking.teacher_id 直接查询该教师关联的预约
   */
  async getMyStudents() {
    const teacherId = this.getTeacherIdFromContext();

    // 1. 查询该教师关联的所有预约（通过 booking.teacher_id 直接查询）
    const bookings = await this.bookingRepository
      .getQuery()
      .andWhere('entity.teacher_id = :teacherId', { teacherId })
      .andWhere('entity.status IN (:...statuses)', {
        statuses: ['confirmed', 'completed', 'pending'],
      })
      .getMany();

    if (!bookings || bookings.length === 0) {
      return [];
    }

    // 2. 提取课程ID
    const courseIds = [...new Set(bookings.map((b) => b.course_id))];

    // 3. 批量查询课程信息
    const courses = await this.courseRepository
      .getQuery()
      .andWhere('entity.id IN (:...courseIds)', { courseIds })
      .getMany();
    const courseMap = new Map(courses.map((c) => [c.id, c]));

    // 4. 按学员去重（同一学员可能预约了多次），聚合课程信息
    const studentMap = new Map<
      string,
      {
        student_name: string;
        student_phone: string;
        student_age?: number;
        child_id?: string;
        booking_count: number;
        courses: Array<{ id: string; title: string }>;
        latest_booking_time?: string;
      }
    >();

    for (const booking of bookings) {
      const key = booking.student_phone || booking.student_name;
      const existing = studentMap.get(key);
      const course = courseMap.get(booking.course_id);
      // 优先使用 start_time（课程实际时间），回退到 booking_time
      const bookingTime = booking.start_time || booking.booking_time;

      if (existing) {
        existing.booking_count++;
        if (
          course &&
          !existing.courses.find((c) => c.id === course.id)
        ) {
          existing.courses.push({
            id: course.id,
            title: course.title,
          });
        }
        // 更新最近预约时间
        if (
          bookingTime &&
          (!existing.latest_booking_time ||
            new Date(bookingTime).getTime() > new Date(existing.latest_booking_time).getTime())
        ) {
          existing.latest_booking_time = bookingTime as any;
        }
      } else {
        studentMap.set(key, {
          student_name: booking.student_name,
          student_phone: booking.student_phone,
          student_age: booking.student_age,
          child_id: booking.child_id,
          booking_count: 1,
          courses: course
            ? [{ id: course.id, title: course.title }]
            : [],
          latest_booking_time: bookingTime as any,
        });
      }
    }

    // 5. 转为数组返回
    return Array.from(studentMap.values()).sort((a, b) => {
      // 按最近预约时间倒序
      if (a.latest_booking_time && b.latest_booking_time) {
        return (
          new Date(b.latest_booking_time).getTime() -
          new Date(a.latest_booking_time).getTime()
        );
      }
      return 0;
    });
  }
}
