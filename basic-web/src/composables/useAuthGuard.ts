/**
 * 登录状态守卫 composable
 *
 * 用法示例：
 * ```vue
 * <template>
 *   <view v-if="isReady" class="page">
 *     页面内容
 *   </view>
 * </template>
 *
 * <script setup lang="ts">
 * import { useAuthGuard } from '@/composables/useAuthGuard'
 * const { isReady } = useAuthGuard()
 * </script>
 * ```
 *
 * - 检测到 token 存在时，isReady 置为 true，正常展示页面
 * - 检测到 token 不存在时，自动跳转到对应角色的登录页，页面内容不会渲染（避免闪烁）
 */
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getToken } from '@/utils/auth'

/** 根据 userType 获取对应的登录页路径 */
function getLoginPath(userType?: string): string {
  switch (userType) {
    case 'institution':
      return '/pages/institution/login/index'
    case 'teacher':
      return '/pages/teacher/login/index'
    case 'admin':
      return '/pages/admin/login/index'
    default:
      return '/pages/login/index'
  }
}

/**
 * 登录状态守卫
 * @param redirectUserType 指定当前页面所属的用户类型，不传则从 storage 读取
 * @returns { isReady } - 页面是否可以展示（已通过登录检测）
 */
export function useAuthGuard(redirectUserType?: string) {
  const isReady = ref(false)

  const checkAuth = () => {
    const token = getToken()
    if (token) {
      isReady.value = true
    } else {
      isReady.value = false
      const userType = redirectUserType || uni.getStorageSync('userType') || ''
      const loginPath = getLoginPath(userType)

      // 使用 reLaunch 清理页面栈，避免返回到未登录页面
      uni.reLaunch({ url: loginPath })
    }
  }

  // 使用 onShow 而非 onLoad，以便从其他页面返回时也能检测
  onShow(() => {
    checkAuth()
  })

  return { isReady }
}
