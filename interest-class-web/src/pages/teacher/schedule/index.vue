<template>
  <view class="page">
    <!-- 自定义导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content" :style="{ height: navBarHeight + 'px' }">
        <text class="nav-title">我的课表</text>
      </view>
    </view>

    <!-- 占位符 -->
    <view :style="{ height: (statusBarHeight + navBarHeight) + 'px' }"></view>

    <!-- 日期导航 -->
    <view class="date-navigator">
      <view class="nav-control" @click="prevWeek">
        <text class="iconfont icon-left"></text>
      </view>
      <view class="date-range" @click="goToToday">
        <text class="date-text">{{ weekRangeText }}</text>
      </view>
      <view class="nav-control" @click="nextWeek">
        <text class="iconfont icon-right"></text>
      </view>
    </view>

    <!-- 星期选择 -->
    <view class="weekday-tabs">
      <view
        v-for="(day, index) in weekDays"
        :key="index"
        class="weekday-item"
        :class="{ active: selectedDayIndex === index, today: day.isToday }"
        @click="selectDay(index)"
      >
        <text class="day-name">{{ day.name }}</text>
        <text class="day-date">{{ day.date }}</text>
        <view v-if="day.hasSchedule" class="dot"></view>
      </view>
    </view>

    <!-- 课程列表 -->
    <view class="schedule-list">
      <view v-if="loading" class="loading-box">
        <wd-loading />
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else-if="daySchedules.length === 0" class="empty-box">
        <view class="empty-icon">📭</view>
        <text class="empty-text">当天暂无排课</text>
        <text class="empty-tip">休息一下吧~</text>
      </view>

      <view v-else class="schedule-cards">
        <view
          v-for="item in daySchedules"
          :key="item.id"
          class="schedule-card"
          @click="goToDetail(item)"
        >
          <!-- 时间线 -->
          <view class="time-col">
            <text class="time-start">{{ item.start_time }}</text>
            <view class="time-line"></view>
            <text class="time-end">{{ item.end_time }}</text>
          </view>

          <!-- 课程信息 -->
          <view class="info-col">
            <view class="card-header">
              <text class="course-title">{{ item.course_title || '课程名称' }}</text>
              <view class="status-tag" :class="getStatusClass(item)">
                <text>{{ getStatusText(item) }}</text>
              </view>
            </view>
            <view class="card-body">
              <view class="info-item">
                <text class="iconfont icon-location" style="font-size: 24rpx;"></text>
                <text>{{ item.classroom_name || '教室待定' }}</text>
              </view>
              <view class="info-item">
                <text class="iconfont icon-vip" style="font-size: 24rpx;"></text>
                <text>{{ item.student_count || 0 }}人已预约</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部占位（为 tabbar 留空间） -->
    <view style="height: 140rpx;"></view>

    <!-- 自定义 TabBar -->
    <CustomTabbar />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import CustomTabbar from '@/components/CustomTabbar/index.vue'
import { scheduleApi } from '@/api/schedule'

// 系统信息
const statusBarHeight = ref(0)
const navBarHeight = ref(44)

// 状态
const loading = ref(false)
const selectedDayIndex = ref(0)
const currentWeekOffset = ref(0) // 0=本周, 1=下周, -1=上周

// 模拟课程数据
const schedules = ref<any[]>([])

// 计算当前周的日期
const weekDays = computed(() => {
  const today = new Date()
  const dayOfWeek = today.getDay() || 7 // 1=周一 ... 7=周日
  const monday = new Date(today)
  monday.setDate(today.getDate() - dayOfWeek + 1 + currentWeekOffset.value * 7)

  const days = []
  const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const isToday = d.toDateString() === today.toDateString()

    days.push({
      name: dayNames[i],
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      fullDate: formatFullDate(d),
      isToday,
      hasSchedule: schedules.value.some(s => s.date === formatFullDate(d)),
    })
  }

  return days
})

/** 周范围文本 */
const weekRangeText = computed(() => {
  if (weekDays.value.length < 7) return ''
  return `${weekDays.value[0].date} - ${weekDays.value[6].date}`
})

/** 当天课程列表 */
const daySchedules = computed(() => {
  const selectedDate = weekDays.value[selectedDayIndex.value]?.fullDate
  if (!selectedDate) return []
  return schedules.value
    .filter(s => s.date === selectedDate)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
})

const formatFullDate = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const prevWeek = () => {
  currentWeekOffset.value--
  loadSchedules()
}

const nextWeek = () => {
  currentWeekOffset.value++
  loadSchedules()
}

const goToToday = () => {
  currentWeekOffset.value = 0
  // 选中今天
  const todayIndex = weekDays.value.findIndex(d => d.isToday)
  if (todayIndex !== -1) {
    selectedDayIndex.value = todayIndex
  }
  loadSchedules()
}

const selectDay = (index: number) => {
  selectedDayIndex.value = index
}

const getStatusClass = (item: any) => {
  if (item.is_completed) return 'completed'
  if (item.is_ongoing) return 'ongoing'
  return 'upcoming'
}

const getStatusText = (item: any) => {
  if (item.is_completed) return '已结束'
  if (item.is_ongoing) return '进行中'
  return '待上课'
}

const goToDetail = (item: any) => {
  uni.navigateTo({ url: `/pages/teacher/attendance-detail/index?id=${item.id}` })
}

/** 将 ISO 时间字符串格式化为 HH:mm */
const formatTime = (iso: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

/** 加载课程数据 */
const loadSchedules = async () => {
  loading.value = true
  try {
    const teacherId = uni.getStorageSync('teacherId')
    if (!teacherId) {
      schedules.value = []
      return
    }

    // 计算本周起止日期
    const start = weekDays.value[0]?.fullDate
    const end = weekDays.value[6]?.fullDate

    const res = await scheduleApi.getList({
      teacher_id: teacherId,
      start_date: start,
      end_date: end,
      pageSize: 200,
    })

    const rawList = Array.isArray(res) ? res : (res as any)?.data ?? []

    // 将 API 返回的排课映射为页面所需格式
    schedules.value = rawList.map((s: any) => {
      const startDate = s.start_time ? new Date(s.start_time) : null
      const date = startDate ? formatFullDate(startDate) : ''
      return {
        id: s.id,
        date,
        start_time: formatTime(s.start_time),
        end_time: formatTime(s.end_time),
        course_title: s.course?.title || '',
        classroom_name: s.classroom?.name || '',
        student_count: s.booked_count || 0,
        is_completed: s.status === 'completed',
        is_ongoing: s.status === 'in_progress',
      }
    })
  } catch (error) {
    console.error('加载课表失败:', error)
    schedules.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 0

  // 默认选中今天
  goToToday()
})


</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background-color: $uni-bg-color;
  z-index: 100;
}

.nav-content {
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: $uni-text-color;
}

.date-navigator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx 32rpx;
  background-color: $uni-bg-color;
  gap: 24rpx;
}

.nav-control {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 28rpx;
  background-color: $uni-bg-color-grey;

  .iconfont {
    font-size: 28rpx;
    color: $uni-text-color-secondary;
  }
}

.date-range {
  padding: 8rpx 24rpx;
  border-radius: 32rpx;
  background-color: $uni-color-primary-lighter;
}

.date-text {
  font-size: 28rpx;
  font-weight: 500;
  color: $uni-color-primary;
}

.weekday-tabs {
  display: flex;
  padding: 16rpx 16rpx 24rpx;
  background-color: $uni-bg-color;
  border-bottom: 1rpx solid $uni-border-color-light;
  gap: 8rpx;
}

.weekday-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12rpx 0;
  border-radius: 12rpx;
  position: relative;
  transition: all 0.3s;

  .day-name {
    font-size: 22rpx;
    color: $uni-text-color-tertiary;
    margin-bottom: 6rpx;
  }

  .day-date {
    font-size: 26rpx;
    color: $uni-text-color;
    font-weight: 500;
  }

  .dot {
    width: 8rpx;
    height: 8rpx;
    border-radius: 4rpx;
    background-color: $uni-color-primary;
    margin-top: 6rpx;
  }

  &.active {
    background-color: $uni-color-primary;

    .day-name,
    .day-date {
      color: $uni-text-color-inverse;
    }

    .dot {
      background-color: $uni-text-color-inverse;
    }
  }

  &.today:not(.active) {
    .day-date {
      color: $uni-color-primary;
    }
  }
}

.schedule-list {
  padding: 24rpx;
}

.loading-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}

.loading-text {
  font-size: 26rpx;
  color: $uni-text-color-tertiary;
  margin-top: 16rpx;
}

.empty-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 30rpx;
  color: $uni-text-color-secondary;
  margin-bottom: 8rpx;
}

.empty-tip {
  font-size: 26rpx;
  color: $uni-text-color-tertiary;
}

.schedule-cards {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.schedule-card {
  display: flex;
  background-color: $uni-bg-color;
  border-radius: 16rpx;
  padding: 28rpx;
  gap: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);

  &:active {
    background-color: $uni-bg-color-tertiary;
  }
}

.time-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100rpx;
  flex-shrink: 0;

  .time-start,
  .time-end {
    font-size: 26rpx;
    color: $uni-text-color;
    font-weight: 500;
  }

  .time-line {
    width: 2rpx;
    flex: 1;
    min-height: 40rpx;
    background-color: $uni-border-color-secondary;
    margin: 8rpx 0;
  }
}

.info-col {
  flex: 1;
  min-width: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.course-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $uni-text-color;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-tag {
  flex-shrink: 0;
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  margin-left: 12rpx;

  &.upcoming {
    background-color: $uni-color-primary-lighter;
    color: $uni-color-primary;
  }

  &.ongoing {
    background-color: rgba(24, 144, 255, 0.1);
    color: $uni-color-info;
  }

  &.completed {
    background-color: $uni-bg-color-grey;
    color: $uni-text-color-tertiary;
  }
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 24rpx;
  color: $uni-text-color-secondary;
}
</style>
