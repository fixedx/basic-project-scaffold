import { get, post, put, del } from '@/utils/request'

/**
 * 宝贝信息接口
 */
export interface Child {
  id: string
  user_id: string
  name: string
  avatar?: string
  gender?: 'male' | 'female'
  birthday?: string
  age?: number
  phone?: string
  interests?: string[]
  remark?: string
  sort_order: number
  created_at: string
  updated_at: string
}

/**
 * 创建宝贝参数
 */
export interface CreateChildParams {
  name: string
  avatar?: string
  gender?: 'male' | 'female'
  birthday?: string
  age?: number
  phone?: string
  interests?: string[]
  remark?: string
}

/**
 * 更新宝贝参数
 */
export interface UpdateChildParams {
  name?: string
  avatar?: string
  gender?: 'male' | 'female'
  birthday?: string
  age?: number
  phone?: string
  interests?: string[]
  remark?: string
  sort_order?: number
}

/**
 * 宝贝API
 */
export const childApi = {
  /**
   * 创建宝贝
   */
  create(data: CreateChildParams) {
    return post<string>('/child', data)
  },

  /**
   * 获取我的宝贝列表
   */
  getMyList() {
    return get<Child[]>('/child/my')
  },

  /**
   * 获取宝贝详情
   */
  getDetail(id: string) {
    return get<Child>(`/child/${id}`)
  },

  /**
   * 更新宝贝
   */
  update(id: string, data: UpdateChildParams) {
    return put<boolean>(`/child/${id}`, data)
  },

  /**
   * 删除宝贝
   */
  delete(id: string) {
    return del<boolean>(`/child/${id}`)
  },

  /**
   * 批量更新排序
   */
  updateSort(ids: string[]) {
    return post<boolean>('/child/sort', { ids })
  },
}
