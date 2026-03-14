<template>
  <view class="page">
    <view class="detail-container" v-if="!loading && booking">
      <!-- 状态卡片 -->
      <view class="status-card">
        <view class="status-badge" :class="`status-${booking.status}`">
          {{ getStatusLabel(booking.status) }}
        </view>
        <text class="status-text">{{ getStatusText(booking.status) }}</text>
      </view>

      <!-- 预约信息 -->
      <view class="section">
        <view class="section-title">预约信息</view>
        <view class="info-list">
          <view class="info-item">
            <text class="label">课程ID</text>
            <text class="value">{{ booking.course_id }}</text>
          </view>
          <view class="info-item" v-if="booking.booking_time">
            <text class="label">预约时间</text>
            <text class="value">{{ formatDate(booking.booking_time) }}</text>
          </view>
          <view class="info-item">
            <text class="label">学员姓名</text>
            <text class="value">{{ booking.student_name }}</text>
          </view>
          <view class="info-item">
            <text class="label">联系电话</text>
            <text class="value">{{ booking.student_phone }}</text>
          </view>
          <view class="info-item" v-if="booking.student_age">
            <text class="label">学员年龄</text>
            <text class="value">{{ booking.student_age }}岁</text>
          </view>
          <view class="info-item" v-if="booking.remark">
            <text class="label">备注</text>
            <text class="value">{{ booking.remark }}</text>
          </view>
        </view>
      </view>

      <!-- 处理信息 -->
      <view class="section" v-if="booking.reason">
        <view class="section-title">处理信息</view>
        <view class="info-list">
          <view class="info-item">
            <text class="label">原因</text>
            <text class="value reason">{{ booking.reason }}</text>
          </view>
          <view class="info-item" v-if="booking.confirmed_at">
            <text class="label">确认时间</text>
            <text class="value">{{ formatDate(booking.confirmed_at) }}</text>
          </view>
          <view class="info-item" v-if="booking.rejected_at">
            <text class="label">拒绝时间</text>
            <text class="value">{{ formatDate(booking.rejected_at) }}</text>
          </view>
          <view class="info-item" v-if="booking.cancelled_at">
            <text class="label">取消时间</text>
            <text class="value">{{ formatDate(booking.cancelled_at) }}</text>
          </view>
        </view>
      </view>

      <!-- 时间信息 -->
      <view class="section">
        <view class="section-title">时间信息</view>
        <view class="info-list">
          <view class="info-item">
            <text class="label">创建时间</text>
            <text class="value">{{ formatDate(booking.created_at) }}</text>
          </view>
          <view class="info-item">
            <text class="label">更新时间</text>
            <text class="value">{{ formatDate(booking.updated_at) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 加载状态 -->
    <view class="loading-state" v-if="loading">
      <Loading text="加载中..." />
    </view>

    <!-- 空状态 -->
    <EmptyState 
      v-if="!loading && !booking" 
      icon="icon-calendar" 
      text="预约不存在" 
    />

    <!-- 底部操作栏 -->
    <PageFooter v-if="booking && canModify">
      <view class="footer-actions">
        <wd-button 
          v-if="booking.status === 'pending'"
          type="info"
          plain 
          custom-class="action-btn"
          @click="handleCancel"
        >
          取消预约
        </wd-button>
        <wd-button 
          type="primary" 
          custom-class="action-btn main-btn"
          @click="handleModify"
        >
          修改预约
        </wd-button>
      </view>
    </PageFooter>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app'
import { bookingApi, type Booking } from '@/api/booking'
import Loading from '@/components/Loading/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'
import EmptyState from '@/components/EmptyState/index.vue'

const bookingId = ref('')
const booking = ref<Booking | null>(null)
const loading = ref(false)

onLoad((options: any) => {
  if (options.id) {
    bookingId.value = options.id
  }
})

onMounted(() => {
  loadBookingDetail()
})

// 下拉刷新
onPullDownRefresh(async () => {
  await loadBookingDetail()
  uni.stopPullDownRefresh()
})

// 是否可以修改预约
const canModify = computed(() => {
  // 只有 pending 或 confirmed 状态的预约可以修改
  return booking.value && 
    (booking.value.status === 'pending' || booking.value.status === 'confirmed')
})

// 加载预约详情
const loadBookingDetail = async () => {
  if (!bookingId.value) {
    uni.showToast({
      title: '缺少预约ID',
      icon: 'none',
    })
    return
  }

  loading.value = true
  try {
    booking.value = await bookingApi.getDetail(bookingId.value)
  } catch (error: any) {
    uni.showToast({
      title: error.message || '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

// 修改预约
const handleModify = () => {
  if (!booking.value) return
  uni.navigateTo({
    url: `/pages/change-booking/index?bookingId=${bookingId.value}`,
  })
}

// 取消预约
const handleCancel = () => {
  if (!booking.value) return
  
  uni.showModal({
    title: '提示',
    content: '确定要取消这个预约吗？',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '处理中' })
        try {
          await bookingApi.cancel(bookingId.value)
          uni.showToast({ title: '已取消', icon: 'success' })
          loadBookingDetail()
        } catch (error: any) {
          uni.showToast({ title: error.message || '操作失败', icon: 'none' })
        } finally {
          uni.hideLoading()
        }
      }
    }
  })
}

// 格式化日期
const formatDate = (date: string) => {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 获取状态标签
const getStatusLabel = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: '待确认',
    confirmed: '已确认',
    rejected: '已拒绝',
    cancelled: '已取消',
    completed: '已完成',
  }
  return statusMap[status] || status
}

// 获取状态说明
const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    pending: '预约正在等待机构确认',
    confirmed: '预约已确认，请按时参加',
    rejected: '预约被机构拒绝',
    cancelled: '预约已取消',
    completed: '预约已完成',
  }
  return textMap[status] || ''
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

.detail-container {
  padding: 24rpx 32rpx 160rpx;
}

.status-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48rpx 32rpx;
  margin-bottom: 24rpx;
  background-color: $uni-bg-color;
  border-radius: 16rpx;
}

.status-badge {
  padding: 12rpx 32rpx;
  font-size: 32rpx;
  font-weight: bold;
  border-radius: 16rpx;
  margin-bottom: 16rpx;
  
  &.status-pending {
    color: $uni-color-warning;
    background-color: #fff7e6;
  }
  
  &.status-confirmed {
    color: $uni-color-primary;
    background-color: $uni-color-primary-lighter;
  }
  
  &.status-rejected {
    color: $uni-color-error;
    background-color: #fff1f0;
  }
  
  &.status-cancelled {
    color: $uni-text-color-tertiary;
    background-color: $uni-bg-color-grey;
  }
  
  &.status-completed {
    color: $uni-color-success;
    background-color: #f6ffed;
  }
}

.status-text {
  font-size: 28rpx;
  color: $uni-text-color-secondary;
  text-align: center;
}

.section {
  margin-bottom: 24rpx;
  padding: 24rpx;
  background-color: $uni-bg-color;
  border-radius: 16rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: $uni-text-color;
  margin-bottom: 24rpx;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.label {
  font-size: 28rpx;
  color: $uni-text-color-secondary;
  flex-shrink: 0;
  width: 160rpx;
}

.value {
  font-size: 28rpx;
  color: $uni-text-color;
  flex: 1;
  text-align: right;
  
  &.reason {
    color: $uni-color-error;
  }
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
  gap: 24rpx;
  
  text {
    font-size: 28rpx;
    color: $uni-text-color-secondary;
  }
}

.footer-actions {
  display: flex;
  justify-content: space-between;
  gap: 24rpx;
  width: 100%;
  
  
  
  .main-btn {
    flex: 2;
  }
}
</style>

<style>
.action-btn {
    flex: 1;
    width: 100%;
  }
</style>
