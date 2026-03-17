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
        <image src="/static/logo.png" mode="aspectFit" class="logo-img" />
      </view>
      <text class="app-name">家长登录</text>
      <text class="app-slogan">发现身边优质兴趣课程</text>
    </view>

    <!-- 登录按钮 -->
    <view class="login-section">
      <!-- #ifdef MP-WEIXIN -->
      <wd-button
        type="primary"
        block
        round
        :loading="wechatLoading"
        class="login-button"
        @click="handleWechatLogin"
      >
        <view class="button-content">
          <text class="btn-icon">💬</text>
          <text>微信一键登录</text>
        </view>
      </wd-button>

      <view class="divider-line">
        <view class="line"></view>
        <text class="divider-text">或</text>
        <view class="line"></view>
      </view>
      <!-- #endif -->

      <!-- 手机号登录 -->
      <view class="phone-input-wrap">
        <text class="iconfont icon-mobile-phone phone-icon"></text>
        <input
          v-model="phoneNumber"
          type="number"
          maxlength="11"
          placeholder="请输入手机号"
          class="phone-input"
        />
      </view>
      <wd-button
        type="primary"
        block
        round
        :loading="phoneLoading"
        :disabled="!isPhoneValid"
        class="login-button"
        @click="handlePhoneLogin"
      >
        <view class="button-content">
          <text class="btn-icon">📱</text>
          <text>手机号登录</text>
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
      <view class="login-link" @click="goTo('/pages/institution/login/index')">
        <view class="link-icon-wrapper">
          <text class="iconfont icon-shopping" style="font-size: 48rpx;"></text>
        </view>
        <text class="link-text">机构登录</text>
      </view>

      <view class="login-link" @click="goTo('/pages/teacher/login/index')">
        <view class="link-icon-wrapper">
          <text class="iconfont icon-name-card" style="font-size: 48rpx;"></text>
        </view>
        <text class="link-text">教师登录</text>
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
    <!-- 取消登录 -->
    <view class="cancel-login" @click="handleCancelLogin">
      <text class="cancel-text">取消登录</text>
    </view>

    <!-- 底部装饰 -->
    <view class="bottom-decoration">
      <view class="wave wave-1"></view>
      <view class="wave wave-2"></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'
import { setToken } from '@/utils/request'
import { useUserStore } from '@/stores/user'
import { isValidPhone } from '@/utils/validator'

const wechatLoading = ref(false)
const phoneLoading = ref(false)
const phoneNumber = ref('')
const isPhoneValid = computed(() => isValidPhone(phoneNumber.value))

/** 微信登录 */
const handleWechatLogin = async () => {
  try {
    wechatLoading.value = true
    // #ifdef MP-WEIXIN
    const { code } = await uni.login({ provider: 'weixin' })
    const res = await authApi.wechatLogin({ code })

    setToken(res.token)
    const userStore = useUserStore()
    userStore.setUserInfo(res.userInfo)
    uni.setStorageSync('userType', '')

    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => {
      uni.switchTab({ url: '/pages/index/index' })
    }, 500)
    // #endif
  } catch (error: any) {
    uni.showToast({ title: error.message || '登录失败', icon: 'none' })
  } finally {
    wechatLoading.value = false
  }
}

/** 手机号登录 */
const handlePhoneLogin = async () => {
  if (!isPhoneValid.value) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }
  try {
    phoneLoading.value = true
    const res = await authApi.parentPhoneLogin({ phone: phoneNumber.value })

    setToken(res.token)
    const userStore = useUserStore()
    userStore.setUserInfo(res.userInfo)
    uni.setStorageSync('userType', '')

    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => {
      uni.switchTab({ url: '/pages/index/index' })
    }, 500)
  } catch (error: any) {
    uni.showToast({ title: error.message || '登录失败', icon: 'none' })
  } finally {
    phoneLoading.value = false
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

/** 取消登录，返回首页 */
const handleCancelLogin = () => {
  uni.reLaunch({ url: '/pages/index/index' })
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
    padding: 16rpx;

    .logo-img {
      width: 100%;
      height: 100%;
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

.cancel-login {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 40rpx;
  padding: 16rpx 32rpx;
  z-index: 1;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;

  &:active { opacity: 0.4; }

  .cancel-text {
    font-size: 26rpx;
    color: $uni-text-color-tertiary;
    text-decoration: underline;
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