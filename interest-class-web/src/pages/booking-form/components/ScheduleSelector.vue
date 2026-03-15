<template>
  <view class="schedule-selector card-section">
    <view class="section-header">
      <view class="section-title">选择上课时间</view>
      <text v-if="selectedScheduleIds.length > 0" class="selected-tip">
        已选 {{ selectedScheduleIds.length }} 个时段
      </text>
    </view>

    <!-- 无排课提示 -->
    <view class="empty-wrap" v-if="groupedSchedules.length === 0">
      <text class="iconfont icon-time empty-icon"></text>
      <text class="empty-text">暂无可选择的排课</text>
    </view>

    <!-- 聚合后的排课卡片列表 -->
    <view class="schedule-grid" v-else>
      <view
        v-for="group in groupedSchedules"
        :key="group.key"
        class="schedule-card"
        :class="{ 
          'active': selectedScheduleIds.includes(group.representativeId), 
          'disabled': group.availableCount <= 0 
        }"
        @click="onToggle(group)"
      >
        <!-- 状态角标 -->
        <view class="status-tag" v-if="group.availableCount <= 0">满额</view>
        <view class="active-tag" v-else-if="selectedScheduleIds.includes(group.representativeId)">
          <text class="iconfont icon-success"></text>
        </view>

        <view class="card-header">
          <view class="card-header__main">
            <view class="schedule-summary">
              <view class="schedule-summary__date">{{ group.dateRange }}</view>
              <view class="schedule-summary__slot">
                每{{ getDayOfWeekLabel(group.dayOfWeek as any) }} {{ group.timeRange }}
              </view>
            </view>
          </view>
          <view class="lesson-badge">
            {{ group.totalCount }}节
          </view>
        </view>

        <view class="card-body">
          <view class="info-item" v-if="group.teacherName">
            <view class="info-label">教师</view>
            <view class="info-content">
              <text class="iconfont icon-customer info-icon"></text>
              <text class="info-text">{{ group.teacherName }}</text>
            </view>
          </view>
          <view class="info-item" v-if="group.classroomName">
            <view class="info-label">教室</view>
            <view class="info-content">
              <text class="iconfont icon-location info-icon"></text>
              <text class="info-text">{{ group.classroomName }}</text>
            </view>
          </view>
        </view>

        <view class="card-footer">
          <view class="stock-info" :class="{ 'warning': group.availableCount < group.totalCount }">
            {{ group.availableCount === group.totalCount ? '可直接预约' : `可约 ${group.availableCount}/${group.totalCount} 节` }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Schedule } from '@/api/schedule'

interface ScheduleGroup {
  key: string
  representativeId: string
  dayOfWeek: string
  timeRange: string
  dateRange: string
  teacherName: string
  classroomName: string
  totalCount: number
  availableCount: number
}

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

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const groupedSchedules = computed<ScheduleGroup[]>(() => {
  const groupMap = new Map<string, {
    schedules: Schedule[]
    dayOfWeek: string
    teacherName: string
    classroomName: string
  }>()

  for (const schedule of props.schedules) {
    const teacherName = schedule.teacher?.name || ''
    const classroomName = schedule.classroom?.name || ''
    const timeRange = props.formatTimeRange(schedule.start_time, schedule.end_time)
    const key = [schedule.day_of_week, timeRange, teacherName, classroomName].join('||')

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        schedules: [],
        dayOfWeek: schedule.day_of_week,
        teacherName,
        classroomName,
      })
    }

    groupMap.get(key)!.schedules.push(schedule)
  }

  return Array.from(groupMap.entries())
    .map(([key, group]) => {
      const sorted = [...group.schedules].sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      )
      const availableSchedules = sorted.filter(
        (item) => (item.max_students - item.booked_count) > 0,
      )
      const representative = availableSchedules[0] || sorted[0]
      const firstDate = sorted[0]?.start_time || ''
      const lastDate = sorted[sorted.length - 1]?.start_time || ''

      return {
        key,
        representativeId: representative?.id || '',
        dayOfWeek: group.dayOfWeek,
        timeRange: representative
          ? props.formatTimeRange(representative.start_time, representative.end_time)
          : '',
        dateRange: `${formatDate(firstDate)} 至 ${formatDate(lastDate)}`,
        teacherName: group.teacherName,
        classroomName: group.classroomName,
        totalCount: sorted.length,
        availableCount: availableSchedules.length,
      }
    })
    .filter((group) => !!group.representativeId)
})

const onToggle = (group: ScheduleGroup) => {
  if (group.availableCount <= 0 && !props.selectedScheduleIds.includes(group.representativeId)) return
  emit('toggle', group.representativeId)
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
  grid-template-columns: 1fr;
  gap: 24rpx;
}

.schedule-card {
  position: relative;
  background: linear-gradient(180deg, #fbfcfd 0%, #f7f8fa 100%);
  border: 2rpx solid #edf0f2;
  border-radius: 24rpx;
  padding: 28rpx;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  min-height: 280rpx;

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
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20rpx;

    &__main {
      min-width: 0;
      flex: 1;
      padding-right: 16rpx;
    }

    .schedule-summary {
      display: flex;
      flex-direction: column;
      gap: 8rpx;
      word-break: break-word;

      &__date {
        font-size: 26rpx;
        font-weight: 500;
        color: #7b8492;
        line-height: 1.4;
      }

      &__slot {
        font-size: 30rpx;
        font-weight: 700;
        color: #2b2f36;
        line-height: 1.45;
      }
    }

    .time-range {
      font-size: 28rpx;
      color: #5b6472;
      font-weight: 600;
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      line-height: 1.3;
    }

    .lesson-badge {
      flex-shrink: 0;
      padding: 8rpx 18rpx;
      border-radius: 999rpx;
      background: rgba(82, 196, 26, 0.1);
      color: $uni-color-primary;
      font-size: 22rpx;
      font-weight: 700;
      line-height: 1.2;
    }
  }

  .card-body {
    margin-bottom: 20rpx;

    .info-item {
      display: flex;
      align-items: flex-start;
      gap: 12rpx;
      margin-bottom: 12rpx;
      min-height: 36rpx;

      &:last-child { margin-bottom: 0; }

      .info-label {
        width: 56rpx;
        flex-shrink: 0;
        font-size: 22rpx;
        color: #9aa1ad;
        line-height: 1.6;
      }

      .info-content {
        display: flex;
        align-items: center;
        min-width: 0;
        flex: 1;
      }

      .info-icon {
        font-size: 24rpx;
        color: #999;
        margin-right: 8rpx;
        flex-shrink: 0;
      }

      .info-text {
        font-size: 24rpx;
        color: #4f5663;
        line-height: 1.5;
        word-break: break-all;
      }
    }
  }

  &.active {
    .schedule-summary__slot {
      color: $uni-color-primary;
    }
  }

  .card-footer {
    border-top: 2rpx solid rgba(0, 0, 0, 0.04);
    padding-top: 16rpx;
    display: flex;
    align-items: center;
    justify-content: flex-end;

    .stock-info {
      font-size: 22rpx;
      color: #7d8592;
      text-align: right;

      &.warning {
        color: #f5222d;
        font-weight: 600;
      }
    }
  }
}
</style>
