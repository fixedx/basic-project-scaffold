import { get, post, put, del } from '@/utils/request'

/**
 * Banner 接口类型定义
 */
export interface Banner {
  id: string
  title: string
  image: string
  link_type: string
  link_target?: string
  sort: number
  institution_id: string
  status: string
  start_time?: string
  end_time?: string
  created_at: string
  updated_at: string
}

export interface CreateBannerParams {
  title: string
  image: string
  link_type: string
  link_target?: string
  sort?: number
  status?: string
  start_time?: string
  end_time?: string
}

export interface UpdateBannerParams {
  title?: string
  image?: string
  link_type?: string
  link_target?: string
  sort?: number
  status?: string
  start_time?: string
  end_time?: string
}

export interface SortBannerParams {
  items: Array<{ id: string; sort: number }>
}

/**
 * Banner API
 */
export const bannerApi = {
  /**
   * 创建 Banner
   */
  create(data: CreateBannerParams) {
    return post<{ id: string }>('/banner', data, {
      showLoading: true,
      showError: true,
    })
  },

  /**
   * 获取 Banner 列表
   */
  getList(params?: { institutionId?: string; status?: string }) {
    return get<Banner[]>('/banner', params)
  },

  /**
   * 获取 Banner 详情
   */
  getDetail(id: string) {
    return get<Banner>(`/banner/${id}`)
  },

  /**
   * 更新 Banner
   */
  update(id: string, data: UpdateBannerParams) {
    return put(`/banner/${id}`, data, {
      showLoading: true,
      showError: true,
    })
  },

  /**
   * 删除 Banner
   */
  delete(id: string) {
    return del(`/banner/${id}`, undefined, {
      showLoading: true,
      showError: true,
    })
  },

  /**
   * 批量更新排序
   */
  updateSort(data: SortBannerParams) {
    return post('/banner/sort', data, {
      showLoading: true,
      showError: true,
    })
  },
}
