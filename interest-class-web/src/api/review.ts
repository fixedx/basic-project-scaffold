import { get, post, put, del } from '@/utils/request'

/**
 * 评价信息接口
 */
export interface Review {
  id: string
  user_id: string
  institution_id: string
  course_id: string
  order_id?: string
  rating: number
  content: string
  images?: string[]
  reply?: string
  replied_at?: string
  is_visible: boolean
  created_at: string
  updated_at: string
}

/**
 * 创建评价参数
 */
export interface CreateReviewParams {
  course_id: string
  order_id?: string
  rating: number
  content: string
  images?: string[]
}

/**
 * 回复评价参数
 */
export interface ReplyReviewParams {
  reply: string
}

/**
 * 评价API
 */
export const reviewApi = {
  /**
   * 创建评价
   */
  create(data: CreateReviewParams) {
    return post<{ id: string }>('/review', data)
  },

  /**
   * 查询我的评价列表
   */
  getMyList(params?: { page?: number; pageSize?: number }) {
    return get<{
      data: Review[]
      total: number
      page: number
      pageSize: number
      totalPages: number
    }>('/review/my', params)
  },

  /**
   * 查询课程评价列表
   * @param sortBy 排序方式：'rating_desc'(评分降序) | 'created_at_desc'(时间降序)
   */
  getCourseList(
    courseId: string,
    params?: { page?: number; pageSize?: number; sort_by?: 'rating_desc' | 'created_at_desc' }
  ) {
    return get<{
      data: Review[]
      total: number
      page: number
      pageSize: number
      totalPages: number
    }>(`/review/course/${courseId}`, params)
  },

  /**
   * 查询课程高分评价（按评分降序，取前N条）
   */
  getCourseTopReviews(courseId: string, limit = 5) {
    return get<{
      data: Review[]
      total: number
      page: number
      pageSize: number
      totalPages: number
    }>(`/review/course/${courseId}`, { page: 1, pageSize: limit, sort_by: 'rating_desc' })
  },

  /**
   * 查询课程平均评分
   */
  getAverageRating(courseId: string) {
    return get<{ average: number }>(`/review/course/${courseId}/average`)
  },

  /**
   * 查询机构评价列表
   * @param sortBy 排序方式：'rating_desc'(评分降序) | 'created_at_desc'(时间降序)
   */
  getInstitutionList(
    institutionId: string,
    params?: { page?: number; pageSize?: number; sort_by?: 'rating_desc' | 'created_at_desc' }
  ) {
    return get<{
      data: Review[]
      total: number
      page: number
      pageSize: number
      totalPages: number
    }>(`/review/institution/${institutionId}`, params)
  },

  /**
   * 查询机构高分评价（按评分降序，取前N条）
   */
  getInstitutionTopReviews(institutionId: string, limit = 5) {
    return get<{
      data: Review[]
      total: number
      page: number
      pageSize: number
      totalPages: number
    }>(`/review/institution/${institutionId}`, { page: 1, pageSize: limit, sort_by: 'rating_desc' })
  },

  /**
   * 查询评价详情
   */
  getDetail(id: string) {
    return get<Review>(`/review/${id}`)
  },

  /**
   * 回复评价（机构端）
   */
  reply(id: string, data: ReplyReviewParams) {
    return put(`/review/${id}/reply`, data)
  },

  /**
   * 修改回复内容（机构端，首次回复 24 小时内可修改）
   */
  updateReply(id: string, data: ReplyReviewParams) {
    return put(`/review/${id}/reply/update`, data)
  },

  /**
   * 隐藏/显示评价
   */
  toggleVisibility(id: string) {
    return put(`/review/${id}/toggle-visibility`)
  },

  /**
   * 删除评价
   */
  delete(id: string) {
    return del(`/review/${id}`)
  },
}
