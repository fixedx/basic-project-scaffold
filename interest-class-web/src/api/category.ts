import { get, post, del } from '@/utils/request'

// 类目相关接口

/**
 * 获取所有类目（扁平列表）
 */
export const getCategoryList = (tree?: boolean) => {
  return get(`/categories${tree ? '?tree=true' : ''}`)
}

/**
 * 获取一级类目
 */
export const getTopCategories = () => {
  return get('/categories/top')
}

/**
 * 获取子类目
 */
export const getCategoryChildren = (parentId: string) => {
  return get(`/categories/${parentId}/children`)
}

/**
 * 创建类目
 */
export const createCategory = (data: {
  name: string
  parent_id?: string
  sort_order?: number
  icon?: string
  description?: string
}) => {
  return post('/categories', data)
}

/**
 * 删除类目
 */
export const deleteCategory = (id: string) => {
  return del(`/categories/${id}`)
}

// 用户机构相关接口

/**
 * 获取当前用户的机构列表
 */
export const getMyInstitutions = () => {
  return get('/auth/my-institutions')
}
