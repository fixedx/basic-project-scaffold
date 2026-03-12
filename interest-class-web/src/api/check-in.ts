import { get, post } from '@/utils/request'

/**
 * 签到记录类型
 */
export interface CheckInRecord {
  id: string
  order_id: string
  user_id: string
  institution_id: string
  course_id: string
  booking_id?: string
  schedule_id?: string
  child_id?: string
  check_in_time: string
  is_makeup: boolean
  makeup_date?: string
  lesson_no: number
  latitude?: number
  longitude?: number
  remark?: string
  created_at: string
}

/**
 * 签到状态类型（订单课时进度）
 */
export interface CheckInStatus {
  completed_lessons: number
  total_lessons: number
  progress_percent: number
  records: CheckInRecord[]
}

/**
 * 签到结果类型
 */
export interface CheckInResult {
  id: string
  lesson_no: number
  completed_lessons: number
  total_lessons: number
}

/**
 * 签到 DTO
 */
export interface CheckInDto {
  order_id: string
  booking_id?: string
  schedule_id?: string
  latitude?: number
  longitude?: number
  remark?: string
}

/**
 * 补卡 DTO
 */
export interface MakeupCheckInDto {
  order_id: string
  makeup_date: string  // YYYY-MM-DD
  remark?: string
}

/**
 * 签到相关 API
 */
export const checkInApi = {
  /**
   * 签到
   */
  checkIn(data: CheckInDto) {
    return post<CheckInResult>('/check-in', data)
  },

  /**
   * 补卡
   */
  makeupCheckIn(data: MakeupCheckInDto) {
    return post<CheckInResult>('/check-in/makeup', data)
  },

  /**
   * 获取签到记录
   */
  getRecords(params?: { order_id?: string; page?: number; pageSize?: number }) {
    return get<CheckInRecord[]>('/check-in', params)
  },

  /**
   * 获取订单签到状态
   */
  getOrderStatus(orderId: string) {
    return get<CheckInStatus>(`/check-in/order/${orderId}`)
  },

  /**
   * 批量获取预约的签到状态
   * @param bookingIds 预约ID数组
   * @returns { [bookingId]: hasCheckedIn }
   */
  batchGetBookingStatus(bookingIds: string[]) {
    return get<Record<string, boolean>>('/check-in/booking-status', {
      bookingIds: bookingIds.join(',')
    })
  },
}
