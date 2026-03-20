<template>
  <AuthLoginLayout
    title="家长登录"
    v-model:is-agreed="isAgreed"
    :links="entryLinks"
    footer-text="暂不登录，返回首页"
  >
    <!-- #ifdef MP-WEIXIN -->
    <wd-button
      type="primary"
      block
      custom-class="login-primary-btn"
      :loading="wechatLoading"
      @click="handleWechatLogin"
    >
      <view class="login-primary-btn__content">
        <text class="iconfont icon-wechat"></text>
        <text>微信一键登录</text>
      </view>
    </wd-button>
    <!-- #endif -->

    <!-- #ifndef MP-WEIXIN -->
    <view class="login-tip-card">
      <text class="iconfont icon-info-fill"></text>
      <text>家长端目前仅支持微信小程序一键登录，请在微信内打开。</text>
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

const wechatLoading = ref(false)
const isAgreed = ref(false)

const entryLinks = [
  { label: '机构登录', path: '/pages/institution/login/index', icon: 'icon-store-fill' },
  { label: '教师登录', path: '/pages/teacher/login/index', icon: 'icon-teaching' },
  { label: '机构入驻', path: '/pages/institution/settle/index', icon: 'icon-add', navigate: true },
  { label: '管理员', path: '/pages/admin/login/index', icon: 'icon-settings-fill' },
]

const handleWechatLogin = async () => {
  if (!isAgreed.value) {
    uni.showToast({ title: '请先阅读并同意用户协议', icon: 'none' })
    return
  }
  try {
    wechatLoading.value = true
    // #ifdef MP-WEIXIN
    const { code } = await uni.login({ provider: 'weixin' })
    const res = await authApi.wechatLogin({ code })
    const userStore = useUserStore()

    setToken(res.token)
    userStore.setUserInfo(res.userInfo)
    uni.setStorageSync('userType', '')

    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => {
      uni.switchTab({ url: '/pages/index/index' })
    }, 500)
    // #endif
  } catch (error: any) {
    uni.showToast({ title: error?.message || '登录失败', icon: 'none' })
  } finally {
    wechatLoading.value = false
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
    font-size: 34rpx;
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