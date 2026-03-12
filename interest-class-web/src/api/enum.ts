import { get, post, del } from '@/utils/request'

/**
 * 枚举项接口
 */
export interface EnumItem {
  id: string
  type: string
  code: string
  label: string
  description?: string
  sort_order: number
  icon?: string
  extra?: Record<string, any>
}

/**
 * 枚举数据（按类型分组）
 */
export type EnumData = Record<string, EnumItem[]>

/**
 * 获取所有枚举（按类型分组）
 */
export const getAllEnums = () => {
  return get<EnumData>('/enums')
}

/**
 * 获取指定类型的枚举
 */
export const getEnumsByTypes = (types: string[]) => {
  return get<EnumData>(`/enums?types=${types.join(',')}`)
}

/**
 * 获取单个类型的枚举
 */
export const getEnumsByType = (type: string) => {
  return get<EnumItem[]>(`/enums/${type}`)
}

/**
 * 创建枚举
 */
export const createEnum = (data: {
  type: string
  code: string
  label: string
  description?: string
  sort_order?: number
  icon?: string
  extra?: Record<string, any>
}) => {
  return post('/enums', data)
}

/**
 * 初始化默认枚举数据
 */
export const initDefaultEnums = () => {
  return post('/enums/init')
}

/**
 * 删除枚举
 */
export const deleteEnum = (id: string) => {
  return del(`/enums/${id}`)
}

// 枚举类型常量
export const ENUM_TYPES = {
  COURSE_TYPE: 'course_type',
  COURSE_CATEGORY: 'course_category',
  COURSE_TAG: 'course_tag',
  INSTITUTION_CATEGORY: 'institution_category',
  INSTITUTION_TAG: 'institution_tag',
  AUDIT_STATUS: 'audit_status',
  CASHBACK_TYPE: 'cashback_type',
  INSTITUTION_STATUS: 'institution_status',
  COURSE_STATUS: 'course_status',
} as const
