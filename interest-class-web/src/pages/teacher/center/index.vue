<template>
  <view v-if="isReady" class="center-page">
    <!-- 顶部背景与教师信息区域 -->
    <view class="header-section" :style="{ paddingTop: safeAreaTop + 'px' }">
      <view class="header-content">
        <!-- 教师信息 -->
        <view class="teacher-card">
          <AsyncImage
            v-if="userInfo.avatar"
            :url="userInfo.avatar"
            width="100rpx"
            height="100rpx"
            mode="aspectFill"
            custom-class="avatar"
          />
          <image
            v-else
            class="avatar"
            src="/static/default-avatar.png"
            mode="aspectFill"
          />
          <view class="info-content">
            <view class="name-row">
              <text class="nickname">{{ userInfo.nickname || '教师' }}</text>
              <view class="role-tag">
                <text>教师</text>
              </view>
            </view>
            <text class="institution-text">{{ institutionName || '加载中...' }}</text>
          </view>
        </view>

        <!-- 数据统计栏 -->
        <view class="stats-row">
          <view class="stat-item">
            <text class="num">{{ stats.courseCount || 0 }}</text>
            <text class="label">授课数</text>
          </view>
          <view class="stat-item">
            <text class="num">{{ stats.studentCount || 0 }}</text>
            <text class="label">学员数</text>
          </view>
          <view class="stat-item">
            <text class="num">{{ stats.monthLessons || 0 }}</text>
            <text class="label">本月课时</text>
          </view>
          <view class="stat-item">
            <text class="num">{{ stats.totalLessons || 0 }}</text>
            <text class="label">累计课时</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 我的服务 -->
    <view class="section-card main-actions">
      <view class="section-header">
        <text class="title">我的服务</text>
      </view>
      <view class="service-grid">
        <view class="service-item" @click="goToStudents">
          <text class="iconfont icon-smile service-icon" style="color: #597ef7;"></text>
          <text class="label">我的学员</text>
        </view>
        <view class="service-item" @click="goToCourses">
          <text class="iconfont icon-catalog service-icon" style="color: #fa8c16;"></text>
          <text class="label">授课课程</text>
        </view>
        <view class="service-item" @click="goToSettings">
          <text class="iconfont icon-settings service-icon" style="color: #9254de;"></text>
          <text class="label">设置</text>
        </view>
        <!-- 占位 -->
        <view class="service-item"></view>
      </view>
    </view>

    <!-- 退出登录 -->
    <LogoutButton @click="handleLogout" />

    <!-- 底部 TabBar 占位 -->
    <view style="height: 120rpx;"></view>
    <CustomTabbar />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow, onLoad } from '@dcloudio/uni-app'
import { authApi } from '@/api/auth'
import { removeToken } from '@/utils/request'
import { useAuthGuard } from '@/composables/useAuthGuard'
import { useUserStore } from '@/stores/user'
import AsyncImage from '@/components/AsyncImage/index.vue'
import CustomTabbar from '@/components/CustomTabbar/index.vue'
import LogoutButton from '@/components/LogoutButton/index.vue'

const { isReady } = useAuthGuard('teacher')
const userStore = useUserStore()
const safeAreaTop = ref(0)

const userInfo = ref<any>({})
const institutionName = ref('')
const stats = ref({
  courseCount: 0,
  studentCount: 0,
  monthLessons: 0,
  totalLessons: 0,
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

  loadUserInfo()
})

onShow(() => {
  loadUserInfo()
})

/**
 * 加载用户信息
 */
const loadUserInfo = async () => {
  try {
    const result = await authApi.getUserInfo()
    userInfo.value = result
    userStore.setUserInfo(result)
    institutionName.value = '待实现'
  } catch (error) {
    console.error('加载用户信息失败:', error)
  }
}

/**
 * 跳转到学员列表
 */
const goToStudents = () => {
  uni.navigateTo({ url: '/pages/teacher/students/index' })
}

/**
 * 跳转到授课课程
 */
const goToCourses = () => {
  uni.navigateTo({ url: '/pages/teacher/courses/index' })
}

/**
 * 跳转到设置
 */
const goToSettings = () => {
  uni.navigateTo({ url: '/pages/settings/index' })
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
        uni.removeStorageSync('teacherId')
        uni.removeStorageSync('institutionId')
        uni.reLaunch({ url: '/pages/login/index' })
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.center-page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
  padding-bottom: env(safe-area-inset-bottom);
}

/* 头部区域 */
.header-section {
  background: linear-gradient(135deg, $uni-color-primary 0%, $uni-color-primary-dark 100%);
  padding-bottom: 80rpx;
  color: #fff;

  .header-content {
    padding: 20rpx 32rpx;
  }
}

.teacher-card {
  display: flex;
  align-items: center;
  margin-bottom: 40rpx;

  .avatar {
    width: 100rpx;
    height: 100rpx;
    border-radius: 50%;
    border: 4rpx solid rgba(255, 255, 255, 0.4);
    margin-right: 24rpx;
    background-color: #fff;
  }

  :deep(.avatar) {
    width: 100rpx !important;
    height: 100rpx !important;
    border-radius: 50% !important;
    border: 4rpx solid rgba(255, 255, 255, 0.4) !important;
    margin-right: 24rpx !important;
    overflow: hidden;

    image {
      border-radius: 50% !important;
    }
  }

  .info-content {
    flex: 1;
    display: flex;
    flex-direction: column;

    .name-row {
      display: flex;
      align-items: center;
      gap: 12rpx;
      margin-bottom: 8rpx;
    }

    .nickname {
      font-size: 36rpx;
      font-weight: bold;
    }

    .role-tag {
      display: inline-flex;
      align-items: center;
      padding: 2rpx 16rpx;
      background-color: rgba(255, 255, 255, 0.2);
      border-radius: 20rpx;
      font-size: 22rpx;
      backdrop-filter: blur(4px);
    }

    .institution-text {
      font-size: 26rpx;
      opacity: 0.85;
    }
  }
}

.stats-row {
  display: flex;
  justify-content: space-between;
  padding: 0 16rpx;

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;

    .num {
      font-size: 40rpx;
      font-weight: bold;
      color: #fff;
      margin-bottom: 8rpx;
      font-family: Arial, sans-serif;
    }

    .label {
      font-size: 24rpx;
      color: rgba(255, 255, 255, 0.85);
    }
  }
}

/* 卡片区域 */
.section-card {
  margin: 0 24rpx 24rpx;
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx 0;

  &.main-actions {
    margin-top: -40rpx;
    position: relative;
    z-index: 1;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 32rpx 24rpx;
    border-bottom: 1rpx solid $uni-bg-color-grey;

    .title {
      font-size: 30rpx;
      font-weight: bold;
      color: $uni-text-color;
    }
  }
}

.service-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 24rpx 0 0;

  .service-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 24rpx;
    min-height: 120rpx;

    &:active {
      opacity: 0.8;
    }

    .service-icon {
      font-size: 56rpx;
      margin-bottom: 12rpx;
    }

    .label {
      font-size: 24rpx;
      color: $uni-text-color;
    }
  }
}

</style>
