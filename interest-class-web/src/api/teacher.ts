import { http } from '@/utils/request'

/**
 * 教师信息接口
 */
export interface TeacherInfo {
  id: string
  institution_id: string
  name: string
  gender?: 'male' | 'female'
  phone?: string
  photo: string // 必填
  subjects?: string[]
  title?: string
  years_of_experience?: number
  bio?: string
  certificates?: string[]
  status: 'active' | 'inactive' | 'on_leave'
  sort_order: number
  created_at: string
  updated_at: string
}

/**
 * 教师信息接口（简化版）
 */
export interface Teacher extends TeacherInfo {}

/**
 * 创建教师DTO
 */
export interface CreateTeacherDto {
  institution_id: string
  name: string
  gender?: 'male' | 'female'
  phone?: string
  photo: string // 头像（必填）
  subjects?: string[]
  title?: string
  years_of_experience?: number
  bio?: string
  certificates?: string[]
  status: 'active' | 'inactive' | 'on_leave'
  sort_order?: number
}

/**
 * 更新教师DTO
 */
export interface UpdateTeacherDto extends Partial<Omit<CreateTeacherDto, 'institution_id'>> {}

/**
 * 查询教师参数
 */
export interface QueryTeacherParams {
  institutionId?: string
  keyword?: string
  status?: 'active' | 'inactive' | 'on_leave'
  subject?: string
  page?: number
  pageSize?: number
  /** 时间筛选 */
  period?: string
  startDate?: string
  endDate?: string
}

/**
 * 教师API
 */
export const teacherApi = {
  /**
   * 创建教师
   */
  create(data: CreateTeacherDto) {
    return http.post<{ id: string }>('/teacher', data, {
      showLoading: true,
      showError: true,
    })
  },

  /**
   * 获取教师列表
   */
  getList(params: QueryTeacherParams) {
    return http.get<TeacherInfo[]>('/teacher', params)
  },

  /**
   * 获取教师详情
   */
  getDetail(id: string) {
    return http.get<TeacherInfo>(`/teacher/${id}`)
  },

  /**
   * 更新教师
   */
  update(id: string, data: UpdateTeacherDto) {
    return http.put(`/teacher/${id}`, data, {
      showLoading: true,
      showError: true,
    })
  },

  /**
   * 删除教师
   */
  delete(id: string) {
    return http.delete(`/teacher/${id}`, {
      showLoading: true,
      showError: true,
    })
  },

  /**
   * 批量更新排序
   */
  updateSort(items: Array<{ id: string; sort_order: number }>) {
    return http.post('/teacher/sort', { items }, {
      showLoading: true,
      showError: true,
    })
  },

  /**
   * 获取当前教师的授课课程列表
   */
  getMyCourses() {
    return http.get<TeacherCourse[]>('/teacher/my-courses')
  },

  /**
   * 获取当前教师的学员列表
   */
  getMyStudents() {
    return http.get<TeacherStudent[]>('/teacher/my-students')
  },

  /**
   * 获取教师考勤 - 按课程维度汇总
   */
  getMyAttendanceCourses() {
    return http.get<AttendanceCourse[]>('/teacher/my-attendance-courses')
  },

  /**
   * 获取某课程的考勤详情
   */
  getCourseAttendance(courseId: string) {
    return http.get<CourseAttendanceDetail>(`/teacher/course-attendance/${courseId}`)
  },
}

/**
 * 教师授课课程（含排课统计）
 */
export interface TeacherCourse {
  id: string
  institution_id: string
  title: string
  subtitle?: string
  category_code: string
  slider_imgs: string[]
  type: 'standard' | 'trial'
  is_online: boolean
  sales_count: number
  min_age?: number
  max_age?: number
  lesson_duration?: number
  skus?: Array<{ id: string; name: string; total_lessons: number; total_price: number }>
  schedule_count: number
  next_schedule_time: string | null
  total_students: number
  created_at: string
}

/**
 * 教师学员信息
 */
export interface TeacherStudent {
  student_name: string
  student_phone: string
  student_age?: number
  child_id?: string
  booking_count: number
  courses: Array<{ id: string; title: string }>
  latest_booking_time?: string
}

/**
 * 考勤课程汇总（课程维度）
 */
export interface AttendanceCourse {
  id: string
  title: string
  subtitle?: string
  type: 'standard' | 'trial'
  slider_imgs?: string[]
  total_schedules: number
  total_students: number
  total_bookings: number
  total_check_ins: number
  attendance_rate: number
}

/**
 * 课程考勤详情
 */
export interface CourseAttendanceDetail {
  course: {
    id: string
    title: string
    type: string
  } | null
  stats: {
    total_schedules: number
    total_bookings: number
    total_checked_in: number
    attendance_rate: number
  }
  schedules: ScheduleAttendance[]
}

/**
 * 单次排课的考勤
 */
export interface ScheduleAttendance {
  schedule_id: string
  start_time: string
  end_time: string
  day_of_week: string
  status: string
  total_students: number
  checked_count: number
  students: StudentAttendance[]
}

/**
 * 学员签到状态
 */
export interface StudentAttendance {
  booking_id: string
  student_name: string
  student_phone: string
  student_age?: number
  child_id?: string
  checked_in: boolean
  check_in_time: string | null
  is_makeup: boolean
}
