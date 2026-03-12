import { http } from '@/utils/request'

/**
 * 微信登录参数
 */
export interface WechatLoginParams {
  code: string
  nickname?: string
  avatar?: string
  gender?: string
  country?: string
  province?: string
  city?: string
}

/**
 * 管理员登录参数
 */
export interface AdminLoginParams {
  username: string
  password: string
}

/**
 * 机构登录参数
 */
export interface InstitutionLoginParams {
  username: string
  password: string
}

/**
 * 手机号登录参数（机构/教师）
 */
export interface PhoneLoginParams {
  code: string  // 微信手机号授权码
  type: 'institution' | 'teacher'  // 登录类型
}

/**
 * 家长手机号登录参数
 */
export interface ParentPhoneLoginParams {
  phone: string
}

/**
 * 登录响应数据
 */
export interface LoginResponse {
  token: string
  userInfo: {
    id: string
    openid: string
    nickname: string
    avatar?: string
    institutionId?: string  // 机构ID（机构登录时返回）
    teacherId?: string      // 教师ID（教师登录时返回）
  }
}

/**
 * 用户信息
 */
export interface UserInfo {
  id: string
  openid: string
  nickname: string
  avatar?: string
  gender?: string
  phone?: string
  country?: string
  province?: string
  city?: string
  isActive: boolean
  createdAt: string
}

/**
 * 更新用户资料参数
 */
export interface UpdateProfileParams {
  nickname?: string
  avatar?: string
  gender?: string
}

/**
 * 认证相关 API
 */
export const authApi = {
  /**
   * 微信小程序登录
   */
  wechatLogin(params: WechatLoginParams) {
    return http.post<LoginResponse>('/auth/wechat-login', params)
  },

  /**
   * 管理员登录
   */
  adminLogin(params: AdminLoginParams) {
    return http.post<LoginResponse>('/auth/admin-login', params)
  },

  /**
   * 机构登录
   */
  institutionLogin(params: InstitutionLoginParams) {
    return http.post<LoginResponse>('/auth/institution-login', params)
  },

  /**
   * 手机号登录（机构/教师）
   */
  phoneLogin(params: PhoneLoginParams) {
    return http.post<LoginResponse>('/auth/phone-login', params)
  },

  /**
   * 家长手机号登录
   */
  parentPhoneLogin(params: ParentPhoneLoginParams) {
    return http.post<LoginResponse>('/auth/parent-phone-login', params)
  },

  /**
   * 获取当前用户信息
   */
  getUserInfo() {
    return http.get<UserInfo>('/auth/user-info')
  },

  /**
   * 更新用户资料
   */
  updateProfile(params: UpdateProfileParams) {
    return http.put<boolean>('/auth/profile', params)
  }
}
