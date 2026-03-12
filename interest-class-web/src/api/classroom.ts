import { http } from '@/utils/request'

/**
 * 教室信息接口
 */
export interface ClassroomInfo {
  id: string
  institution_id: string
  name: string
  capacity: number
  area?: number
  floor?: string
  facilities?: string[]
  status: 'available' | 'maintenance' | 'disabled'
  sort_order: number
  description?: string
  created_at: string
  updated_at: string
}

/**
 * 创建教室DTO
 */
export interface CreateClassroomDto {
  institution_id: string
  name: string
  capacity: number
  area?: number
  floor?: string
  facilities?: string[]
  status: 'available' | 'maintenance' | 'disabled'
  sort_order?: number
  description?: string
}

/**
 * 更新教室DTO
 */
export interface UpdateClassroomDto extends Partial<Omit<CreateClassroomDto, 'institution_id'>> {}

/**
 * 查询教室参数
 */
export interface QueryClassroomParams {
  institutionId?: string
  keyword?: string
  status?: 'available' | 'maintenance' | 'disabled'
  page?: number
  pageSize?: number
  /** 时间筛选 */
  period?: string
  startDate?: string
  endDate?: string
}

/**
 * 教室API
 */
export const classroomApi = {
  /**
   * 创建教室
   */
  create(data: CreateClassroomDto) {
    return http.post<{ id: string }>('/classroom', data, {
      showLoading: true,
      showError: true,
    })
  },

  /**
   * 获取教室列表
   */
  getList(params: QueryClassroomParams) {
    return http.get<ClassroomInfo[]>('/classroom', params)
  },

  /**
   * 获取教室详情
   */
  getDetail(id: string) {
    return http.get<ClassroomInfo>(`/classroom/${id}`)
  },

  /**
   * 更新教室
   */
  update(id: string, data: UpdateClassroomDto) {
    return http.put(`/classroom/${id}`, data, {
      showLoading: true,
      showError: true,
    })
  },

  /**
   * 删除教室
   */
  delete(id: string) {
    return http.delete(`/classroom/${id}`, {
      showLoading: true,
      showError: true,
    })
  },

  /**
   * 批量更新排序
   */
  updateSort(items: Array<{ id: string; sort_order: number }>) {
    return http.post('/classroom/sort', { items }, {
      showLoading: true,
      showError: true,
    })
  },
}
