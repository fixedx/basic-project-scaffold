import { get, post } from '@/utils/request'

/**
 * 收藏项接口
 */
export interface Favorite {
  id: string
  user_id: string
  target_type: 'course' | 'institution'
  target_id: string
  created_at: string
}

/**
 * 切换收藏参数
 */
export interface ToggleFavoriteParams {
  target_type: 'course' | 'institution'
  target_id: string
}

/**
 * 收藏 API
 */
export const favoriteApi = {
  /**
   * 切换收藏状态（收藏/取消收藏）
   */
  toggle(data: ToggleFavoriteParams) {
    return post<{ isFavorited: boolean }>('/favorite/toggle', data)
  },

  /**
   * 查询我的收藏列表
   */
  getMyFavorites(params?: {
    target_type?: 'course' | 'institution'
    page?: number
    pageSize?: number
  }) {
    return get<any>('/favorite/my', params)
  },

  /**
   * 检查单个目标的收藏状态
   */
  checkFavorite(targetType: string, targetId: string) {
    return get<{ isFavorited: boolean }>(`/favorite/check/${targetType}/${targetId}`)
  },

  /**
   * 批量检查收藏状态
   */
  checkFavorites(targetType: string, targetIds: string[]) {
    return post<Record<string, boolean>>('/favorite/check-batch', {
      target_type: targetType,
      target_ids: targetIds,
    })
  },

  /**
   * 获取收藏数量
   */
  getCount(targetType?: string) {
    return get<number>('/favorite/count', targetType ? { target_type: targetType } : undefined)
  },
}
