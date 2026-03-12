<template>
  <view class="students-page">
    <!-- 页面标题 -->
    <view class="page-header">
      <text class="page-title">我的学员</text>
      <text class="page-desc">共 {{ studentList.length }} 名学员</text>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-wrap">
      <wd-loading />
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 学员列表 -->
    <view v-else-if="studentList.length > 0" class="student-list">
      <view
        v-for="(student, idx) in studentList"
        :key="idx"
        class="student-card"
      >
        <!-- 头像 -->
        <view class="student-avatar">
          <text class="avatar-text">{{ student.student_name?.charAt(0) || '?' }}</text>
        </view>

        <!-- 学员信息 -->
        <view class="student-info">
          <view class="info-top">
            <text class="student-name">{{ student.student_name }}</text>
            <text v-if="student.student_age" class="student-age">{{ student.student_age }}岁</text>
          </view>

          <text class="student-phone">{{ maskPhone(student.student_phone) }}</text>

          <!-- 课程标签 -->
          <view class="course-tags" v-if="student.courses && student.courses.length > 0">
            <view
              v-for="(course, cIdx) in student.courses.slice(0, 3)"
              :key="cIdx"
              class="course-tag"
            >
              {{ course }}
            </view>
            <view v-if="student.courses.length > 3" class="course-tag more-tag">
              +{{ student.courses.length - 3 }}
            </view>
          </view>

          <!-- 底部统计 -->
          <view class="info-bottom">
            <text class="booking-count">{{ student.booking_count }} 次预约</text>
            <text v-if="student.latest_booking_time" class="latest-time">
              最近预约：{{ formatDate(student.latest_booking_time) }}
            </text>
          </view>
        </view>

        <!-- 联系按钮 -->
        <view class="action-area" @click.stop="callPhone(student.student_phone)">
          <text class="iconfont icon-phone" style="font-size: 36rpx; color: #52c41a;"></text>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else class="empty-state">
      <text class="empty-icon">👨‍🎓</text>
      <text class="empty-title">暂无学员</text>
      <text class="empty-desc">学员通过预约您的课程后将出现在这里</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { teacherApi, type TeacherStudent } from '@/api/teacher'

const loading = ref(true)
const studentList = ref<TeacherStudent[]>([])

/**
 * 加载学员列表
 */
const loadStudents = async () => {
  loading.value = true
  try {
    const result = await teacherApi.getMyStudents()
    studentList.value = result || []
  } catch (error) {
    console.error('加载学员列表失败:', error)
    studentList.value = []
  } finally {
    loading.value = false
  }
}

/**
 * 手机号脱敏
 */
const maskPhone = (phone: string) => {
  if (!phone || phone.length < 7) return phone
  return phone.substring(0, 3) + '****' + phone.substring(7)
}

/**
 * 格式化日期
 */
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${month}-${day}`
}

/**
 * 拨打电话
 */
const callPhone = (phone: string) => {
  uni.makePhoneCall({
    phoneNumber: phone,
    fail: () => {
      // 用户取消或不支持
    }
  })
}

onShow(() => {
  loadStudents()
})
</script>

<style lang="scss" scoped>
.students-page {
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

/* 学员卡片 */
.student-card {
  display: flex;
  align-items: flex-start;
  background-color: #fff;
  border-radius: 16rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.student-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, $uni-color-primary-light, $uni-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 20rpx;

  .avatar-text {
    font-size: 36rpx;
    font-weight: bold;
    color: #fff;
  }
}

.student-info {
  flex: 1;
  min-width: 0;
}

.info-top {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 6rpx;

  .student-name {
    font-size: 30rpx;
    font-weight: 600;
    color: $uni-text-color;
  }

  .student-age {
    font-size: 24rpx;
    color: $uni-color-primary;
    background-color: $uni-color-primary-lighter;
    padding: 2rpx 12rpx;
    border-radius: 6rpx;
  }
}

.student-phone {
  font-size: 26rpx;
  color: $uni-text-color-tertiary;
  margin-bottom: 10rpx;
}

.course-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-bottom: 10rpx;
}

.course-tag {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 6rpx;
  background-color: #e6f7ff;
  color: #1890ff;
  max-width: 200rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more-tag {
  background-color: $uni-bg-color-grey;
  color: $uni-text-color-tertiary;
}

.info-bottom {
  display: flex;
  align-items: center;
  gap: 16rpx;

  .booking-count {
    font-size: 24rpx;
    color: $uni-text-color-secondary;
  }

  .latest-time {
    font-size: 22rpx;
    color: $uni-text-color-tertiary;
  }
}

/* 联系按钮 */
.action-area {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background-color: #f6ffed;
  flex-shrink: 0;
  margin-left: 12rpx;
  margin-top: 8rpx;

  &:active {
    opacity: 0.7;
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
