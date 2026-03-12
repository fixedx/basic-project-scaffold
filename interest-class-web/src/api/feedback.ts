import { get, post, put, del } from '@/utils/request'

/**
 * 反馈信息接口
 */
export interface Feedback {
  id: string
  content: string
  type: string
  status: string
  contact?: string
  page_source?: string
  reply?: string
  replied_at?: string
  replied_by?: string
  user_nickname?: string
  user_phone?: string
  created_by?: string
  created_at: string
  updated_at: string
}

/**
 * 创建反馈参数
 */
export interface CreateFeedbackParams {
  content: string
  type?: 'suggestion' | 'bug' | 'other'
  contact?: string
  page_source?: string
}

/**
 * 回复反馈参数
 */
export interface ReplyFeedbackParams {
  reply?: string
  status?: 'pending' | 'processing' | 'resolved' | 'closed'
}

/**
 * 反馈分页结果
 */
export interface FeedbackPageResult {
  data: Feedback[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * 反馈统计
 */
export interface FeedbackStats {
  pending: number
  processing: number
  resolved: number
  closed: number
  total: number
}

/**
 * 反馈 API
 */
export const feedbackApi = {
  /** 提交反馈 */
  create(data: CreateFeedbackParams) {
    return post<string>('/feedback', data)
  },

  /** 获取我的反馈列表 */
  getMyList() {
    return get<Feedback[]>('/feedback/my')
  },

  /** 获取所有反馈列表（管理员） */
  getList(params?: { page?: number; pageSize?: number; status?: string; type?: string }) {
    return get<FeedbackPageResult>('/feedback', params)
  },

  /** 获取反馈统计（管理员） */
  getStats() {
    return get<FeedbackStats>('/feedback/stats')
  },

  /** 获取反馈详情 */
  getDetail(id: string) {
    return get<Feedback>(`/feedback/${id}`)
  },

  /** 回复/更新反馈状态（管理员） */
  reply(id: string, data: ReplyFeedbackParams) {
    return put<boolean>(`/feedback/${id}/reply`, data)
  },

  /** 删除反馈（管理员） */
  remove(id: string) {
    return del<boolean>(`/feedback/${id}`)
  },
}
