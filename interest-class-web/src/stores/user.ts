import { reactive } from 'vue'
import { authApi } from '@/api/auth'
import { setToken, removeToken } from '@/utils/auth'
import type { PhoneLoginParams } from '@/api/auth'

// Simple state management using reactive
// This mimics a Pinia store behavior where state is shared across usages
const state = reactive<{
  token: string | null
  userInfo: any | null
}>({
  token: null,
  userInfo: null
})

export const useUserStore = () => {
  /**
   * Login with phone number (Institution/Teacher)
   */
  const login = async (params: PhoneLoginParams) => {
    try {
      const res = await authApi.phoneLogin(params)
      // Save token to storage and state
      setToken(res.token)
      state.token = res.token
      state.userInfo = res.userInfo
      return res
    } catch (error) {
      throw error
    }
  }

  /**
   * Logout - 清除所有登录状态和角色相关存储
   */
  const logout = () => {
    removeToken()
    state.token = null
    state.userInfo = null
    // 清除角色相关 storage
    uni.removeStorageSync('userType')
    uni.removeStorageSync('institutionId')
    uni.removeStorageSync('teacherId')
  }

  /**
   * Set user info manually
   */
  const setUserInfo = (info: any) => {
    state.userInfo = info
  }

  /**
   * Fetch user info from backend and update state
   */
  const getUserInfo = async () => {
    try {
      const res = await authApi.getUserInfo()
      state.userInfo = res
      return res
    } catch (error) {
      console.error('获取用户信息失败:', error)
      throw error
    }
  }

  return {
    state,
    login,
    logout,
    setUserInfo,
    getUserInfo
  }
}
