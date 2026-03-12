import { get, post, put, del } from '@/utils/request'

/**
 * 公告接口类型定义
 */
export interface Announcement {
  id: string
  title: string
  content: string
  type: string
  status: string
  priority: number
  start_time?: string
  end_time?: string
  created_at: string
  updated_at: string
}

export interface CreateAnnouncementParams {
  title: string
  content: string
  type?: string
  status?: string
  priority?: number
  start_time?: string
  end_time?: string
}

export interface UpdateAnnouncementParams {
  title?: string
  content?: string
  type?: string
  status?: string
  priority?: number
  start_time?: string
  end_time?: string
}

/**
 * 公告 API
 */
export const announcementApi = {
  /**
   * 创建公告
   */
  create(data: CreateAnnouncementParams) {
    return post<string>('/announcement', data, {
      showLoading: true,
      showError: true,
    })
  },

  /**
   * 获取公告列表
   */
  getList(params?: { status?: string; type?: string }) {
    return get<Announcement[]>('/announcement', params)
  },

  /**
   * 获取当前生效的公告（首页用）
   */
  getActive() {
    return get<Announcement[]>('/announcement/active')
  },

  /**
   * 获取公告详情
   */
  getDetail(id: string) {
    return get<Announcement>(`/announcement/${id}`)
  },

  /**
   * 更新公告
   */
  update(id: string, data: UpdateAnnouncementParams) {
    return put(`/announcement/${id}`, data, {
      showLoading: true,
      showError: true,
    })
  },

  /**
   * 删除公告
   */
  delete(id: string) {
    return del(`/announcement/${id}`, undefined, {
      showLoading: true,
      showError: true,
    })
  },
}
