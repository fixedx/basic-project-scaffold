<template>
  <view class="schedule-selector card-section">
    <view class="section-header">
      <view class="section-title">选择上课时间</view>
      <text v-if="selectedScheduleIds.length > 0" class="selected-tip">
        已选 {{ selectedScheduleIds.length }} 节
      </text>
    </view>

    <!-- 无排课提示 -->
    <view class="empty-wrap" v-if="schedules.length === 0">
      <text class="iconfont icon-time empty-icon"></text>
      <text class="empty-text">暂无可选择的排课</text>
    </view>

    <!-- 排课卡片列表 -->
    <view class="schedule-grid" v-else>
      <view
        v-for="s in schedules"
        :key="s.id"
        class="schedule-card"
        :class="{ 
          'active': selectedScheduleIds.includes(s.id), 
          'disabled': (s.max_students - s.booked_count) <= 0 
        }"
        @click="onToggle(s)"
      >
        <!-- 状态角标 -->
        <view class="status-tag" v-if="(s.max_students - s.booked_count) <= 0">满额</view>
        <view class="active-tag" v-else-if="selectedScheduleIds.includes(s.id)">
          <text class="iconfont icon-success"></text>
        </view>

        <view class="card-header">
          <view class="day-label">{{ getDayOfWeekLabel(s.day_of_week as any) }}</view>
          <view class="time-range">{{ formatTimeRange(s.start_time, s.end_time) }}</view>
        </view>

        <view class="card-body">
          <view class="info-item" v-if="s.teacher?.name">
            <text class="iconfont icon-customer info-icon"></text>
            <text class="info-text">{{ s.teacher.name }}</text>
          </view>
          <view class="info-item" v-if="s.classroom?.name">
            <text class="iconfont icon-location info-icon"></text>
            <text class="info-text">{{ s.classroom.name }}</text>
          </view>
        </view>

        <view class="card-footer">
          <view class="stock-info" :class="{ 'warning': (s.max_students - s.booked_count) < 5 }">
            剩余 {{ Math.max(0, s.max_students - s.booked_count) }} 名
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { Schedule } from '@/api/schedule'

interface Props {
  schedules: Schedule[]
  selectedScheduleIds: string[]
  getDayOfWeekLabel: (day: string) => string
  formatTimeRange: (start: string, end: string) => string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  toggle: [scheduleId: string]
}>()

const onToggle = (s: Schedule) => {
  if ((s.max_students - s.booked_count) <= 0 && !props.selectedScheduleIds.includes(s.id)) return
  emit('toggle', s.id)
}
</script>

<style lang="scss" scoped>
.card-section {
  background-color: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1a1a1a;
  padding-left: 20rpx;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 6rpx;
    height: 28rpx;
    background: linear-gradient(to bottom, $uni-color-primary, $uni-color-primary-light);
    border-radius: 4rpx;
  }
}

.selected-tip {
  font-size: 24rpx;
  color: $uni-color-primary;
  background-color: $uni-color-primary-lighter;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  font-weight: 600;
}

.empty-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 0;
  background-color: #fcfcfc;
  border-radius: 20rpx;
  border: 2rpx dashed #eee;

  .empty-icon {
    font-size: 80rpx;
    color: #e0e0e0;
    margin-bottom: 16rpx;
  }

  .empty-text {
    font-size: 26rpx;
    color: #999;
  }
}

.schedule-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.schedule-card {
  position: relative;
  background-color: #f8f9fa;
  border: 2rpx solid #f0f0f0;
  border-radius: 20rpx;
  padding: 24rpx;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;

  &.active {
    background-color: $uni-color-primary-lighter;
    border-color: $uni-color-primary;
    transform: translateY(-2rpx);
    box-shadow: 0 4rpx 12rpx rgba($uni-color-primary, 0.15);

    .day-label { color: $uni-color-primary; }
    .time-range { color: $uni-color-primary; }
  }

  &.disabled {
    opacity: 0.6;
    background-color: #f5f5f5;
    border-color: #e8e8e8;
    filter: grayscale(100%);
    
    .day-label, .time-range, .info-text, .stock-info {
      color: #999 !important;
    }
  }

  .status-tag {
    position: absolute;
    top: 0;
    right: 0;
    background-color: #999;
    color: #fff;
    font-size: 20rpx;
    padding: 2rpx 12rpx;
    border-bottom-left-radius: 12rpx;
  }

  .active-tag {
    position: absolute;
    top: 0;
    right: 0;
    width: 0;
    height: 0;
    border-top: 50rpx solid $uni-color-primary;
    border-left: 50rpx solid transparent;

    .icon-success {
      position: absolute;
      top: -48rpx;
      right: 2rpx;
      font-size: 24rpx;
      color: #fff;
    }
  }

  .card-header {
    margin-bottom: 16rpx;

    .day-label {
      font-size: 30rpx;
      font-weight: 700;
      color: #333;
      margin-bottom: 4rpx;
    }

    .time-range {
      font-size: 24rpx;
      color: #666;
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    }
  }

  .card-body {
    margin-bottom: 16rpx;

    .info-item {
      display: flex;
      align-items: center;
      margin-bottom: 8rpx;

      &:last-child { margin-bottom: 0; }

      .info-icon {
        font-size: 24rpx;
        color: #999;
        margin-right: 8rpx;
      }

      .info-text {
        font-size: 22rpx;
        color: #666;
      }
    }
  }

  .card-footer {
    border-top: 2rpx solid rgba(0, 0, 0, 0.03);
    padding-top: 12rpx;

    .stock-info {
      font-size: 22rpx;
      color: #999;
      text-align: right;

      &.warning {
        color: #f5222d;
        font-weight: 600;
      }
    }
  }
}
</style>
