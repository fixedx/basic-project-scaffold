<template>
  <view class="login-page">
    <!-- 顶部装饰 -->
    <view class="top-decoration">
      <view class="circle circle-1"></view>
      <view class="circle circle-2"></view>
      <view class="circle circle-3"></view>
    </view>

    <!-- Logo 和标题 -->
    <view class="logo-section">
      <view class="logo">
        <text class="logo-icon">👨‍🏫</text>
      </view>
      <text class="app-name">教师登录</text>
      <text class="app-slogan">便捷教学，高效管理</text>
    </view>

    <!-- 登录按钮 -->
    <view class="login-section">
      <wd-button
        type="primary"
        block
        round
        :loading="loading"
        open-type="getPhoneNumber"
        class="login-button"
        @getphonenumber="handleGetPhoneNumber"
      >
        <view class="button-content">
          <text class="btn-icon">📱</text>
          <text>微信手机号一键登录</text>
        </view>
      </wd-button>

      <!-- 协议提示 -->
      <view class="tips">
        <text class="tips-text">登录即表示同意</text>
        <text class="tips-link" @click.stop="goTo('/pages/agreement/index', true)">《用户协议》</text>
        <text class="tips-text">和</text>
        <text class="tips-link" @click.stop="goTo('/pages/privacy/index', true)">《隐私政策》</text>
      </view>
    </view>

    <!-- 其他登录入口 -->
    <view class="other-login">
      <view class="login-link" @click="goTo('/pages/login/index')">
        <view class="link-icon-wrapper">
          <text class="iconfont icon-customer" style="font-size: 48rpx;"></text>
        </view>
        <text class="link-text">家长登录</text>
      </view>

      <view class="login-link" @click="goTo('/pages/institution/login/index')">
        <view class="link-icon-wrapper">
          <text class="iconfont icon-shopping" style="font-size: 48rpx;"></text>
        </view>
        <text class="link-text">机构登录</text>
      </view>

      <view class="login-link" @click="goTo('/pages/institution/settle/index', true)">
        <view class="link-icon-wrapper">
          <text class="iconfont icon-add" style="font-size: 48rpx;"></text>
        </view>
        <text class="link-text">机构入驻</text>
      </view>

      <view class="login-link" @click="goTo('/pages/admin/login/index')">
        <view class="link-icon-wrapper">
          <text class="iconfont icon-settings" style="font-size: 48rpx;"></text>
        </view>
        <text class="link-text">管理员</text>
      </view>
    </view>

    <!-- 底部装饰 -->
    <view class="bottom-decoration">
      <view class="wave wave-1"></view>
      <view class="wave wave-2"></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { authApi } from '@/api/auth'
import { setToken } from '@/utils/request'

const loading = ref(false)

/** 登录成功后的处理 */
const onLoginSuccess = (res: any) => {
  setToken(res.token)

  uni.setStorageSync('userType', 'teacher')
  if (res.userInfo.teacherId) {
    uni.setStorageSync('teacherId', res.userInfo.teacherId)
  }
  if (res.userInfo.institutionId) {
    uni.setStorageSync('institutionId', res.userInfo.institutionId)
  }

  uni.showToast({ title: '登录成功', icon: 'success' })
  setTimeout(() => {
    uni.reLaunch({ url: '/pages/teacher/center/index' })
  }, 500)
}

/** 微信手机号授权登录 */
const handleGetPhoneNumber = async (e: any) => {
  // wd-button 的 @getphonenumber 事件已解包 event.detail，e 直接是 detail 对象
  const detail = e?.detail || e || {}
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
      type: 'teacher',
    })
    onLoginSuccess(res)
  } catch (error: any) {
    console.error('教师登录失败:', error)
    uni.showToast({ title: error.message || '登录失败，请重试', icon: 'none' })
  } finally {
    loading.value = false
  }
}

/** 页面跳转 */
const goTo = (url: string, navigate = false) => {
  if (navigate) {
    uni.navigateTo({ url })
  } else {
    uni.reLaunch({ url })
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  background: linear-gradient(135deg, $uni-color-primary-lighter 0%, $uni-bg-color 100%);
  padding: 0 64rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.top-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 400rpx;

  .circle {
    position: absolute;
    border-radius: 50%;
    opacity: 0.1;
  }

  .circle-1 {
    width: 300rpx;
    height: 300rpx;
    background-color: $uni-color-primary;
    top: -100rpx;
    left: -100rpx;
  }

  .circle-2 {
    width: 200rpx;
    height: 200rpx;
    background-color: $uni-color-primary-light;
    top: 100rpx;
    right: -50rpx;
  }

  .circle-3 {
    width: 150rpx;
    height: 150rpx;
    background-color: $uni-color-primary-dark;
    top: 250rpx;
    left: 50%;
    transform: translateX(-50%);
  }
}

.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 80rpx;
  z-index: 1;

  .logo {
    width: 160rpx;
    height: 160rpx;
    background-color: $uni-bg-color;
    border-radius: 32rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 16rpx 48rpx rgba($uni-color-primary, 0.2);
    margin-bottom: 40rpx;

    .logo-icon {
      font-size: 80rpx;
    }
  }
}

.app-name {
  font-size: 48rpx;
  font-weight: bold;
  color: $uni-text-color;
  margin-bottom: 16rpx;
}

.app-slogan {
  font-size: 28rpx;
  color: $uni-text-color-secondary;
}

.login-section {
  width: 100%;
  z-index: 1;
}

.login-button {
  margin-bottom: 24rpx;
  height: 96rpx;
  font-size: 32rpx;
}

.button-content {
  display: flex;
  align-items: center;
  gap: 16rpx;

  .btn-icon {
    font-size: 36rpx;
  }
}

.divider-line {
  display: flex;
  align-items: center;
  margin: 16rpx 0 24rpx;

  .line {
    flex: 1;
    height: 1rpx;
    background-color: $uni-border-color-light;
  }

  .divider-text {
    padding: 0 24rpx;
    font-size: 24rpx;
    color: $uni-text-color-tertiary;
  }
}

.phone-input-wrap {
  display: flex;
  align-items: center;
  background-color: $uni-bg-color;
  border: 2rpx solid $uni-border-color;
  border-radius: 48rpx;
  padding: 0 32rpx;
  height: 96rpx;
  margin-bottom: 24rpx;
  transition: border-color 0.3s;

  &:focus-within {
    border-color: $uni-color-primary;
  }

  .phone-icon {
    font-size: 36rpx;
    color: $uni-text-color-tertiary;
    margin-right: 16rpx;
  }

  .phone-input {
    flex: 1;
    font-size: 30rpx;
    color: $uni-text-color;
    height: 96rpx;
  }
}

.tips {
  margin-top: 32rpx;
  text-align: center;
  font-size: 24rpx;
  color: $uni-text-color-tertiary;
  line-height: 1.6;

  .tips-link {
    color: $uni-color-primary;
  }
}

.other-login {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 40rpx;
  margin-top: 80rpx;
  padding: 0 32rpx;
  z-index: 1;

  .login-link {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16rpx;
    cursor: pointer;
    min-width: 120rpx;

    &:active {
      opacity: 0.7;
    }

    .link-icon-wrapper {
      width: 96rpx;
      height: 96rpx;
      background-color: rgba(82, 196, 26, 0.1);
      border-radius: 24rpx;
      display: flex;
      align-items: center;
      justify-content: center;

      .iconfont {
        color: $uni-color-primary;
        font-size: 48rpx;
      }
    }

    .link-text {
      font-size: 24rpx;
      color: $uni-text-color;
      white-space: nowrap;
    }
  }
}

.bottom-decoration {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 200rpx;

  .wave {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: $uni-color-primary;
    border-radius: 50% 50% 0 0;
  }

  .wave-1 {
    height: 120rpx;
    opacity: 0.08;
  }

  .wave-2 {
    height: 80rpx;
    opacity: 0.03;
  }
}
</style>