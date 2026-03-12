<template>
  <view class="page">
    <!-- 自定义导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content" :style="{ height: navBarHeight + 'px' }">
        <text class="nav-title">考勤管理</text>
      </view>
    </view>

    <!-- 占位符 -->
    <view :style="{ height: (statusBarHeight + navBarHeight) + 'px' }"></view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-box">
      <wd-loading />
      <text class="loading-text">加载中...</text>
    </view>

    <template v-else>
      <!-- 总体统计 -->
      <view v-if="courseList.length > 0" class="stats-header">
        <view class="stats-row">
          <view class="stat-card">
            <text class="stat-num">{{ overallStats.totalCourses }}</text>
            <text class="stat-label">课程数</text>
          </view>
          <view class="stat-card">
            <text class="stat-num">{{ overallStats.totalStudents }}</text>
            <text class="stat-label">学员数</text>
          </view>
          <view class="stat-card primary">
            <text class="stat-num">{{ overallStats.totalCheckIns }}</text>
            <text class="stat-label">签到次数</text>
          </view>
          <view class="stat-card" :class="rateClass(overallStats.avgRate)">
            <text class="stat-num">{{ overallStats.avgRate }}%</text>
            <text class="stat-label">出勤率</text>
          </view>
        </view>
      </view>

      <!-- 课程列表 -->
      <view v-if="courseList.length > 0" class="course-list">
        <view class="section-title">
          <text>按课程查看考勤</text>
          <text class="section-count">共 {{ courseList.length }} 门课程</text>
        </view>

        <view
          v-for="course in courseList"
          :key="course.id"
          class="course-card"
          @click="goToDetail(course.id)"
        >
          <view class="card-top">
            <!-- 课程封面 -->
            <AsyncImage
              v-if="course.slider_imgs && course.slider_imgs.length > 0"
              :url="course.slider_imgs[0]"
              width="120rpx"
              height="120rpx"
              mode="aspectFill"
              custom-class="card-cover"
            />
            <view v-else class="card-cover-placeholder">
              <text class="iconfont icon-catalog" style="font-size: 48rpx; color: #ccc;"></text>
            </view>

            <view class="card-info">
              <view class="card-title-row">
                <text class="card-title">{{ course.title }}</text>
                <view class="type-tag" :class="course.type === 'trial' ? 'tag-trial' : 'tag-standard'">
                  {{ course.type === 'trial' ? '试听' : '正式' }}
                </view>
              </view>
              <text class="card-sub">{{ course.total_schedules }} 节排课 · {{ course.total_students }} 名学员</text>
            </view>

            <text class="iconfont icon-right" style="font-size: 28rpx; color: #ccc;"></text>
          </view>

          <!-- 考勤进度条 -->
          <view class="card-bottom">
            <view class="progress-bar-wrap">
              <view class="progress-bar-bg">
                <view
                  class="progress-bar-fill"
                  :style="{ width: course.attendance_rate + '%' }"
                  :class="fillClass(course.attendance_rate)"
                ></view>
              </view>
              <text class="progress-text">出勤率 {{ course.attendance_rate }}%</text>
            </view>
            <view class="check-in-summary">
              <text class="summary-checked">{{ course.total_check_ins }}</text>
              <text class="summary-sep">/</text>
              <text class="summary-total">{{ course.total_bookings }}</text>
              <text class="summary-unit">人次</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-else class="empty-box">
        <text class="empty-icon">📋</text>
        <text class="empty-title">暂无考勤数据</text>
        <text class="empty-desc">您还未被分配任何课程的排课</text>
      </view>
    </template>

    <!-- 底部占位 -->
    <view style="height: 140rpx;"></view>

    <!-- 自定义 TabBar -->
    <CustomTabbar />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { teacherApi, type AttendanceCourse } from '@/api/teacher'
import AsyncImage from '@/components/AsyncImage/index.vue'
import CustomTabbar from '@/components/CustomTabbar/index.vue'

// 系统信息
const statusBarHeight = ref(0)
const navBarHeight = ref(44)

const loading = ref(true)
const courseList = ref<AttendanceCourse[]>([])

// 总体统计
const overallStats = computed(() => {
  const courses = courseList.value
  const totalCourses = courses.length
  const totalStudents = courses.reduce((s, c) => s + c.total_students, 0)
  const totalCheckIns = courses.reduce((s, c) => s + c.total_check_ins, 0)
  const totalBookings = courses.reduce((s, c) => s + c.total_bookings, 0)
  const avgRate = totalBookings > 0 ? Math.round((totalCheckIns / totalBookings) * 100) : 0
  return { totalCourses, totalStudents, totalCheckIns, avgRate }
})

/** 出勤率颜色 class */
const rateClass = (rate: number) => {
  if (rate >= 80) return 'success'
  if (rate >= 50) return 'warning'
  return 'danger'
}

/** 进度条颜色 class */
const fillClass = (rate: number) => {
  if (rate >= 80) return 'fill-green'
  if (rate >= 50) return 'fill-yellow'
  return 'fill-red'
}

/**
 * 加载考勤课程列表
 */
const loadData = async () => {
  loading.value = true
  try {
    const result = await teacherApi.getMyAttendanceCourses()
    courseList.value = result || []
  } catch (error) {
    console.error('加载考勤数据失败:', error)
    courseList.value = []
  } finally {
    loading.value = false
  }
}

/**
 * 跳转到课程考勤详情
 */
const goToDetail = (courseId: string) => {
  uni.navigateTo({
    url: `/pages/teacher/attendance-detail/index?courseId=${courseId}`
  })
}

onMounted(() => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 0
})

onShow(() => {
  loadData()
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

/* 总体统计 */
.stats-header {
  padding: 24rpx;
}

.stats-row {
  display: flex;
  gap: 16rpx;
}

.stat-card {
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

  &.primary .stat-num {
    color: $uni-color-primary;
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

/* 课程列表 */
.course-list {
  padding: 0 24rpx;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding: 0 4rpx;

  text {
    font-size: 30rpx;
    font-weight: 600;
    color: $uni-text-color;
  }

  .section-count {
    font-size: 26rpx;
    font-weight: 400;
    color: $uni-text-color-tertiary;
  }
}

.course-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);

  &:active {
    opacity: 0.9;
  }
}

.card-top {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

:deep(.card-cover) {
  width: 120rpx !important;
  height: 120rpx !important;
  border-radius: 10rpx !important;
  flex-shrink: 0;
  margin-right: 20rpx;
  overflow: hidden;

  image {
    border-radius: 10rpx !important;
  }
}

.card-cover-placeholder {
  width: 120rpx;
  height: 120rpx;
  border-radius: 10rpx;
  background-color: $uni-bg-color-grey;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 20rpx;
}

.card-info {
  flex: 1;
  min-width: 0;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 8rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $uni-text-color;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.type-tag {
  flex-shrink: 0;
  font-size: 22rpx;
  padding: 2rpx 12rpx;
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

.card-sub {
  font-size: 26rpx;
  color: $uni-text-color-tertiary;
}

/* 考勤进度 */
.card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16rpx;
  border-top: 1rpx solid $uni-border-color-light;
}

.progress-bar-wrap {
  flex: 1;
  margin-right: 24rpx;
}

.progress-bar-bg {
  height: 12rpx;
  background-color: $uni-bg-color-grey;
  border-radius: 6rpx;
  overflow: hidden;
  margin-bottom: 6rpx;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 6rpx;
  transition: width 0.3s ease;
}

.fill-green {
  background-color: $uni-color-success;
}

.fill-yellow {
  background-color: $uni-color-warning;
}

.fill-red {
  background-color: $uni-color-error;
}

.progress-text {
  font-size: 22rpx;
  color: $uni-text-color-tertiary;
}

.check-in-summary {
  flex-shrink: 0;
  display: flex;
  align-items: baseline;

  .summary-checked {
    font-size: 32rpx;
    font-weight: 700;
    color: $uni-color-primary;
  }

  .summary-sep {
    font-size: 24rpx;
    color: $uni-text-color-tertiary;
    margin: 0 4rpx;
  }

  .summary-total {
    font-size: 28rpx;
    font-weight: 500;
    color: $uni-text-color-secondary;
  }

  .summary-unit {
    font-size: 22rpx;
    color: $uni-text-color-tertiary;
    margin-left: 4rpx;
  }
}
</style>