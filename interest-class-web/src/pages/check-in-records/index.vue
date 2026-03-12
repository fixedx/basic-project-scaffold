<template>
  <view class="page">
    <!-- 导航栏 -->
    <view class="nav-bar">
      <view class="nav-left" @click="handleBack">
        <text class="iconfont icon-left"></text>
      </view>
      <text class="nav-title">签到记录</text>
      <view class="nav-right"></view>
    </view>

    <!-- 订单信息 -->
    <view class="order-info" v-if="orderInfo">
      <view class="course-info">
        <text class="course-name">{{ orderInfo.course_title }}</text>
        <text class="institution-name">{{ orderInfo.institution_name }}</text>
      </view>
      <view class="progress-info">
        <text class="progress-text">已完成 {{ orderInfo.completed_lessons }}/{{ orderInfo.total_lessons }} 课时</text>
        <view class="progress-bar">
          <view 
            class="progress-fill" 
            :style="{ width: `${(orderInfo.completed_lessons / orderInfo.total_lessons) * 100}%` }"
          ></view>
        </view>
      </view>
    </view>

    <!-- 加载状态 -->
    <view class="loading-container" v-if="loading">
      <Loading text="加载中..." />
    </view>

    <!-- 签到记录列表 -->
    <view class="records-container" v-else-if="records.length > 0">
      <view class="records-list">
        <view 
          v-for="record in records" 
          :key="record.id" 
          class="record-item"
        >
          <view class="record-icon" :class="{ 'makeup': record.is_makeup }">
            <text class="iconfont icon-success"></text>
          </view>
          <view class="record-content">
            <view class="record-header">
              <text class="lesson-no">第 {{ record.lesson_no }} 课时</text>
              <text v-if="record.is_makeup" class="makeup-tag">补卡</text>
            </view>
            <view class="record-time">
              签到时间：{{ formatDateTime(record.check_in_time) }}
            </view>
            <view class="record-makeup-date" v-if="record.is_makeup && record.makeup_date">
              补卡日期：{{ formatDate(record.makeup_date) }}
            </view>
            <view class="record-remark" v-if="record.remark">
              备注：{{ record.remark }}
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view class="empty-container" v-else>
      <view class="empty-icon">
        <text class="iconfont icon-empty"></text>
      </view>
      <text class="empty-text">暂无签到记录</text>
      <text class="empty-sub-text">完成课程签到后将在这里显示</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { checkInApi, type CheckInRecord, type CheckInStatus } from '@/api/check-in'
import Loading from '@/components/Loading/index.vue'

const orderId = ref('')
const loading = ref(false)
const records = ref<CheckInRecord[]>([])
const orderInfo = ref<{
  course_title: string
  institution_name: string
  completed_lessons: number
  total_lessons: number
} | null>(null)

onLoad((options: any) => {
  if (options.orderId) {
    orderId.value = options.orderId
  }
  if (options.courseTitle) {
    orderInfo.value = {
      course_title: decodeURIComponent(options.courseTitle || ''),
      institution_name: decodeURIComponent(options.institutionName || ''),
      completed_lessons: parseInt(options.completedLessons) || 0,
      total_lessons: parseInt(options.totalLessons) || 0,
    }
  }
})

onMounted(async () => {
  await loadRecords()
})

// 加载签到记录
const loadRecords = async () => {
  if (!orderId.value) return
  
  loading.value = true
  try {
    const status = await checkInApi.getOrderStatus(orderId.value)
    records.value = status.records || []
    
    // 更新进度信息
    if (orderInfo.value) {
      orderInfo.value.completed_lessons = status.completed_lessons
      orderInfo.value.total_lessons = status.total_lessons
    }
  } catch (error: any) {
    console.error('加载签到记录失败:', error)
  } finally {
    loading.value = false
  }
}

// 格式化日期时间
const formatDateTime = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 返回上一页
const handleBack = () => {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  height: 88rpx;
  background-color: $uni-bg-color;
  padding-top: var(--status-bar-height);
  
  .nav-left, .nav-right {
    width: 80rpx;
    display: flex;
    align-items: center;
  }
  
  .nav-left .iconfont {
    font-size: 40rpx;
    color: $uni-text-color;
  }
  
  .nav-title {
    font-size: 34rpx;
    font-weight: bold;
    color: $uni-text-color;
  }
}

.order-info {
  margin: 24rpx 32rpx;
  padding: 32rpx;
  background-color: $uni-bg-color;
  border-radius: 16rpx;
}

.course-info {
  margin-bottom: 24rpx;
  
  .course-name {
    display: block;
    font-size: 32rpx;
    font-weight: bold;
    color: $uni-text-color;
    margin-bottom: 8rpx;
  }
  
  .institution-name {
    font-size: 26rpx;
    color: $uni-text-color-secondary;
  }
}

.progress-info {
  .progress-text {
    display: block;
    font-size: 26rpx;
    color: $uni-text-color-secondary;
    margin-bottom: 12rpx;
  }
  
  .progress-bar {
    height: 12rpx;
    background-color: $uni-bg-color-grey;
    border-radius: 6rpx;
    overflow: hidden;
  }
  
  .progress-fill {
    height: 100%;
    background-color: $uni-color-primary;
    border-radius: 6rpx;
    transition: width 0.3s;
  }
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 120rpx 0;
}

.records-container {
  padding: 0 32rpx 32rpx;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.record-item {
  display: flex;
  gap: 32rpx;
  padding: 32rpx;
  background-color: #FFFFFF;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  align-items: flex-start;
  transition: all 0.3s;

  &:active {
    transform: scale(0.98);
  }
}

.record-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background-color: rgba($uni-color-primary, 0.1); // Lighter primary bg
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  .iconfont {
    font-size: 40rpx;
    font-weight: bold;
    color: $uni-color-primary;
  }
  
  &.makeup {
    background-color: rgba($uni-color-warning, 0.1);
    
    .iconfont {
      color: $uni-color-warning;
    }
  }
}

.record-content {
  flex: 1;
}

.record-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
  
  .lesson-no {
    font-size: 30rpx;
    font-weight: bold;
    color: $uni-text-color;
  }
  
  .makeup-tag {
    padding: 4rpx 16rpx;
    font-size: 22rpx;
    color: $uni-color-warning;
    background-color: rgba(250, 173, 20, 0.1);
    border-radius: 8rpx;
  }
}

.record-time, .record-makeup-date, .record-remark {
  font-size: 26rpx;
  color: $uni-text-color-secondary;
  margin-bottom: 8rpx;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 32rpx;
  
  .empty-icon .iconfont {
    font-size: 200rpx;
    color: #d9d9d9;
  }
  
  .empty-text {
    font-size: 32rpx;
    color: $uni-text-color;
    margin-top: 32rpx;
  }
  
  .empty-sub-text {
    font-size: 26rpx;
    color: $uni-text-color-tertiary;
    margin-top: 16rpx;
  }
}
</style>
