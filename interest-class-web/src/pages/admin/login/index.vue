<template>
  <view class="login-container">
    <view class="header-decoration"></view>
    
    <view class="login-card">
      <view class="card-header">
        <view class="logo-circle">
          <text class="iconfont icon-settings logo-icon"></text>
        </view>
        <text class="app-title">系统管理后台</text>
        <text class="app-subtitle">Platform Management</text>
      </view>

      <view class="card-body">
        <view class="form-item">
          <view class="input-wrapper">
            <text class="iconfont icon-customer input-icon"></text>
            <input 
              v-model="formData.username" 
              class="input" 
              placeholder="管理员账号" 
              placeholder-class="input-placeholder"
            />
          </view>
        </view>

        <view class="form-item">
          <view class="input-wrapper">
            <text class="iconfont icon-lock input-icon"></text>
            <input 
              v-model="formData.password" 
              class="input" 
              password 
              placeholder="请输入密码" 
              placeholder-class="input-placeholder"
            />
          </view>
        </view>
        
        <wd-button 
          type="primary" 
          block 
          size="large"
          custom-class="login-btn"
          :loading="loading"
          @click="handleLogin"
        >
          登录
        </wd-button>
      </view>
    </view>

    <!-- 其他角色登录入口 -->
    <view class="other-login">
      <view class="other-login-title">其他角色登录</view>
      <view class="other-login-links">
        <view class="login-link" @click="goTo('/pages/login/index')">
          <view class="link-icon-wrapper">
            <text class="iconfont icon-customer" style="font-size: 40rpx;"></text>
          </view>
          <text class="link-text">家长登录</text>
        </view>
        <view class="login-link" @click="goTo('/pages/institution/login/index')">
          <view class="link-icon-wrapper">
            <text class="iconfont icon-shopping" style="font-size: 40rpx;"></text>
          </view>
          <text class="link-text">机构登录</text>
        </view>
        <view class="login-link" @click="goTo('/pages/teacher/login/index')">
          <view class="link-icon-wrapper">
            <text class="iconfont icon-name-card" style="font-size: 40rpx;"></text>
          </view>
          <text class="link-text">教师登录</text>
        </view>
      </view>
    </view>

    <!-- 底部链接 -->
    <view class="footer-links">
      <view class="link-item" @click="handleBackToLogin">
        <text class="iconfont icon-home"></text>
        <text>返回首页</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { authApi } from '@/api/auth'
import { setToken } from '@/utils/request'

const loading = ref(false)

const formData = reactive({
  username: '',
  password: ''
})

const handleLogin = async () => {
  if (!formData.username || !formData.password) {
    uni.showToast({ title: '请输入账号和密码', icon: 'none' })
    return
  }

  loading.value = true
  try {
    const res = await authApi.adminLogin(formData)
    
    setToken(res.token)
    uni.setStorageSync('userType', 'admin')
    
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/admin/center/index' })
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

const handleBackToLogin = () => {
  uni.switchTab({ url: '/pages/index/index' })
}

const goTo = (url: string) => {
  uni.reLaunch({ url })
}
</script>

<style lang="scss" scoped>
.login-container {
  min-height: 100vh;
  background-color: #f0f2f5;
  background-image: linear-gradient(180deg, $uni-color-primary-lighter 0%, #f0f2f5 50%);
  display: flex;
  flex-direction: column;
  padding: 48rpx;
  position: relative;
  overflow: hidden;
}

.header-decoration {
  position: absolute;
  top: -100rpx;
  right: -100rpx;
  width: 400rpx;
  height: 400rpx;
  background: radial-gradient(circle, rgba($uni-color-primary, 0.1) 0%, rgba(255,255,255,0) 70%);
  border-radius: 50%;
  pointer-events: none;
}

.login-card {
  margin-top: 120rpx;
  background: #fff;
  border-radius: 32rpx;
  padding: 64rpx 48rpx;
  box-shadow: 0 24rpx 48rpx rgba(0, 0, 0, 0.04);
  position: relative;
  z-index: 10;

  .card-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 64rpx;

    .logo-circle {
      width: 120rpx;
      height: 120rpx;
      background: $uni-color-primary-lighter;
      border-radius: 32rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24rpx;

      .logo-icon {
        font-size: 64rpx;
        color: $uni-color-primary;
      }
    }

    .app-title {
      font-size: 36rpx;
      font-weight: bold;
      color: #333;
      margin-bottom: 12rpx;
    }

    .app-subtitle {
      font-size: 26rpx;
      color: #999;
      letter-spacing: 2rpx;
    }
  }

  .card-body {
    .form-item {
      margin-bottom: 32rpx;
    }

    .input-wrapper {
      display: flex;
      align-items: center;
      background: #f5f7fa;
      border-radius: 16rpx;
      padding: 0 24rpx;
      height: 100rpx;
      transition: all 0.3s;

      &:focus-within {
        background: #fff;
        box-shadow: 0 0 0 2rpx $uni-color-primary;
      }

      .input-icon {
        font-size: 40rpx;
        color: #c0c4cc;
        margin-right: 20rpx;
      }

      .input {
        flex: 1;
        height: 100%;
        font-size: 30rpx;
        color: #333;
      }

      .input-placeholder {
        color: #c0c4cc;
      }
    }

    :deep(.login-btn) {
      background: $uni-color-primary !important;
      border: none !important;
      border-radius: 100rpx !important;
      height: 88rpx !important;
      font-size: 30rpx !important;
      box-shadow: 0 8rpx 24rpx rgba($uni-color-primary, 0.25);
      margin-top: 48rpx;
    }
  }
}

.other-login {
  margin-top: 48rpx;
  padding: 0 8rpx;

  .other-login-title {
    font-size: 24rpx;
    color: #999;
    text-align: center;
    margin-bottom: 32rpx;
    position: relative;

    &::before, &::after {
      content: '';
      position: absolute;
      top: 50%;
      width: 25%;
      height: 1rpx;
      background: #e0e0e0;
    }
    &::before { left: 0; }
    &::after { right: 0; }
  }

  .other-login-links {
    display: flex;
    justify-content: center;
    gap: 48rpx;
  }

  .login-link {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12rpx;
    cursor: pointer;
    min-width: 100rpx;

    &:active { opacity: 0.7; }

    .link-icon-wrapper {
      width: 88rpx;
      height: 88rpx;
      background-color: rgba(82, 196, 26, 0.08);
      border-radius: 24rpx;
      display: flex;
      align-items: center;
      justify-content: center;

      .iconfont {
        color: $uni-color-primary;
      }
    }

    .link-text {
      font-size: 22rpx;
      color: #666;
      white-space: nowrap;
    }
  }
}

.footer-links {
  margin-top: auto;
  padding-bottom: 48rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  
  .link-item {
    display: flex;
    align-items: center;
    gap: 8rpx;
    padding: 16rpx 24rpx;
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.2s;

    &:active { opacity: 0.6; }

    .iconfont {
      font-size: 32rpx;
      color: #666;
    }

    text {
      font-size: 26rpx;
      color: #666;
    }
  }
}
</style>
