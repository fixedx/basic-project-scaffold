<template>
  <view class="courses-page">
    <!-- 页面标题 -->
    <view class="page-header">
      <text class="page-title">授课课程</text>
      <text class="page-desc">共 {{ courseList.length }} 门课程</text>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-wrap">
      <wd-loading />
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 课程列表 -->
    <view v-else-if="courseList.length > 0" class="course-list">
      <view
        v-for="course in courseList"
        :key="course.id"
        class="course-card"
        @click="goToCourseDetail(course.id)"
      >
        <!-- 课程封面 -->
        <AsyncImage
          v-if="course.slider_imgs && course.slider_imgs.length > 0"
          :url="course.slider_imgs[0]"
          width="180rpx"
          height="180rpx"
          mode="aspectFill"
          custom-class="course-cover"
        />
        <view v-else class="course-cover-placeholder">
          <text class="iconfont icon-catalog" style="font-size: 56rpx; color: #ccc;"></text>
        </view>

        <!-- 课程信息 -->
        <view class="course-info">
          <text class="course-title">{{ course.title }}</text>

          <!-- 课程标签 -->
          <view class="course-tags">
            <view class="type-tag" :class="course.type === 'trial' ? 'tag-trial' : 'tag-standard'">
              {{ course.type === 'trial' ? '试听课' : '正式课' }}
            </view>
            <view class="status-tag" :class="course.is_online ? 'tag-online' : 'tag-offline'">
              {{ course.is_online ? '已上架' : '已下架' }}
            </view>
          </view>

          <!-- 课程元信息 -->
          <view class="course-meta">
            <text v-if="course.lesson_duration" class="meta-item">
              {{ course.lesson_duration }}分钟/节
            </text>
            <text v-if="course.min_age || course.max_age" class="meta-item">
              {{ course.min_age || 0 }}-{{ course.max_age || 99 }}岁
            </text>
          </view>

          <!-- 排课/学员统计 -->
          <view class="course-stats">
            <view class="stat-item">
              <text class="iconfont icon-time" style="font-size: 24rpx; color: #52c41a;"></text>
              <text class="stat-text">{{ course.schedule_count }} 节排课</text>
            </view>
            <view class="stat-item">
              <text class="iconfont icon-smile" style="font-size: 24rpx; color: #1890ff;"></text>
              <text class="stat-text">{{ course.total_students }} 名学员</text>
            </view>
          </view>

          <!-- 最近排课 -->
          <view v-if="course.next_schedule_time" class="next-schedule">
            <text class="next-label">下次上课：</text>
            <text class="next-time">{{ formatDateTime(course.next_schedule_time) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else class="empty-state">
      <text class="empty-icon">📚</text>
      <text class="empty-title">暂无授课课程</text>
      <text class="empty-desc">您还未被分配任何课程的排课</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { teacherApi, type TeacherCourse } from '@/api/teacher'
import AsyncImage from '@/components/AsyncImage/index.vue'

const loading = ref(true)
const courseList = ref<TeacherCourse[]>([])

/**
 * 加载课程列表
 */
const loadCourses = async () => {
  loading.value = true
  try {
    const result = await teacherApi.getMyCourses()
    courseList.value = result || []
  } catch (error) {
    console.error('加载授课课程失败:', error)
    courseList.value = []
  } finally {
    loading.value = false
  }
}

/**
 * 跳转到课程详情
 */
const goToCourseDetail = (courseId: string) => {
  uni.navigateTo({
    url: `/pages/course-detail/index?id=${courseId}`
  })
}

/**
 * 格式化日期时间
 */
const formatDateTime = (dateStr: string) => {
  const date = new Date(dateStr)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

onShow(() => {
  loadCourses()
})
</script>

<style lang="scss" scoped>
.courses-page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
  padding: 24rpx;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  padding: 0 8rpx;

  .page-title {
    font-size: 34rpx;
    font-weight: bold;
    color: $uni-text-color;
  }

  .page-desc {
    font-size: 26rpx;
    color: $uni-text-color-tertiary;
  }
}

/* 加载状态 */
.loading-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;

  .loading-text {
    font-size: 28rpx;
    color: $uni-text-color-tertiary;
    margin-top: 24rpx;
  }
}

/* 课程卡片 */
.course-card {
  display: flex;
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);

  &:active {
    opacity: 0.9;
  }
}

.course-cover-placeholder {
  width: 180rpx;
  height: 180rpx;
  border-radius: 12rpx;
  background-color: $uni-bg-color-grey;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 24rpx;
}

:deep(.course-cover) {
  width: 180rpx !important;
  height: 180rpx !important;
  border-radius: 12rpx !important;
  flex-shrink: 0;
  margin-right: 24rpx;
  overflow: hidden;

  image {
    border-radius: 12rpx !important;
  }
}

.course-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.course-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $uni-text-color;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.course-tags {
  display: flex;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.type-tag,
.status-tag {
  display: inline-block;
  padding: 2rpx 12rpx;
  font-size: 22rpx;
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

.tag-online {
  background-color: #f6ffed;
  color: #52c41a;
}

.tag-offline {
  background-color: #f5f5f5;
  color: #999;
}

.course-meta {
  display: flex;
  gap: 16rpx;
  margin-bottom: 8rpx;

  .meta-item {
    font-size: 24rpx;
    color: $uni-text-color-tertiary;
  }
}

.course-stats {
  display: flex;
  gap: 24rpx;
  margin-bottom: 4rpx;

  .stat-item {
    display: flex;
    align-items: center;
    gap: 6rpx;
  }

  .stat-text {
    font-size: 24rpx;
    color: $uni-text-color-secondary;
  }
}

.next-schedule {
  display: flex;
  align-items: center;

  .next-label {
    font-size: 22rpx;
    color: $uni-text-color-tertiary;
  }

  .next-time {
    font-size: 22rpx;
    color: $uni-color-primary;
    font-weight: 500;
  }
}

/* 空状态 */
.empty-state {
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
</style>
