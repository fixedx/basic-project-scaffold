import { get, post, put, del } from '@/utils/request'

/**
 * 预约信息接口
 */
export interface Booking {
  id: string
  user_id: string
  institution_id: string
  course_id: string
  sku_id?: string
  schedule_id?: string
  order_id?: string
  child_id?: string
  student_name: string
  student_phone: string
  student_age?: number
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed' | 'pending_change' | 'pending_cancel'
  pending_change_schedule_id?: string
  start_time?: string
  end_time?: string
  day_of_week?: string
  teacher_name?: string
  classroom_name?: string
  booking_time?: string
  remark?: string
  reason?: string
  confirmed_at?: string
  rejected_at?: string
  cancelled_at?: string
  completed_at?: string
  created_at: string
  updated_at: string
}

/**
 * 创建预约参数
 */
export interface CreateBookingParams {
  course_id: string
  sku_id?: string
  schedule_id?: string
  child_id?: string
  student_name: string
  student_phone?: string
  student_age?: number
  booking_time?: string
  remark?: string
}

/**
 * 更新预约状态参数
 */
export interface UpdateBookingStatusParams {
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed'
  reason?: string
}

/**
 * 预约API
 */
export const bookingApi = {
  /**
   * 创建预约
   */
  create(data: CreateBookingParams) {
    return post<{ id: string }>('/booking', data)
  },

  /**
   * 查询我的预约列表
   */
  getMyList(params?: { page?: number; pageSize?: number; status?: string }) {
    return get<{
      data: Booking[]
      total: number
      page: number
      pageSize: number
      totalPages: number
    }>('/booking/my', params)
  },

  /**
   * 查询机构预约列表
   */
  getInstitutionList(
    institutionId: string,
    params?: { page?: number; pageSize?: number; status?: string }
  ) {
    return get<{
      data: Booking[]
      total: number
      page: number
      pageSize: number
      totalPages: number
    }>(`/booking/institution/${institutionId}`, params)
  },

  /**
   * 查询课程预约列表
   */
  getCourseList(
    courseId: string,
    params?: { page?: number; pageSize?: number }
  ) {
    return get<{
      data: Booking[]
      total: number
      page: number
      pageSize: number
      totalPages: number
    }>(`/booking/course/${courseId}`, params)
  },

  /**
   * 查询预约详情
   */
  getDetail(id: string) {
    return get<Booking>(`/booking/${id}`)
  },

  /**
   * 更新预约状态（机构端）
   */
  updateStatus(id: string, data: UpdateBookingStatusParams) {
    return put(`/booking/${id}/status`, data)
  },

  /**
   * 取消预约（用户端）
   */
  cancel(id: string, reason?: string) {
    return put(`/booking/${id}/cancel`, { reason })
  },

  /**
   * 修改预约排课（用户端）
   * 距离上课时间不足24小时需要机构审核
   */
  changeSchedule(id: string, newScheduleId: string) {
    return put<{ success: boolean; needsApproval: boolean }>(
      `/booking/${id}/change-schedule`,
      { new_schedule_id: newScheduleId }
    )
  },

  /**
   * 审核取消预约请求（机构端）
   */
  reviewCancel(
    id: string,
    action: 'approve' | 'reject',
    reason?: string
  ) {
    return put(`/booking/${id}/review-cancel`, { action, reason })
  },

  /**
   * 审核修改预约请求（机构端）
   */
  reviewChangeSchedule(
    id: string,
    action: 'approve' | 'reject',
    reason?: string
  ) {
    return put(`/booking/${id}/review-change`, { action, reason })
  },

  /**
   * 删除预约
   */
  delete(id: string) {
    return del(`/booking/${id}`)
  },
}
