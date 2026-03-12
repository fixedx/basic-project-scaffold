<template>
  <view class="login-container" :style="{ paddingTop: safeAreaTop + 'px' }">
    <view class="header-decoration"></view>
    
    <view class="login-card">
      <view class="card-header">
        <view class="logo-circle">
          <text class="iconfont icon-store logo-icon"></text>
        </view>
        <text class="app-title">机构管理后台</text>
        <text class="app-subtitle">账号密码登录</text>
      </view>

      <view class="card-body">
        <view class="form-item">
          <view class="input-wrapper">
            <text class="iconfont icon-customer input-icon"></text>
            <input 
              v-model="form.username" 
              class="input" 
              placeholder="请输入账号" 
              placeholder-class="input-placeholder"
            />
          </view>
        </view>

        <view class="form-item">
          <view class="input-wrapper">
            <text class="iconfont icon-lock input-icon"></text>
            <input 
              v-model="form.password" 
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

        <view class="agreement-text">
          登录即代表同意 <text class="link">《用户协议》</text> 和 <text class="link">《隐私政策》</text>
        </view>
      </view>
    </view>

    <!-- 底部切换 -->
    <view class="footer-links">
      <view class="link-item" @click="handleWechatLogin">
        <text class="iconfont icon-wechat"></text>
        <text>切换微信登录</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { authApi } from '@/api/auth'
import { setToken } from '@/utils/request'
import { useUserStore } from '@/stores/user'

const loading = ref(false)
const safeAreaTop = ref(0)
const userStore = useUserStore()

const form = reactive({
  username: '',
  password: ''
})

onLoad(() => {
  const systemInfo = uni.getSystemInfoSync()
  
  // #ifdef MP-WEIXIN
  const menuButton = uni.getMenuButtonBoundingClientRect()
  safeAreaTop.value = menuButton.bottom + 12
  // #endif

  // #ifndef MP-WEIXIN
  safeAreaTop.value = (systemInfo.statusBarHeight || 0) + 12
  // #endif
})

const handleLogin = async () => {
  if (!form.username || !form.password) {
    uni.showToast({ title: '请输入账号和密码', icon: 'none' })
    return
  }

  loading.value = true
  try {
    // 调用账号密码登录接口（需确保 API 支持）
    // 注意：authApi.login 通常是账号密码登录
    const result = await authApi.login({
      username: form.username,
      password: form.password,
      type: 'institution' 
    })
    
    setToken(result.token)
    await userStore.getUserInfo()
    
    uni.setStorageSync('userType', 'institution')
    if (result.userInfo.institutionId) {
       uni.setStorageSync('institutionId', result.userInfo.institutionId)
    }
    
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/institution/center/index' })
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

const handleWechatLogin = () => {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.login-container {
  min-height: 100vh;
  background-color: #f0f2f5;
  background-image: linear-gradient(180deg, #e6f7ff 0%, #f0f2f5 50%);
  display: flex;
  flex-direction: column;
  padding: 0 48rpx 48rpx;
  /* Add explicit transition for paddingTop */
  transition: padding-top 0.1s;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

.header-decoration {
  position: absolute;
  top: -100rpx;
  right: -100rpx;
  width: 400rpx;
  height: 400rpx;
  background: radial-gradient(circle, rgba(24, 144, 255, 0.1) 0%, rgba(255,255,255,0) 70%);
  border-radius: 50%;
  pointer-events: none;
}

.login-card {
  margin-top: 60rpx;
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
      background: #e6f7ff;
      border-radius: 32rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24rpx;

      .logo-icon {
        font-size: 64rpx;
        color: #1890ff;
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
        box-shadow: 0 0 0 2rpx #1890ff;
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
      background: #1890ff !important;
      border: none !important;
      border-radius: 100rpx !important;
      height: 88rpx !important;
      font-size: 30rpx !important;
      box-shadow: 0 8rpx 24rpx rgba(24, 144, 255, 0.25);
      margin-top: 48rpx;
      margin-bottom: 32rpx;
    }

    .agreement-text {
      text-align: center;
      font-size: 24rpx;
      color: #999;
      
      .link {
        color: #1890ff;
      }
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