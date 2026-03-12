import { get, post, put, del } from '@/utils/request'

export interface Schedule {
  id: string
  course_id: string
  teacher_id: string
  classroom_id: string
  institution_id: string
  start_time: string
  end_time: string
  day_of_week: string
  booked_count: number
  max_students: number
  status: string
  notes?: string
  course?: any
  teacher?: any
  classroom?: any
  created_at: string
  updated_at: string
}

export interface CreateScheduleDto {
  course_id: string
  teacher_id: string
  classroom_id: string
  start_time: string
  end_time: string
  day_of_week: string
  max_students: number
  notes?: string
}

export interface UpdateScheduleDto extends Partial<CreateScheduleDto> {}

export interface QueryScheduleDto {
  course_id?: string
  teacher_id?: string
  classroom_id?: string
  institution_id?: string
  day_of_week?: string
  start_date?: string
  end_date?: string
  page?: number
  pageSize?: number
}

export interface BatchCreateScheduleDto {
  course_id: string
  teacher_id: string
  classroom_id: string
  start_time: string       // HH:mm 格式
  end_time: string         // HH:mm 格式
  days_of_week: string[]   // ["1","3","5"] 表示周一三五
  start_date: string       // YYYY-MM-DD 格式
  end_date: string         // YYYY-MM-DD 格式
  max_students: number
  notes?: string
}

export interface BatchCreateResult {
  created: number
  skipped: number
  total: number
  conflicts: string[]
}

export interface SchedulePageResult {
  data: Schedule[]
  total: number
  page: number
  pageSize: number
}

export const scheduleApi = {
  /**
   * 创建排课
   */
  create(data: CreateScheduleDto) {
    return post<{ id: string }>('/schedule', data, {
      showLoading: true,
      showError: true
    })
  },

  /**
   * 批量创建排课
   */
  batchCreate(data: BatchCreateScheduleDto) {
    return post<BatchCreateResult>('/schedule/batch', data, {
      showLoading: true,
      showError: true
    })
  },

  /**
   * 获取排课列表
   */
  getList(params?: QueryScheduleDto) {
    return get<SchedulePageResult>('/schedule', params)
  },

  /**
   * 获取排课详情
   */
  getDetail(id: string) {
    return get<Schedule>(`/schedule/${id}`)
  },

  /**
   * 获取指定课程的排课列表
   */
  getByCourse(courseId: string) {
    return get<Schedule[]>(`/schedule/course/${courseId}`)
  },

  /**
   * 更新排课
   */
  update(id: string, data: UpdateScheduleDto) {
    return put<{ message: string }>(`/schedule/${id}`, data, {
      showLoading: true,
      showError: true
    })
  },

  /**
   * 删除排课
   */
  delete(id: string) {
    return del<{ message: string }>(`/schedule/${id}`, {
      showLoading: true,
      showError: true
    })
  }
}
