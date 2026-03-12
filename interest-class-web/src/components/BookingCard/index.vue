<template>
  <view class="booking-card" @click="handleClick">
    <!-- 卡片头部 -->
    <view class="card-header">
      <view class="booking-info">
        <text class="course-name">{{ booking.course_name || booking.course_id }}</text>
        <!-- 优先显示排课时间 -->
        <text v-if="scheduleTimeText" class="schedule-time">
          <text class="iconfont icon-time"></text> {{ scheduleTimeText }}
        </text>
        <text v-else-if="booking.booking_time" class="booking-time">
          预约时间：{{ formatDate(booking.booking_time) }}
        </text>
      </view>
      <view class="status-badge" :class="statusClass">
        {{ statusLabel }}
      </view>
    </view>

    <!-- 卡片内容 -->
    <view class="card-body">
      <view class="info-row">
        <text class="label">学员姓名：</text>
        <text class="value">{{ booking.student_name }}</text>
      </view>
      <view class="info-row">
        <text class="label">联系电话：</text>
        <text class="value">{{ booking.student_phone }}</text>
      </view>
      <view v-if="booking.student_age" class="info-row">
        <text class="label">学员年龄：</text>
        <text class="value">{{ booking.student_age }}岁</text>
      </view>
      <view v-if="booking.remark" class="info-row">
        <text class="label">备注：</text>
        <text class="value remark">{{ booking.remark }}</text>
      </view>
      <view v-if="booking.reason" class="info-row">
        <text class="label">原因：</text>
        <text class="value reason">{{ booking.reason }}</text>
      </view>
    </view>

    <!-- 卡片底部 -->
    <view class="card-footer">
      <text class="create-time">{{ formatDate(booking.created_at) }}</text>
      <view class="actions" @click.stop>
        <!-- 家长端操作 -->
        <template v-if="role === 'parent'">
          <wd-button 
            v-if="canCancel" 
            size="small" 
            type="error" 
            @click="emit('action', 'cancel', booking)"
          >
            取消预约
          </wd-button>
        </template>

        <!-- 机构端操作 -->
        <template v-if="role === 'institution'">
          <wd-button 
            v-if="booking.status === 'pending'" 
            size="small" 
            type="error" 
            @click="emit('action', 'reject', booking)"
          >
            拒绝
          </wd-button>
          <wd-button 
            v-if="booking.status === 'pending'" 
            size="small" 
            type="primary" 
            @click="emit('action', 'confirm', booking)"
            custom-style="margin-left: 12rpx;"
          >
            确认
          </wd-button>
          <wd-button 
            v-if="booking.status === 'confirmed'" 
            size="small" 
            type="success" 
            @click="emit('action', 'complete', booking)"
          >
            完成
          </wd-button>
        </template>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Booking } from '@/api/booking'

interface Props {
  booking: Booking
  role?: 'parent' | 'institution'
}

interface Emits {
  (e: 'click', booking: Booking): void
  (e: 'action', action: string, booking: Booking): void
}

const props = withDefaults(defineProps<Props>(), {
  role: 'parent',
})

const emit = defineEmits<Emits>()

// 状态配置
const statusConfig: Record<string, { label: string; class: string }> = {
  pending: { label: '待确认', class: 'status-pending' },
  confirmed: { label: '已确认', class: 'status-confirmed' },
  rejected: { label: '已拒绝', class: 'status-rejected' },
  cancelled: { label: '已取消', class: 'status-cancelled' },
  completed: { label: '已完成', class: 'status-completed' },
}

const statusLabel = computed(() => statusConfig[props.booking.status]?.label || props.booking.status)
const statusClass = computed(() => statusConfig[props.booking.status]?.class || '')

// 排课时间文本
const scheduleTimeText = computed(() => {
  const schedule = (props.booking as any).schedule
  if (!schedule?.start_time) return ''
  
  const startTime = new Date(schedule.start_time)
  const endTime = schedule.end_time ? new Date(schedule.end_time) : null
  
  const formatTime = (d: Date) => {
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }
  
  const formatDatePart = (d: Date) => {
    const month = d.getMonth() + 1
    const day = d.getDate()
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return `${month}月${day}日 ${weekDays[d.getDay()]}`
  }
  
  if (endTime) {
    return `${formatDatePart(startTime)} ${formatTime(startTime)}-${formatTime(endTime)}`
  }
  return `${formatDatePart(startTime)} ${formatTime(startTime)}`
})

// 家长端是否可以取消
const canCancel = computed(() => {
  return ['pending', 'confirmed'].includes(props.booking.status)
})

const formatDate = (date: string) => {
  if (!date) return ''
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

const handleClick = () => {
  emit('click', props.booking)
}
</script>

<style lang="scss" scoped>
.booking-card {
  background-color: $uni-bg-color;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid $uni-border-color-light;
}

.booking-info {
  flex: 1;
  
  .course-name {
    display: block;
    font-size: 30rpx;
    font-weight: 600;
    color: $uni-text-color;
    margin-bottom: 8rpx;
  }
  
  .schedule-time {
    display: flex;
    align-items: center;
    gap: 8rpx;
    font-size: 26rpx;
    color: $uni-color-primary;
    font-weight: 500;
    
    .iconfont {
      font-size: 26rpx;
    }
  }
  
  .booking-time {
    display: block;
    font-size: 24rpx;
    color: $uni-text-color-tertiary;
  }
}

.status-badge {
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  
  &.status-pending {
    background-color: #fff7e6;
    color: #fa8c16;
  }
  
  &.status-confirmed {
    background-color: #f6ffed;
    color: #52c41a;
  }
  
  &.status-rejected {
    background-color: #fff1f0;
    color: #f5222d;
  }
  
  &.status-cancelled {
    background-color: #f5f5f5;
    color: #999;
  }
  
  &.status-completed {
    background-color: #f6ffed;
    color: #389e0d;
  }
}

.card-body {
  margin-bottom: 20rpx;
}

.info-row {
  display: flex;
  margin-bottom: 12rpx;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  .label {
    font-size: 26rpx;
    color: $uni-text-color-tertiary;
    flex-shrink: 0;
  }
  
  .value {
    font-size: 26rpx;
    color: $uni-text-color-secondary;
    flex: 1;
    
    &.remark {
      color: $uni-text-color-secondary;
    }
    
    &.reason {
      color: $uni-color-error;
    }
  }
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20rpx;
  border-top: 1rpx solid $uni-border-color-light;
}

.create-time {
  font-size: 24rpx;
  color: $uni-text-color-tertiary;
}

.actions {
  display: flex;
  align-items: center;
}
</style>
