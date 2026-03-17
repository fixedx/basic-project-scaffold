<template>
  <view class="login-container">
    <!-- 顶部装饰背景 -->
    <view class="header-decoration">
      <view class="circle circle-1"></view>
      <view class="circle circle-2"></view>
    </view>

    <!-- 登录卡片 -->
    <view class="login-card">
      <view class="card-header">
        <view class="logo">
          <image src="/static/logo.png" mode="aspectFit" class="logo-img" />
        </view>
        <text class="title">教师工作台</text>
        <text class="subtitle">专注教学，轻松管理</text>
      </view>

      <view class="card-body">
        <!-- #ifdef MP-WEIXIN -->
        <wd-button
          type="success"
          block
          size="large"
          open-type="getPhoneNumber"
          custom-class="action-btn"
          :loading="loading"
          @getphonenumber="handleGetPhoneNumber"
        >
          <view class="btn-content">
            <text class="iconfont icon-mobile-phone"></text>
            <text>微信手机号一键登录</text>
          </view>
        </wd-button>
        <!-- #endif -->

        <!-- #ifdef H5 || APP-PLUS -->
        <wd-button
          type="success"
          block
          size="large"
          custom-class="action-btn"
          :loading="loading"
          @click="handleMockLogin"
        >
          <view class="btn-content">
            <text class="iconfont icon-code"></text>
            <text>开发模式登录</text>
          </view>
        </wd-button>
        <!-- #endif -->

        <view class="agreement-box" @click="toggleAgreement">
          <view class="checkbox" :class="{ checked: isAgreed }">
            <text v-if="isAgreed" class="iconfont icon-success" style="font-size: 20rpx; color: #fff;"></text>
          </view>
          <text class="text">我已阅读并同意</text>
          <text class="link">《用户协议》</text>
          <text class="text">和</text>
          <text class="link">《隐私政策》</text>
        </view>

        <view class="cancel-login" @click="handleCancelLogin">
          <text class="cancel-link-common">取消登录</text>
        </view>
      </view>
    </view>

    <!-- 底部链接 -->
    <view class="footer-links">
      <view class="link-item" @click="handleToUserLogin">
        <text class="iconfont icon-customer"></text>
        <text>我是家长</text>
      </view>
      <view class="divider"></view>
      <view class="link-item" @click="handleToInstitutionLogin">
        <text class="iconfont icon-store"></text>
        <text>我是机构</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { authApi } from '@/api/auth'
import { setToken } from '@/utils/request'
import { useUserStore } from '@/stores/user'

const loading = ref(false)
const isAgreed = ref(false)

const toggleAgreement = () => {
  isAgreed.value = !isAgreed.value
}

/** 检查协议并执行登录 */
const checkAgreementAndLogin = (loginFn: () => void) => {
  if (isAgreed.value) {
    loginFn()
    return
  }
  uni.showModal({
    title: '用户协议',
    content: '请阅读并同意《用户协议》和《隐私政策》后继续',
    confirmText: '同意',
    cancelText: '不同意',
    success: (res) => {
      if (res.confirm) {
        isAgreed.value = true
        loginFn()
      }
    },
  })
}

const handleGetPhoneNumber = (e: any) => {
  const detail = e.detail || e
  const errMsg = detail.errMsg || detail.errmsg
  const code = detail.code

  if (!errMsg.includes('ok') && !code) {
    uni.showToast({ title: '您取消了授权', icon: 'none' })
    return
  }

  if (!code) {
    uni.showToast({ title: '获取授权码失败', icon: 'none' })
    return
  }

  checkAgreementAndLogin(() => doPhoneLogin(code))
}

const doPhoneLogin = async (code: string) => {
  loading.value = true
  try {
    const result = await authApi.phoneLogin({
      code: code,
      type: 'teacher'
    })
    
    setToken(result.token)
    const userStore = useUserStore()
    await userStore.getUserInfo()
    
    uni.setStorageSync('userType', 'teacher')
    if (result.userInfo.teacherId) {
      uni.setStorageSync('teacherId', result.userInfo.teacherId)
    }
    
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/teacher/center/index' })
    }, 1500)
  } catch (error: any) {
    uni.showToast({
      title: error.message || '登录失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

const handleMockLogin = () => {
  checkAgreementAndLogin(doMockLogin)
}

const doMockLogin = async () => {
  loading.value = true
  try {
    const mockCode = import.meta.env.VITE_MOCK_LOGIN_CODE || 'mock_test_code'
    
    const result = await authApi.phoneLogin({
      code: mockCode,
      type: 'teacher'
    })
    
    setToken(result.token)
    const userStore = useUserStore()
    await userStore.getUserInfo()
    
    uni.setStorageSync('userType', 'teacher')
    if (result.userInfo.teacherId) {
       uni.setStorageSync('teacherId', result.userInfo.teacherId)
    }

    uni.showToast({ title: 'Mock登录成功', icon: 'success' })
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/teacher/center/index' })
    }, 1500)
  } catch (error: any) {
    uni.showToast({
      title: error.message || '登录失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

// 页面跳转
const handleToUserLogin = () => uni.reLaunch({ url: '/pages/login/index' })
const handleToInstitutionLogin = () => uni.reLaunch({ url: '/pages/institution/login/index' })
const handleCancelLogin = () => {
  uni.switchTab({ url: '/pages/index/index' })
}
</script>

<style lang="scss" scoped>
.login-container {
  min-height: 100vh;
  background-color: #f5f7fa;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center; /* 垂直居中 */
}

.header-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 580rpx;
  background: linear-gradient(135deg, $uni-color-primary 0%, #a0d911 100%);
  border-bottom-left-radius: 40rpx;
  border-bottom-right-radius: 40rpx;
  z-index: 0;
  
  .circle {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
  }
  
  .circle-1 {
    width: 300rpx;
    height: 300rpx;
    top: -60rpx;
    right: -60rpx;
  }
  
  .circle-2 {
    width: 200rpx;
    height: 200rpx;
    bottom: 60rpx;
    left: 40rpx;
  }
}

.login-card {
  margin: 0 32rpx; /* 取消顶部 margin，由 flex 居中控制 */
  background: #fff;
  border-radius: 24rpx;
  padding: 60rpx 40rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.05);
  position: relative;
  z-index: 1;

  .card-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 60rpx;

    .logo {
      width: 120rpx;
      height: 120rpx;
      margin-bottom: 24rpx;
      background: #fff;
      border-radius: 24rpx;
      padding: 10rpx;
      box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
      
      .logo-img {
        width: 100%;
        height: 100%;
      }
    }

    .title {
      font-size: 40rpx;
      font-weight: bold;
      color: $uni-text-color;
      margin-bottom: 12rpx;
    }

    .subtitle {
      font-size: 28rpx;
      color: $uni-text-color-secondary;
    }
  }

  .card-body {
    .action-btn {
      margin-bottom: 32rpx;
      
      .btn-content {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12rpx;
        
        .iconfont {
          font-size: 36rpx;
        }
      }
    }

    .agreement-box {
      margin-top: 32rpx;
      display: flex;
      justify-content: center;
      align-items: center;
      
      .checkbox {
        width: 32rpx;
        height: 32rpx;
        border: 2rpx solid $uni-border-color;
        border-radius: 50%;
        margin-right: 12rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s;
        
        &.checked {
          background-color: $uni-color-primary;
          border-color: $uni-color-primary;
        }
      }
      
      .text {
        font-size: 24rpx;
        color: $uni-text-color-tertiary;
      }

      .link {
        font-size: 24rpx;
        color: $uni-color-primary;
      }
    }
    
    .cancel-login {
      margin-top: 32rpx;
      text-align: center;
      
      text {
        font-size: 28rpx;
      }
    }
  }
}

.footer-links {
  position: absolute; /* 绝对定位到底部 */
  bottom: 0;
  left: 0;
  right: 0;
  padding: 48rpx 0 64rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 32rpx;

  .link-item {
    display: flex;
    align-items: center;
    gap: 8rpx;
    padding: 12rpx 24rpx;
    cursor: pointer;
    
    .iconfont {
      font-size: 32rpx;
      color: $uni-text-color-secondary;
    }
    
    text {
      font-size: 26rpx;
      color: $uni-text-color-secondary;
    }

    &:active {
      opacity: 0.7;
    }
  }

  .divider {
    width: 2rpx;
    height: 24rpx;
    background-color: $uni-text-color-disable;
  }
}
</style>
