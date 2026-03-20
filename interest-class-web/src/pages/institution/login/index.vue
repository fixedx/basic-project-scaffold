<template>
  <AuthLoginLayout
    title="机构登录"
    subtitle="授权手机号后快速进入机构工作台"
    role-label="Institution Portal"
    :links="entryLinks"
    footer-text="取消登录，返回首页"
  >
    <!-- #ifdef MP-WEIXIN -->
    <wd-button
      type="primary"
      block
      open-type="getPhoneNumber"
      custom-class="login-primary-btn"
      :loading="loading"
      @getphonenumber="handleGetPhoneNumber"
    >
      <view class="login-primary-btn__content">
        <text class="iconfont icon-phone-fill"></text>
        <text>微信手机号一键登录</text>
      </view>
    </wd-button>
    <!-- #endif -->

    <!-- #ifndef MP-WEIXIN -->
    <view class="login-tip-card">
      <text class="iconfont icon-info-fill"></text>
      <text>机构端手机号授权登录仅支持微信小程序环境。</text>
    </view>
    <!-- #endif -->
  </AuthLoginLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { authApi } from '@/api/auth'
import { setToken } from '@/utils/request'
import { useUserStore } from '@/stores/user'
import AuthLoginLayout from '@/components/AuthLoginLayout/index.vue'

const loading = ref(false)

const entryLinks = [
  { label: '家长登录', path: '/pages/login/index', icon: 'icon-customer-fill' },
  { label: '教师登录', path: '/pages/teacher/login/index', icon: 'icon-teaching' },
  { label: '机构入驻', path: '/pages/institution/settle/index', icon: 'icon-add', navigate: true },
  { label: '管理员', path: '/pages/admin/login/index', icon: 'icon-settings-fill' },
]

const onLoginSuccess = (res: any) => {
  const userStore = useUserStore()
  setToken(res.token)
  userStore.setUserInfo(res.userInfo)

  uni.setStorageSync('userType', 'institution')
  if (res.userInfo.institutionId) {
    uni.setStorageSync('institutionId', res.userInfo.institutionId)
  }

  uni.showToast({ title: '登录成功', icon: 'success' })
  setTimeout(() => {
    uni.reLaunch({ url: '/pages/institution/center/index' })
  }, 500)
}

const handleGetPhoneNumber = async (event: any) => {
  const detail = event?.detail || event || {}
  const errMsg = detail.errMsg || ''
  const code = detail.code

  if (!code && !errMsg.includes('ok')) {
    uni.showToast({ title: '您取消了授权', icon: 'none' })
    return
  }

  try {
    loading.value = true
    const res = await authApi.phoneLogin({
      code: code || 'mock_code',
      type: 'institution',
    })
    onLoginSuccess(res)
  } catch (error: any) {
    uni.showToast({ title: error?.message || '登录失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
:deep(.login-primary-btn) {
  height: 96rpx !important;
  border: none !important;
  border-radius: 24rpx !important;
  background: linear-gradient(135deg, $uni-color-primary 0%, $uni-color-primary-dark 100%) !important;
  box-shadow: 0 16rpx 36rpx rgba(82, 196, 26, 0.22) !important;
}

.login-primary-btn__content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  font-size: 30rpx;
  font-weight: 600;

  .iconfont {
    font-size: 32rpx;
  }
}

.login-tip-card {
  display: flex;
  align-items: flex-start;
  gap: 14rpx;
  padding: 28rpx 24rpx;
  border-radius: 24rpx;
  background: #f6fff0;
  color: #5b7a4c;
  font-size: 24rpx;
  line-height: 1.7;

  .iconfont {
    font-size: 28rpx;
    color: $uni-color-primary;
    margin-top: 2rpx;
  }
}
</style>