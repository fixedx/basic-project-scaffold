<template>
  <view class="schedule-selector">
    <view class="section-header">
      <view class="section-title">选择上课时间</view>
      <text v-if="selectedScheduleIds.length > 0" class="selected-tip">
        已选 {{ selectedScheduleIds.length }} 节
      </text>
    </view>

    <!-- 无排课提示 -->
    <view class="empty-wrap" v-if="schedules.length === 0">
      <text class="iconfont icon-time empty-icon"></text>
      <text class="empty-text">暂无可预约的排课</text>
    </view>

    <!-- 排课列表 -->
    <view class="schedule-list" v-else>
      <view
        class="schedule-item"
        :class="{ active: selectedScheduleIds.includes(s.id), disabled: (s.max_students - s.booked_count) <= 0 }"
        v-for="s in schedules"
        :key="s.id"
        @click="onToggle(s)"
      >
        <view class="schedule-left">
          <view class="day-badge">{{ getDayOfWeekLabel(s.day_of_week as any) }}</view>
          <view class="time-range">{{ formatTimeRange(s.start_time, s.end_time) }}</view>
        </view>
        <view class="schedule-meta">
          <view class="meta-row" v-if="s.teacher?.name">
            <text class="iconfont icon-customer meta-icon"></text>
            <text class="meta-text">{{ s.teacher.name }}</text>
          </view>
          <view class="meta-row" v-if="s.classroom?.name">
            <text class="iconfont icon-location meta-icon"></text>
            <text class="meta-text">{{ s.classroom.name }}</text>
          </view>
          <view class="meta-row">
            <text class="iconfont icon-customer-group meta-icon"></text>
            <text class="meta-text" :class="{ 'text-danger': (s.max_students - s.booked_count) <= 0 }">
              剩余 {{ Math.max(0, s.max_students - s.booked_count) }} 名
            </text>
          </view>
        </view>
        <view class="check-icon">
          <text class="iconfont icon-check"></text>
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
.schedule-selector {
  background-color: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.02);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
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
    background: linear-gradient(to bottom, #52c41a, #95de64);
    border-radius: 4rpx;
  }
}

.selected-tip {
  font-size: 26rpx;
  color: #52c41a;
  font-weight: 600;
}

.empty-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 0;

  .empty-icon {
    font-size: 80rpx;
    color: #d9d9d9;
    margin-bottom: 16rpx;
  }

  .empty-text {
    font-size: 28rpx;
    color: #999;
  }
}

.schedule-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.schedule-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background-color: #f7f8fa;
  border-radius: 16rpx;
  border: 2rpx solid transparent;
  transition: all 0.2s;

  &.active {
    background-color: #fff;
    border-color: #52c41a;
    box-shadow: 0 4rpx 16rpx rgba(82, 196, 26, 0.1);

    .day-badge {
      background: linear-gradient(135deg, #52c41a, #95de64);
      color: #fff;
    }

    .check-icon {
      background-color: #52c41a;
      border-color: #52c41a;
      .iconfont { opacity: 1; transform: scale(1); }
    }
  }

  &.disabled {
    opacity: 0.5;
    pointer-events: none;
  }
}

.schedule-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 24rpx;
  min-width: 80rpx;
}

.day-badge {
  font-size: 22rpx;
  font-weight: 700;
  color: #52c41a;
  background-color: #f6ffed;
  border-radius: 8rpx;
  padding: 6rpx 12rpx;
  margin-bottom: 10rpx;
  transition: all 0.2s;
}

.time-range {
  font-size: 22rpx;
  color: #666;
}

.schedule-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.meta-row {
  display: flex;
  align-items: center;

  .meta-icon {
    font-size: 22rpx;
    color: #999;
    margin-right: 8rpx;
  }

  .meta-text {
    font-size: 24rpx;
    color: #666;

    &.text-danger { color: #f5222d; }
  }
}

.check-icon {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #d9d9d9;
  background-color: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 16rpx;
  transition: all 0.2s;
  flex-shrink: 0;

  .iconfont {
    font-size: 24rpx;
    color: #fff;
    opacity: 0;
    transform: scale(0.5);
    transition: all 0.2s;
  }
}
</style>
