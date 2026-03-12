<template>
  <view class="page">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-box">
      <wd-loading />
      <text class="loading-text">加载中...</text>
    </view>

    <template v-else-if="detail">
      <!-- 课程信息头 -->
      <view class="course-header">
        <text class="course-title">{{ detail.course?.title || '课程考勤详情' }}</text>
        <view class="type-tag" :class="detail.course?.type === 'trial' ? 'tag-trial' : 'tag-standard'">
          {{ detail.course?.type === 'trial' ? '试听课' : '正式课' }}
        </view>
      </view>

      <!-- 统计卡片 -->
      <view class="stats-row">
        <view class="stat-item">
          <text class="stat-num">{{ detail.stats.total_schedules }}</text>
          <text class="stat-label">总排课</text>
        </view>
        <view class="stat-item">
          <text class="stat-num">{{ detail.stats.total_bookings }}</text>
          <text class="stat-label">应签到</text>
        </view>
        <view class="stat-item success">
          <text class="stat-num">{{ detail.stats.total_checked_in }}</text>
          <text class="stat-label">已签到</text>
        </view>
        <view class="stat-item" :class="rateClass(detail.stats.attendance_rate)">
          <text class="stat-num">{{ detail.stats.attendance_rate }}%</text>
          <text class="stat-label">出勤率</text>
        </view>
      </view>

      <!-- 排课列表 -->
      <view class="schedule-list">
        <view
          v-for="schedule in detail.schedules"
          :key="schedule.schedule_id"
          class="schedule-card"
        >
          <!-- 排课头部 -->
          <view class="schedule-header" @click="toggleSchedule(schedule.schedule_id)">
            <view class="schedule-info">
              <text class="schedule-date">{{ formatDate(schedule.start_time) }}</text>
              <text class="schedule-time">{{ formatTime(schedule.start_time) }} - {{ formatTime(schedule.end_time) }}</text>
              <text class="schedule-weekday">{{ weekdayText(schedule.day_of_week) }}</text>
            </view>
            <view class="schedule-badge">
              <text class="badge-text" :class="schedule.checked_count === schedule.total_students ? 'badge-full' : ''">
                {{ schedule.checked_count }}/{{ schedule.total_students }}
              </text>
              <text
                class="iconfont"
                :class="expandedSet.has(schedule.schedule_id) ? 'icon-arrow-thin-up' : 'icon-arrow-thin-down'"
                style="font-size: 24rpx; color: #999;"
              ></text>
            </view>
          </view>

          <!-- 学员列表（可展开/收起） -->
          <view v-if="expandedSet.has(schedule.schedule_id) && schedule.students.length > 0" class="student-list">
            <view
              v-for="student in schedule.students"
              :key="student.booking_id"
              class="student-item"
            >
              <view class="student-left">
                <view class="student-avatar" :class="student.checked_in ? 'avatar-checked' : 'avatar-unchecked'">
                  <text>{{ student.student_name?.charAt(0) || '?' }}</text>
                </view>
                <view class="student-detail">
                  <view class="student-name-row">
                    <text class="student-name">{{ student.student_name }}</text>
                    <text v-if="student.student_age" class="student-age">{{ student.student_age }}岁</text>
                  </view>
                  <text class="student-phone">{{ maskPhone(student.student_phone) }}</text>
                </view>
              </view>
              <view class="student-status" :class="student.checked_in ? 'status-checked' : 'status-absent'">
                <text class="iconfont" :class="student.checked_in ? 'icon-success' : 'icon-close'" style="font-size: 28rpx;"></text>
                <text class="status-text">{{ student.checked_in ? '已签到' : '未签到' }}</text>
                <text v-if="student.is_makeup" class="makeup-tag">补卡</text>
              </view>
            </view>
          </view>

          <!-- 无学员时 -->
          <view v-if="expandedSet.has(schedule.schedule_id) && schedule.students.length === 0" class="no-student">
            <text>暂无学员预约此排课</text>
          </view>
        </view>
      </view>

      <!-- 空排课 -->
      <view v-if="detail.schedules.length === 0" class="empty-box">
        <text class="empty-icon">📋</text>
        <text class="empty-title">暂无排课记录</text>
      </view>
    </template>

    <!-- 加载失败 -->
    <view v-else class="empty-box">
      <text class="empty-icon">😟</text>
      <text class="empty-title">加载失败</text>
      <text class="empty-desc">请返回重试</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { teacherApi, type CourseAttendanceDetail } from '@/api/teacher'

const loading = ref(true)
const detail = ref<CourseAttendanceDetail | null>(null)

// 展开/收起的排课 ID 集合
const expandedSet = reactive(new Set<string>())

/**
 * 加载课程考勤详情
 */
const loadData = async (courseId: string) => {
  loading.value = true
  try {
    const result = await teacherApi.getCourseAttendance(courseId)
    detail.value = result
    // 默认展开第一个排课
    if (result?.schedules?.length > 0) {
      expandedSet.add(result.schedules[0].schedule_id)
    }
  } catch (error) {
    console.error('加载考勤详情失败:', error)
    detail.value = null
  } finally {
    loading.value = false
  }
}

/**
 * 展开/收起排课
 */
const toggleSchedule = (scheduleId: string) => {
  if (expandedSet.has(scheduleId)) {
    expandedSet.delete(scheduleId)
  } else {
    expandedSet.add(scheduleId)
  }
}

/**
 * 出勤率颜色
 */
const rateClass = (rate: number) => {
  if (rate >= 80) return 'success'
  if (rate >= 50) return 'warning'
  return 'danger'
}

/**
 * 手机号脱敏
 */
const maskPhone = (phone: string) => {
  if (!phone || phone.length < 7) return phone
  return phone.substring(0, 3) + '****' + phone.substring(7)
}

/**
 * 格式化日期 (MM-DD)
 */
const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${m}-${day}`
}

/**
 * 格式化时间 (HH:mm)
 */
const formatTime = (dateStr: string) => {
  const d = new Date(dateStr)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

/**
 * 星期文本
 */
const weekdayText = (dow: string) => {
  const map: Record<string, string> = {
    '1': '周一',
    '2': '周二',
    '3': '周三',
    '4': '周四',
    '5': '周五',
    '6': '周六',
    '7': '周日',
  }
  return map[dow] || ''
}

onLoad((options) => {
  const courseId = options?.courseId
  if (courseId) {
    // 设置页面标题
    uni.setNavigationBarTitle({ title: '课程考勤详情' })
    loadData(courseId)
  }
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
  padding-bottom: 48rpx;
}

/* 加载和空状态 */
.loading-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;

  .loading-text {
    font-size: 26rpx;
    color: $uni-text-color-tertiary;
    margin-top: 16rpx;
  }
}

.empty-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 160rpx 0;

  .empty-icon {
    font-size: 96rpx;
    margin-bottom: 24rpx;
  }

  .empty-title {
    font-size: 30rpx;
    color: $uni-text-color;
    font-weight: 500;
    margin-bottom: 12rpx;
  }

  .empty-desc {
    font-size: 26rpx;
    color: $uni-text-color-tertiary;
  }
}

/* 课程信息头 */
.course-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 24rpx 32rpx;
  background-color: #fff;
}

.course-title {
  font-size: 34rpx;
  font-weight: 600;
  color: $uni-text-color;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.type-tag {
  flex-shrink: 0;
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 6rpx;
}

.tag-standard {
  background-color: #e6f7ff;
  color: #1890ff;
}

.tag-trial {
  background-color: #fff7e6;
  color: #fa8c16;
}

/* 统计卡片 */
.stats-row {
  display: flex;
  gap: 16rpx;
  padding: 24rpx;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 8rpx;
  background-color: #fff;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);

  .stat-num {
    font-size: 36rpx;
    font-weight: 700;
    color: $uni-text-color;
    margin-bottom: 4rpx;
  }

  .stat-label {
    font-size: 22rpx;
    color: $uni-text-color-tertiary;
  }

  &.success .stat-num {
    color: $uni-color-success;
  }

  &.warning .stat-num {
    color: $uni-color-warning;
  }

  &.danger .stat-num {
    color: $uni-color-error;
  }
}

/* 排课列表 */
.schedule-list {
  padding: 0 24rpx;
}

.schedule-card {
  background-color: #fff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.schedule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 28rpx;

  &:active {
    background-color: $uni-bg-color-grey;
  }
}

.schedule-info {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.schedule-date {
  font-size: 30rpx;
  font-weight: 600;
  color: $uni-text-color;
}

.schedule-time {
  font-size: 26rpx;
  color: $uni-text-color-secondary;
}

.schedule-weekday {
  font-size: 24rpx;
  color: $uni-text-color-tertiary;
  background-color: $uni-bg-color-grey;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
}

.schedule-badge {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.badge-text {
  font-size: 26rpx;
  font-weight: 600;
  color: $uni-text-color-secondary;

  &.badge-full {
    color: $uni-color-success;
  }
}

/* 学员列表 */
.student-list {
  border-top: 1rpx solid $uni-border-color-light;
}

.student-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 28rpx;
  border-bottom: 1rpx solid $uni-border-color-light;

  &:last-child {
    border-bottom: none;
  }
}

.student-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
  min-width: 0;
}

.student-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 600;
  flex-shrink: 0;

  &.avatar-checked {
    background-color: $uni-color-primary-lighter;
    color: $uni-color-primary;
  }

  &.avatar-unchecked {
    background-color: #fff1f0;
    color: $uni-color-error;
  }
}

.student-detail {
  flex: 1;
  min-width: 0;
}

.student-name-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 4rpx;
}

.student-name {
  font-size: 28rpx;
  font-weight: 500;
  color: $uni-text-color;
}

.student-age {
  font-size: 22rpx;
  color: $uni-color-primary;
  background-color: $uni-color-primary-lighter;
  padding: 0 10rpx;
  border-radius: 6rpx;
}

.student-phone {
  font-size: 24rpx;
  color: $uni-text-color-tertiary;
}

/* 签到状态 */
.student-status {
  display: flex;
  align-items: center;
  gap: 6rpx;
  flex-shrink: 0;
  padding: 8rpx 20rpx;
  border-radius: 24rpx;

  .status-text {
    font-size: 24rpx;
  }

  &.status-checked {
    background-color: #f6ffed;
    color: $uni-color-success;
  }

  &.status-absent {
    background-color: #fff1f0;
    color: $uni-color-error;
  }
}

.makeup-tag {
  font-size: 20rpx;
  padding: 2rpx 8rpx;
  border-radius: 4rpx;
  background-color: #fff7e6;
  color: #fa8c16;
  margin-left: 4rpx;
}

.no-student {
  text-align: center;
  padding: 32rpx;
  font-size: 26rpx;
  color: $uni-text-color-tertiary;
  border-top: 1rpx solid $uni-border-color-light;
}
</style>
