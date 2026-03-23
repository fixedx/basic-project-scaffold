import { reactive } from 'vue'
import { setToken, removeToken, getToken } from '@/utils/auth'

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
   * Initialize token from storage
   */
  const initToken = () => {
    const token = getToken()
    if (token) {
      state.token = token
    }
  }

  /**
   * Login method - to be implemented
   */
  const login = async (params: any) => {
    // TODO: Implement login logic
    // 1. Call API
    // 2. Save token
    // 3. Update state
    throw new Error('Login not implemented')
  }

  /**
   * Logout - 清除所有登录状态
   */
  const logout = () => {
    removeToken()
    state.token = null
    state.userInfo = null
    // TODO: Clear other role-related storage
  }

  /**
   * Set user info manually
   */
  const setUserInfo = (info: any) => {
    state.userInfo = info
  }

  /**
   * Fetch user info from backend - to be implemented
   */
  const getUserInfo = async () => {
    // TODO: Implement getUserInfo API call
    throw new Error('getUserInfo not implemented')
  }

  return {
    state,
    initToken,
    login,
    logout,
    setUserInfo,
    getUserInfo
  }
}