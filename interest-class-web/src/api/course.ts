import { http } from '@/utils/request'

/**
 * 课程SKU接口
 */
export interface CourseSku {
  id?: string
  name: string
  type?: 'standard' | 'trial'
  total_lessons: number
  total_price: number
  cashback_type: 'percentage' | 'fixed' | 'none'
  cashback_value: number
  online_pay_price?: number
  offline_pay_price?: number
  stock?: number
  validity_days?: number
  is_refundable?: boolean
}

/**
 * 课程信息接口
 */
export interface Course {
  id: string
  institution_id: string
  title: string
  subtitle?: string
  category_code: string
  slider_imgs: string[]
  tags?: string[]
  description?: string
  min_age?: number
  max_age?: number
  lesson_duration?: number
  type: 'standard' | 'trial'
  is_online: boolean
  sales_count: number
  sort_order: number
  status?: string
  skus?: CourseSku[]
  /** 返现比例 */
  cashback_ratio?: number
  /** 是否开启返现 */
  cashback_enabled?: boolean
  /** 最高立减金额 = 最高返现 × 最高让利比例 */
  max_discount_amount?: number
  /** 最高返现金额 = 最高SKU价格 × 返现比例 */
  max_cashback_amount?: number
  /** 最高让利比例 */
  max_share_ratio?: number
  institution?: {
    id: string
    name: string
    logo?: string
    address?: string
    province?: string
    city?: string
    district?: string
    contact_phone?: string
  }
  /** 距离（米） */
  distance?: number | null
  teachers?: Array<{
    id: string
    name: string
    photo?: string
    title?: string
    subjects?: string[]
  }>
  created_at: string
  updated_at: string
}

/**
 * 课程信息接口（旧版本兼容）
 */
export interface CourseInfo extends Course {}

/**
 * 创建课程DTO
 */
export interface CreateCourseDto {
  institution_id: string
  title: string
  subtitle?: string
  category_code: string
  slider_imgs?: string[]
  tags?: string[]
  description?: string
  min_age?: number
  max_age?: number
  lesson_duration?: number
  type: 'standard' | 'trial'
  skus: CourseSku[]
}

/**
 * 更新课程DTO
 */
export interface UpdateCourseDto extends Partial<CreateCourseDto> {}

/**
 * 查询课程参数
 */
export interface QueryCourseParams {
  institutionId?: string
  type?: string
  is_online?: boolean
  keyword?: string
  category_code?: string
  sort?: string
  min_price?: number
  max_price?: number
  page?: number
  pageSize?: number
  /** 用户纬度（用于计算距离） */
  latitude?: number
  /** 用户经度（用于计算距离） */
  longitude?: number
  /** 时间筛选 */
  period?: string
  startDate?: string
  endDate?: string
}

/**
 * 分页结果
 */
export interface PageResult<T> {
  data: T[]
  total: number
}

/**
 * 课程API
 */
export const courseApi = {
  /**
   * 创建课程
   */
  create(data: CreateCourseDto) {
    return http.post<{ id: string }>('/courses', data, {
      showLoading: true,
      showError: true,
    })
  },

  /**
   * 获取课程列表
   */
  getList(params?: QueryCourseParams) {
    return http.get<PageResult<CourseInfo> | CourseInfo[]>('/courses', params)
  },

  /**
   * 获取课程详情
   */
  getDetail(id: string) {
    return http.get<CourseInfo>(`/courses/${id}`)
  },

  /**
   * 更新课程
   */
  update(id: string, data: UpdateCourseDto) {
    return http.put(`/courses/${id}`, data, {
      showLoading: true,
      showError: true,
    })
  },

  /**
   * 删除课程
   */
  delete(id: string) {
    return http.delete(`/courses/${id}`, undefined, {
      showLoading: true,
      showError: true,
    })
  },

  /**
   * 上架课程
   */
  online(id: string) {
    return http.put(`/courses/${id}/online`, undefined, {
      showLoading: true,
      showError: true,
    })
  },

  /**
   * 下架课程
   */
  offline(id: string) {
    return http.put(`/courses/${id}/offline`, undefined, {
      showLoading: true,
      showError: true,
    })
  },
}
