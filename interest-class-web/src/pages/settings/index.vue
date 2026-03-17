<template>
  <view class="settings-page">
    <!-- 账户设置 -->
    <view class="settings-section">
      <text class="section-title">账户设置</text>
      <wd-cell-group border>
        <wd-cell
          title="个人信息"
          is-link
          @click="goToProfile"
        >
          <template #icon>
            <text class="menu-icon icon-color-primary iconfont icon-address-book-fill"></text>
          </template>
        </wd-cell>
        <wd-cell
          title="消息通知"
          is-link
          @click="goToNotification"
        >
          <template #icon>
            <text class="menu-icon icon-color-warning iconfont icon-remind"></text>
          </template>
        </wd-cell>
      </wd-cell-group>
    </view>

    <!-- 通用设置 -->
    <view class="settings-section">
      <text class="section-title">通用设置</text>
      <wd-cell-group border>
        <wd-cell
          title="清除缓存"
          is-link
          @click="handleClearCache"
        >
          <template #icon>
            <text class="menu-icon icon-color-error iconfont icon-delete"></text>
          </template>
          <template #value>
            <text class="cache-size">{{ cacheSize }}</text>
          </template>
        </wd-cell>
      </wd-cell-group>
    </view>

    <!-- 关于 -->
    <view class="settings-section">
      <text class="section-title">关于</text>
      <wd-cell-group border>
        <wd-cell
          title="用户协议"
          is-link
          @click="goToAgreement"
        >
          <template #icon>
            <text class="menu-icon icon-color-info iconfont icon-format-txt"></text>
          </template>
        </wd-cell>
        <wd-cell
          title="隐私政策"
          is-link
          @click="goToPrivacyPolicy"
        >
          <template #icon>
            <text class="menu-icon icon-color-info iconfont icon-format-txt"></text>
          </template>
        </wd-cell>
        <wd-cell
          title="版本信息"
          is-link
          @click="handleCheckUpdate"
        >
          <template #icon>
            <text class="menu-icon icon-color-success iconfont icon-info"></text>
          </template>
          <template #value>
            <view class="version-wrap">
              <text class="version">v{{ appVersion }}</text>
              <view v-if="hasUpdate" class="update-dot"></view>
            </view>
          </template>
        </wd-cell>
      </wd-cell-group>
    </view>

    <!-- 退出登录按钮 -->
    <LogoutButton v-if="isLoggedIn" @click="handleLogout" />

    <!-- 安全区域 -->
    <view class="safe-area"></view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import LogoutButton from '@/components/LogoutButton/index.vue'
import { getToken, removeToken } from '@/utils/request'

// 版本号
const appVersion = ref('1.0.0')
const hasUpdate = ref(false)

// 缓存大小
const cacheSize = ref('0 KB')

// 是否已登录
const isLoggedIn = computed(() => !!getToken())

/**
 * 获取缓存大小
 */
const getCacheSize = () => {
  // #ifdef MP-WEIXIN
  uni.getStorageInfo({
    success: (res) => {
      const size = res.currentSize
      if (size < 1024) {
        cacheSize.value = `${size} KB`
      } else {
        cacheSize.value = `${(size / 1024).toFixed(2)} MB`
      }
    }
  })
  // #endif
  
  // #ifdef H5
  cacheSize.value = '计算中...'
  try {
    let totalSize = 0
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage.getItem(key)?.length || 0
      }
    }
    const sizeKB = totalSize / 1024
    if (sizeKB < 1024) {
      cacheSize.value = `${sizeKB.toFixed(2)} KB`
    } else {
      cacheSize.value = `${(sizeKB / 1024).toFixed(2)} MB`
    }
  } catch {
    cacheSize.value = '未知'
  }
  // #endif
}

/**
 * 清除缓存
 */
const handleClearCache = () => {
  uni.showModal({
    title: '提示',
    content: '确定要清除缓存吗？这不会影响您的登录状态。',
    success: (res) => {
      if (res.confirm) {
        // 保存 token
        const token = getToken()
        const userType = uni.getStorageSync('userType')
        const institutionId = uni.getStorageSync('institutionId')
        
        // 清除所有缓存
        uni.clearStorageSync()
        
        // 恢复登录状态
        if (token) {
          uni.setStorageSync('token', token)
        }
        if (userType) {
          uni.setStorageSync('userType', userType)
        }
        if (institutionId) {
          uni.setStorageSync('institutionId', institutionId)
        }
        
        // 重新计算缓存大小
        getCacheSize()
        
        uni.showToast({
          title: '缓存已清除',
          icon: 'success'
        })
      }
    }
  })
}

/**
 * 检查版本更新
 */
const handleCheckUpdate = () => {
  // #ifdef MP-WEIXIN
  const updateManager = uni.getUpdateManager()
  updateManager.onCheckForUpdate((res) => {
    if (res.hasUpdate) {
      hasUpdate.value = true
      updateManager.onUpdateReady(() => {
        uni.showModal({
          title: '更新提示',
          content: '新版本已经准备好，是否重启应用？',
          success: (modalRes) => {
            if (modalRes.confirm) {
              updateManager.applyUpdate()
            }
          }
        })
      })
      updateManager.onUpdateFailed(() => {
        uni.showModal({
          title: '更新提示',
          content: '新版本下载失败，请检查网络后重试，或删除小程序重新搜索打开。',
          showCancel: false
        })
      })
    } else {
      uni.showToast({
        title: '已是最新版本',
        icon: 'success'
      })
    }
  })
  // #endif
  
  // #ifdef H5
  uni.showToast({
    title: '已是最新版本 v' + appVersion.value,
    icon: 'none'
  })
  // #endif
}

/**
 * 退出登录
 */
const handleLogout = () => {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        removeToken()
        uni.removeStorageSync('userType')
        uni.removeStorageSync('institutionId')
        uni.removeStorageSync('teacherId')
        
        uni.showToast({
          title: '已退出登录',
          icon: 'success'
        })
        
        setTimeout(() => {
          uni.reLaunch({
            url: '/pages/index/index'
          })
        }, 500)
      }
    }
  })
}

/** 跳转到个人信息 */
const goToProfile = () => {
  uni.navigateTo({ url: '/pages/settings/profile' })
}

/** 跳转到消息通知 */
const goToNotification = () => {
  uni.navigateTo({ url: '/pages/notification/index' })
}

/** 跳转到用户协议 */
const goToAgreement = () => {
  uni.navigateTo({ url: '/pages/agreement/index' })
}

/** 跳转到隐私政策 */
const goToPrivacyPolicy = () => {
  uni.navigateTo({ url: '/pages/privacy/index' })
}

/**
 * 获取版本号
 */
const getAppVersion = () => {
  // #ifdef MP-WEIXIN
  const accountInfo = uni.getAccountInfoSync?.()
  if (accountInfo?.miniProgram?.version) {
    appVersion.value = accountInfo.miniProgram.version
  }
  // #endif
}

onMounted(() => {
  getCacheSize()
  getAppVersion()
})
</script>

<style lang="scss" scoped>
.settings-page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
  padding: 24rpx;
}

.settings-section {
  margin-bottom: 32rpx;
}

.section-title {
  display: block;
  font-size: 28rpx;
  color: $uni-text-color-secondary;
  margin-bottom: 16rpx;
  padding-left: 8rpx;
}

.menu-icon {
  font-size: 36rpx;
  margin-right: 16rpx;

  &.icon-color-primary {
    color: $uni-color-primary;
  }

  &.icon-color-warning {
    color: $uni-color-warning;
  }

  &.icon-color-error {
    color: #fa541c;
  }

  &.icon-color-info {
    color: $uni-color-info;
  }

  &.icon-color-success {
    color: $uni-color-success;
  }
}

.cache-size,
.version {
  font-size: 28rpx;
  color: $uni-text-color-tertiary;
}

.version-wrap {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.update-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background-color: $uni-color-error;
}

.safe-area {
  height: 100rpx;
}
</style>
