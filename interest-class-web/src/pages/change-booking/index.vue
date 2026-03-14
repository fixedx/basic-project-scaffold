<template>
  <view class="page">
    <!-- 加载状态 -->
    <view class="loading-state" v-if="loading">
      <Loading text="加载中..." />
    </view>

    <view class="content" v-else-if="booking">
      <!-- 课程信息 -->
      <view class="course-info" v-if="course">
        <text class="course-name">{{ course.title }}</text>
        <text class="course-subtitle">{{ course.subtitle }}</text>
      </view>

      <!-- 当前预约信息 -->
      <view class="section">
        <view class="section-title">当前预约时段</view>
        <view class="current-booking">
          <view class="booking-info">
            <text class="day">{{ getDayLabel(currentSchedule?.day_of_week) }}</text>
            <text class="time">{{ formatTime(currentSchedule?.start_time) }} - {{ formatTime(currentSchedule?.end_time) }}</text>
          </view>
          <view class="booking-meta" v-if="currentSchedule?.teacher_name">
            <text class="iconfont icon-customer"></text>
            <text>{{ currentSchedule.teacher_name }}</text>
          </view>
        </view>
      </view>

      <!-- 可选排课列表 -->
      <view class="section">
        <view class="section-title">选择新的时段</view>
        <view class="schedule-list">
          <view
            v-for="schedule in schedules"
            :key="schedule.id"
            class="schedule-item"
            :class="{ 
              active: newScheduleId === schedule.id,
              current: schedule.id === booking.schedule_id,
              disabled: isScheduleFull(schedule) && schedule.id !== booking.schedule_id
            }"
            @click="selectSchedule(schedule)"
          >
            <view class="schedule-main">
              <view class="schedule-time">
                <text class="day">{{ getDayLabel(schedule.day_of_week) }}</text>
                <text class="time">{{ formatTime(schedule.start_time) }} - {{ formatTime(schedule.end_time) }}</text>
              </view>
              <view class="schedule-info">
                <text class="teacher" v-if="schedule.teacher">
                  <text class="iconfont icon-customer"></text>
                  {{ schedule.teacher.name }}
                </text>
                <text class="classroom" v-if="schedule.classroom">
                  <text class="iconfont icon-location"></text>
                  {{ schedule.classroom.name }}
                </text>
              </view>
            </view>
            <view class="schedule-meta">
              <template v-if="schedule.id === booking.schedule_id">
                <text class="current-tag">当前</text>
              </template>
              <template v-else-if="isScheduleFull(schedule)">
                <text class="full-tag">已满</text>
              </template>
              <template v-else>
                <text class="spots">剩余{{ schedule.max_students - schedule.booked_count }}位</text>
                <view class="check-icon" v-if="newScheduleId === schedule.id">
                  <text class="iconfont icon-check"></text>
                </view>
              </template>
            </view>
          </view>
        </view>
      </view>

      <!-- 24小时提示 -->
      <view class="warning-tip" v-if="needsApproval">
        <text class="iconfont icon-warning"></text>
        <text>距离上课时间不足24小时，修改需要机构审核</text>
      </view>
    </view>

    <!-- 空状态 -->
    <EmptyState 
      v-if="!loading && !booking" 
      icon="icon-calendar" 
      text="预约不存在" 
    />

    <!-- 底部操作栏 -->
    <PageFooter v-if="canSubmit">
      <wd-button 
        type="primary" 
        block 
        :loading="submitting"
        @click="handleSubmit"
      >
        {{ needsApproval ? '提交审核' : '确认修改' }}
      </wd-button>
    </PageFooter>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { bookingApi, type Booking } from '@/api/booking'
import { courseApi, type Course } from '@/api/course'
import { scheduleApi, type Schedule } from '@/api/schedule'
import Loading from '@/components/Loading/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'
import EmptyState from '@/components/EmptyState/index.vue'
import { showSuccessToast, showErrorToast } from '@/utils/toast'

// 页面参数
const bookingId = ref('')

// 数据
const loading = ref(true)
const submitting = ref(false)
const booking = ref<Booking | null>(null)
const course = ref<Course | null>(null)
const schedules = ref<Schedule[]>([])
const currentSchedule = ref<any>(null)

// 选择的新排课
const newScheduleId = ref('')

// 是否需要审核（距离上课时间不足24小时）
const needsApproval = computed(() => {
  if (!currentSchedule.value?.start_time) return false
  const startTime = new Date(currentSchedule.value.start_time)
  const now = new Date()
  const hoursUntilClass = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60)
  return hoursUntilClass < 24
})

// 是否可以提交
const canSubmit = computed(() => {
  return booking.value && 
    newScheduleId.value && 
    newScheduleId.value !== booking.value.schedule_id
})

onLoad((options: any) => {
  if (options.bookingId) {
    bookingId.value = options.bookingId
  }
})

onMounted(async () => {
  await loadData()
})

// 加载数据
async function loadData() {
  if (!bookingId.value) {
    showErrorToast('缺少预约参数')
    return
  }

  loading.value = true
  try {
    // 1. 加载预约详情
    booking.value = await bookingApi.getDetail(bookingId.value)
    
    if (!booking.value) {
      showErrorToast('预约不存在')
      return
    }

    // 2. 加载课程详情
    if (booking.value.course_id) {
      course.value = await courseApi.getDetail(booking.value.course_id)
    }

    // 3. 加载排课列表
    if (booking.value.course_id) {
      const scheduleList = await scheduleApi.getByCourse(booking.value.course_id)
      schedules.value = scheduleList || []
      
      // 找到当前预约的排课
      currentSchedule.value = schedules.value.find(s => s.id === booking.value?.schedule_id)
    }
  } catch (error: any) {
    console.error('加载数据失败:', error)
    showErrorToast(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

// 判断排课是否已满
function isScheduleFull(schedule: Schedule): boolean {
  return schedule.booked_count >= schedule.max_students
}

// 选择排课
function selectSchedule(schedule: Schedule) {
  // 不能选择当前排课
  if (schedule.id === booking.value?.schedule_id) return
  // 不能选择已满的排课
  if (isScheduleFull(schedule)) return
  
  newScheduleId.value = schedule.id
}

// 提交修改
async function handleSubmit() {
  if (!booking.value || !newScheduleId.value) return
  if (newScheduleId.value === booking.value.schedule_id) return

  submitting.value = true
  try {
    await bookingApi.changeSchedule(bookingId.value, newScheduleId.value)
    
    if (needsApproval.value) {
      showSuccessToast('已提交审核')
    } else {
      showSuccessToast('修改成功')
    }
    
    // 返回上一页
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (error: any) {
    showErrorToast(error.message || '修改失败')
  } finally {
    submitting.value = false
  }
}

// 获取星期几标签
function getDayLabel(day: string | number | undefined): string {
  if (day === undefined || day === null) return ''
  const dayLabels: Record<string, string> = {
    '0': '周日',
    '1': '周一',
    '2': '周二',
    '3': '周三',
    '4': '周四',
    '5': '周五',
    '6': '周六',
  }
  return dayLabels[String(day)] || `周${day}`
}

// 格式化时间
function formatTime(timeStr: string | undefined): string {
  if (!timeStr) return ''
  // 如果是 ISO 时间格式，提取时间部分
  if (timeStr.includes('T')) {
    const date = new Date(timeStr)
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }
  return timeStr
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding-top: 200rpx;
}

.content {
  padding: 24rpx 32rpx 200rpx;
}

.course-info {
  background-color: $uni-bg-color;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  
  .course-name {
    display: block;
    font-size: 32rpx;
    font-weight: 600;
    color: $uni-text-color;
    margin-bottom: 8rpx;
  }
  
  .course-subtitle {
    display: block;
    font-size: 26rpx;
    color: $uni-text-color-secondary;
  }
}

.section {
  background-color: $uni-bg-color;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: $uni-text-color;
  margin-bottom: 20rpx;
}

// 当前预约
.current-booking {
  padding: 20rpx 24rpx;
  background-color: $uni-bg-color-grey;
  border-radius: 12rpx;
  border-left: 6rpx solid $uni-color-primary;
  
  .booking-info {
    margin-bottom: 8rpx;
    
    .day {
      font-size: 28rpx;
      font-weight: 500;
      color: $uni-text-color;
      margin-right: 16rpx;
    }
    
    .time {
      font-size: 26rpx;
      color: $uni-text-color-secondary;
    }
  }
  
  .booking-meta {
    display: flex;
    align-items: center;
    gap: 8rpx;
    font-size: 24rpx;
    color: $uni-text-color-tertiary;
  }
}

// 排课列表
.schedule-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.schedule-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  background-color: $uni-bg-color-grey;
  border-radius: 12rpx;
  border: 2rpx solid transparent;
  transition: all 0.3s;
  
  &.active {
    background-color: $uni-color-primary-lighter;
    border-color: $uni-color-primary;
  }
  
  &.current {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    
    .schedule-time .day,
    .schedule-time .time {
      color: $uni-text-color-tertiary;
    }
  }
  
  .schedule-main {
    flex: 1;
  }
  
  .schedule-time {
    margin-bottom: 8rpx;
    
    .day {
      font-size: 28rpx;
      font-weight: 500;
      color: $uni-text-color;
      margin-right: 16rpx;
    }
    
    .time {
      font-size: 26rpx;
      color: $uni-text-color-secondary;
    }
  }
  
  .schedule-info {
    display: flex;
    align-items: center;
    gap: 24rpx;
    
    .teacher, .classroom {
      font-size: 24rpx;
      color: $uni-text-color-tertiary;
      
      .iconfont {
        margin-right: 4rpx;
      }
    }
  }
  
  .schedule-meta {
    display: flex;
    align-items: center;
    gap: 12rpx;
    
    .spots {
      font-size: 24rpx;
      color: $uni-color-primary;
    }
    
    .current-tag {
      font-size: 22rpx;
      color: $uni-text-color-tertiary;
      padding: 4rpx 12rpx;
      background-color: $uni-border-color-light;
      border-radius: 8rpx;
    }
    
    .full-tag {
      font-size: 22rpx;
      color: $uni-color-error;
      padding: 4rpx 12rpx;
      background-color: #fff2f0;
      border-radius: 8rpx;
    }
  }
  
  .check-icon {
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    background-color: $uni-color-primary;
    display: flex;
    align-items: center;
    justify-content: center;
    
    .iconfont {
      font-size: 24rpx;
      color: #fff;
    }
  }
}

// 24小时提示
.warning-tip {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 24rpx;
  background-color: #fff7e6;
  border-radius: 12rpx;
  
  .iconfont {
    font-size: 32rpx;
    color: #fa8c16;
  }
  
  text:last-child {
    font-size: 26rpx;
    color: #d46b08;
    flex: 1;
  }
}
</style>
