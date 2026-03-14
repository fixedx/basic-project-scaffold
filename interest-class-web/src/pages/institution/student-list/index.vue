<template>
  <view class="student-list-page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <text class="iconfont icon-search search-icon"></text>
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索学员姓名/手机号"
          confirm-type="search"
          @confirm="onSearch"
        />
        <text
          v-if="keyword"
          class="iconfont icon-close clear-icon"
          @click="clearSearch"
        ></text>
      </view>
    </view>

    <!-- 统计信息 -->
    <view class="summary-bar">
      <text class="summary-text">共 {{ total }} 位学员</text>
    </view>

    <!-- 学员列表 -->
    <scroll-view
      scroll-y
      class="student-scroll"
      :style="{ height: scrollHeight + 'px' }"
      @scrolltolower="loadMore"
    >
      <view v-if="studentList.length > 0" class="student-list">
        <view
          v-for="student in studentList"
          :key="student.childId || student.parentUserId + student.name"
          class="student-card"
        >
          <!-- 学员基本信息 -->
          <view class="student-header">
            <view class="student-avatar-wrap">
              <AsyncImage
                v-if="student.avatar"
                :url="student.avatar"
                width="88rpx"
                height="88rpx"
                mode="aspectFill"
                custom-class="student-avatar"
              />
              <view v-else class="avatar-placeholder">
                <text>{{ student.name?.charAt(0) || '?' }}</text>
              </view>
            </view>
            <view class="student-info">
              <view class="name-row">
                <text class="student-name">{{ student.name }}</text>
                <text v-if="student.gender" class="gender-tag" :class="student.gender">
                  {{ student.gender === 'male' ? '♂' : '♀' }}
                </text>
                <text v-if="student.age" class="age-text">{{ student.age }}岁</text>
              </view>
              <view class="meta-row">
                <text v-if="student.phone" class="meta-text">
                  <text class="iconfont icon-phone-fill"></text> {{ student.phone }}
                </text>
              </view>
            </view>
            <view class="course-count-badge">
              <text class="count">{{ student.totalCourses }}</text>
              <text class="label">课程</text>
            </view>
          </view>

          <!-- 课程进度列表 -->
          <view class="course-list">
            <view
              v-for="course in student.courses"
              :key="course.orderId"
              class="course-item"
            >
              <view class="course-info-row">
                <text class="course-name">{{ course.courseName }}</text>
                <text class="order-status" :class="'status-' + course.orderStatus">
                  {{ getOrderStatusText(course.orderStatus) }}
                </text>
              </view>
              <view class="course-sku">
                <text>{{ course.skuName }}</text>
              </view>
              <view class="progress-row">
                <view class="progress-bar-wrap">
                  <view
                    class="progress-bar-fill"
                    :style="{ width: getProgressPercent(course) + '%' }"
                  ></view>
                </view>
                <text class="progress-text">
                  {{ course.completedLessons }}/{{ course.totalLessons }}课时
                </text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <EmptyState
        v-else-if="!loading"
        icon="icon-customer"
        text="暂无学员数据"
        desc="学员通过下单购课后会出现在这里"
      />

      <!-- 加载中 / 没有更多 -->
      <view v-if="loading" class="loading-more">
        <wd-loading />
        <text class="loading-text">加载中...</text>
      </view>
      <view v-else-if="noMore && studentList.length > 0" class="no-more">
        <text>- 没有更多了 -</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { institutionApi, type StudentInfo } from '@/api/institution'
import AsyncImage from '@/components/AsyncImage/index.vue'
import EmptyState from '@/components/EmptyState/index.vue'

const keyword = ref('')
const studentList = ref<StudentInfo[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = 20
const noMore = ref(false)
const scrollHeight = ref(0)

// 时间筛选参数（从 URL 传入）
const periodFilter = ref('')
const startDateFilter = ref('')
const endDateFilter = ref('')

onLoad((options) => {
  const systemInfo = uni.getSystemInfoSync()
  const topHeight = uni.upx2px(180) + (systemInfo.statusBarHeight || 0)
  scrollHeight.value = systemInfo.windowHeight - topHeight

  // 读取时间筛选参数
  if (options?.period) periodFilter.value = options.period
  if (options?.startDate) startDateFilter.value = options.startDate
  if (options?.endDate) endDateFilter.value = options.endDate

  loadStudents()
})

const loadStudents = async (isLoadMore = false) => {
  if (loading.value) return
  loading.value = true

  try {
    const result = await institutionApi.getStudentList({
      page: page.value,
      pageSize,
      keyword: keyword.value || undefined,
      period: periodFilter.value || undefined,
      startDate: startDateFilter.value || undefined,
      endDate: endDateFilter.value || undefined,
    })

    if (result && result.data) {
      if (isLoadMore) {
        studentList.value = [...studentList.value, ...result.data]
      } else {
        studentList.value = result.data
      }
      total.value = result.total
      noMore.value = studentList.value.length >= result.total
    }
  } catch (error) {
    console.error('加载学员列表失败:', error)
  } finally {
    loading.value = false
  }
}

const loadMore = () => {
  if (noMore.value || loading.value) return
  page.value++
  loadStudents(true)
}

const onSearch = () => {
  page.value = 1
  noMore.value = false
  loadStudents()
}

const clearSearch = () => {
  keyword.value = ''
  page.value = 1
  noMore.value = false
  loadStudents()
}

const getProgressPercent = (course: { totalLessons: number; completedLessons: number }) => {
  if (!course.totalLessons || course.totalLessons <= 0) return 0
  return Math.min(100, Math.round((course.completedLessons / course.totalLessons) * 100))
}

const getOrderStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '待支付',
    pending_confirm: '待确认',
    confirmed: '进行中',
    completed: '已完成',
    refund_pending: '退款审批中',
    refunding: '退款中',
    refund_rejected: '退款被拒',
    refunded: '已退款',
    cancelled: '已取消',
  }
  return map[status] || status
}
</script>

<style lang="scss" scoped>
.student-list-page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

.search-bar {
  padding: 20rpx 32rpx;
  background-color: $uni-bg-color;

  .search-input-wrap {
    display: flex;
    align-items: center;
    background-color: $uni-bg-color-grey;
    border-radius: 16rpx;
    padding: 0 24rpx;
    height: 72rpx;

    .search-icon {
      font-size: 32rpx;
      color: $uni-text-color-tertiary;
      margin-right: 12rpx;
    }

    .search-input {
      flex: 1;
      font-size: 28rpx;
      color: $uni-text-color;
    }

    .clear-icon {
      font-size: 28rpx;
      color: $uni-text-color-tertiary;
      padding: 8rpx;
    }
  }
}

.summary-bar {
  padding: 16rpx 32rpx;

  .summary-text {
    font-size: 24rpx;
    color: $uni-text-color-tertiary;
  }
}

.student-scroll {
  padding: 0 32rpx;
  box-sizing: border-box;
}

.student-card {
  background-color: $uni-bg-color;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
  overflow: hidden;

  .student-header {
    display: flex;
    align-items: center;
    padding: 28rpx;
    border-bottom: 1rpx solid $uni-border-color-light;

    .student-avatar-wrap {
      margin-right: 20rpx;
      flex-shrink: 0;

      :deep(.student-avatar) {
        border-radius: 50%;
      }
    }

    .avatar-placeholder {
      width: 88rpx;
      height: 88rpx;
      border-radius: 50%;
      background: linear-gradient(135deg, $uni-color-primary-light 0%, $uni-color-primary 100%);
      display: flex;
      align-items: center;
      justify-content: center;

      text {
        font-size: 36rpx;
        color: #fff;
        font-weight: bold;
      }
    }

    .student-info {
      flex: 1;
      min-width: 0;

      .name-row {
        display: flex;
        align-items: center;
        margin-bottom: 8rpx;

        .student-name {
          font-size: 32rpx;
          font-weight: bold;
          color: $uni-text-color;
          margin-right: 12rpx;
          max-width: 240rpx;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .gender-tag {
          font-size: 24rpx;
          margin-right: 8rpx;

          &.male { color: #1890ff; }
          &.female { color: #eb2f96; }
        }

        .age-text {
          font-size: 24rpx;
          color: $uni-text-color-tertiary;
        }
      }

      .meta-row {
        .meta-text {
          font-size: 24rpx;
          color: $uni-text-color-tertiary;

          .iconfont {
            font-size: 22rpx;
            margin-right: 4rpx;
          }
        }
      }
    }

    .course-count-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12rpx 20rpx;
      background-color: $uni-color-primary-lighter;
      border-radius: 12rpx;
      flex-shrink: 0;

      .count {
        font-size: 36rpx;
        font-weight: bold;
        color: $uni-color-primary;
        font-family: 'DIN Alternate', Arial, sans-serif;
      }

      .label {
        font-size: 20rpx;
        color: $uni-color-primary;
      }
    }
  }

  .course-list {
    padding: 0 28rpx 8rpx;

    .course-item {
      padding: 20rpx 0;
      border-bottom: 1rpx solid $uni-border-color-light;

      &:last-child {
        border-bottom: none;
      }

      .course-info-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8rpx;

        .course-name {
          font-size: 28rpx;
          color: $uni-text-color;
          font-weight: 500;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-right: 16rpx;
        }

        .order-status {
          font-size: 22rpx;
          padding: 4rpx 12rpx;
          border-radius: 6rpx;
          flex-shrink: 0;

          &.status-confirmed {
            background-color: $uni-color-primary-lighter;
            color: $uni-color-primary;
          }
          &.status-completed {
            background-color: #e6f7ff;
            color: #1890ff;
          }
          &.status-pending,
          &.status-pending_confirm {
            background-color: #fff7e6;
            color: #fa8c16;
          }
          &.status-refunding,
          &.status-refund_pending {
            background-color: #fff1f0;
            color: #f5222d;
          }
          &.status-refunded,
          &.status-refund_rejected {
            background-color: #f5f5f5;
            color: $uni-text-color-tertiary;
          }
        }
      }

      .course-sku {
        font-size: 24rpx;
        color: $uni-text-color-tertiary;
        margin-bottom: 12rpx;
      }

      .progress-row {
        display: flex;
        align-items: center;

        .progress-bar-wrap {
          flex: 1;
          height: 12rpx;
          background-color: $uni-bg-color-grey;
          border-radius: 6rpx;
          overflow: hidden;
          margin-right: 16rpx;

          .progress-bar-fill {
            height: 100%;
            background: linear-gradient(90deg, $uni-color-primary-light 0%, $uni-color-primary 100%);
            border-radius: 6rpx;
            transition: width 0.3s ease;
          }
        }

        .progress-text {
          font-size: 22rpx;
          color: $uni-text-color-tertiary;
          flex-shrink: 0;
          min-width: 120rpx;
          text-align: right;
        }
      }
    }
  }
}

.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx;

  .loading-text {
    font-size: 24rpx;
    color: $uni-text-color-tertiary;
    margin-left: 12rpx;
  }
}

.no-more {
  text-align: center;
  padding: 32rpx;

  text {
    font-size: 24rpx;
    color: $uni-text-color-disable;
  }
}
</style>
