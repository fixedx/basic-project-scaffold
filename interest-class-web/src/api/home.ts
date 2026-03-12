import { get } from '@/utils/request'
import type { Banner } from './banner'
import type { Course } from './course'
import type { Institution } from './institution'

/**
 * 首页数据接口类型
 */
export interface HomeData {
  banners: Banner[]
  courses: {
    data: Course[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
  institutions: {
    data: Institution[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

export interface GetHomeDataParams {
  page?: number
  pageSize?: number
  province?: string
  city?: string
  district?: string
  /** 用户纬度（用于计算距离） */
  latitude?: number
  /** 用户经度（用于计算距离） */
  longitude?: number
}

/**
 * 首页 API
 */
export const homeApi = {
  /**
   * 获取首页数据（Banner、推荐课程、推荐机构）
   */
  getData(params?: GetHomeDataParams) {
    return get<HomeData>('/home/data', params)
  },

  /**
   * 获取首页 Banner 列表
   */
  getBanners(params?: { province?: string; city?: string }) {
    return get<Banner[]>('/home/banners', params)
  },

  /**
   * 获取推荐课程
   */
  getRecommendedCourses(params?: {
    page?: number
    pageSize?: number
    province?: string
    city?: string
    latitude?: number
    longitude?: number
  }) {
    return get<{
      data: Course[]
      total: number
      page: number
      pageSize: number
      totalPages: number
    }>('/home/recommended-courses', params)
  },

  /**
   * 获取推荐机构
   */
  getRecommendedInstitutions(params?: {
    page?: number
    pageSize?: number
    province?: string
    city?: string
    latitude?: number
    longitude?: number
  }) {
    return get<{
      data: Institution[]
      total: number
      page: number
      pageSize: number
      totalPages: number
    }>('/home/recommended-institutions', params)
  },

  /**
   * 获取应用配置
   * 返回当前环境配置，用于判断是否为开发模式
   */
  getConfig() {
    return get<{
      env: string
      isDevelopment: boolean
    }>('/home/config')
  },

  /**
   * 根据经纬度获取城市名称（反向地理编码）
   */
  getCityByLocation(params: { latitude: number; longitude: number }) {
    return get<{ city: string }>('/home/geocode/city', params)
  },
}
