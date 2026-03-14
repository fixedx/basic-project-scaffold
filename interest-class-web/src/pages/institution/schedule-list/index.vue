<template>
  <view class="page">
    <view v-if="loading && scheduleList.length === 0" class="loading">
      <Loading text="加载中..." />
    </view>

    <view v-else class="container">
      <!-- 筛选栏 -->
      <view class="filter-bar">
        <view class="filter-tabs">
          <view
            v-for="item in dayFilterOptions"
            :key="item.value"
            class="filter-tab"
            :class="{ active: filterDay === item.value }"
            @click="handleDayFilter(item.value)"
          >
            {{ item.label }}
          </view>
        </view>
        <view class="batch-btn" @click="handleBatchAdd">
          <text class="iconfont icon-add batch-icon"></text>
          <text class="batch-text">批量排课</text>
        </view>
      </view>

      <!-- 排课列表 -->
      <view v-if="scheduleList.length > 0" class="schedule-list">
        <view
          v-for="schedule in scheduleList"
          :key="schedule.id"
          class="schedule-card"
          @click="handleEdit(schedule.id)"
        >
          <view class="card-header">
            <view class="course-title">{{ schedule.course?.title || '未知课程' }}</view>
            <view class="week-tag">{{ getWeekLabel(schedule.day_of_week) }}</view>
          </view>

          <view class="card-body">
            <view class="info-row">
              <text class="iconfont icon-time info-icon"></text>
              <text class="value">{{ formatTime(schedule.start_time) }} - {{ formatTime(schedule.end_time) }}</text>
            </view>
            <view class="info-row">
              <text class="iconfont icon-vip info-icon"></text>
              <text class="value">{{ schedule.teacher?.name || '未指定教师' }}</text>
            </view>
            <view class="info-row">
              <text class="iconfont icon-location info-icon"></text>
              <text class="value">{{ schedule.classroom?.name || '未指定教室' }}</text>
            </view>
            <view class="info-row">
              <text class="iconfont icon-customer info-icon"></text>
              <text class="value">{{ schedule.booked_count || 0 }} / {{ schedule.max_students }}人</text>
            </view>
          </view>

          <view class="card-footer">
            <view class="status-badge" :class="'status-' + schedule.status">
              {{ getStatusLabel(schedule.status) }}
            </view>
            <view class="action-btns">
              <wd-button size="small" @click.stop="handleEdit(schedule.id)">编辑</wd-button>
              <wd-button
                size="small"
                type="error"
                :disabled="schedule.booked_count > 0"
                @click.stop="handleDelete(schedule.id)"
              >
                删除
              </wd-button>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <EmptyState v-else icon="icon-calendar" text="暂无排课" />

      <!-- 悬浮添加按钮 -->
      <view class="fab" @click="handleAdd">
        <text class="fab-icon">+</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { scheduleApi } from '@/api'
import type { Schedule } from '@/api/schedule'
import Loading from '@/components/Loading/index.vue'
import EmptyState from '@/components/EmptyState/index.vue'

// 页面参数
const courseId = ref('')

// 列表数据
const scheduleList = ref<Schedule[]>([])
const loading = ref(false)

// 筛选条件
const filterDay = ref('')

// 星期筛选选项
const dayFilterOptions = [
  { label: '全部', value: '' },
  { label: '周一', value: '1' },
  { label: '周二', value: '2' },
  { label: '周三', value: '3' },
  { label: '周四', value: '4' },
  { label: '周五', value: '5' },
  { label: '周六', value: '6' },
  { label: '周日', value: '7' },
]

// 星期标签
const weekLabels: Record<string, string> = {
  '1': '周一', '2': '周二', '3': '周三', '4': '周四',
  '5': '周五', '6': '周六', '7': '周日',
}

const getWeekLabel = (dayOfWeek: string) => weekLabels[dayOfWeek] || ''

// 状态标签
const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    scheduled: '已排课',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return map[status] || status
}

// 格式化时间 (只显示 HH:mm)
const formatTime = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

// 加载排课列表
const loadScheduleList = async () => {
  try {
    loading.value = true
    const params: any = {}

    if (courseId.value) {
      params.course_id = courseId.value
    }

    if (filterDay.value) {
      params.day_of_week = filterDay.value
    }

    const res = await scheduleApi.getList(params)
    // 兼容分页和数组两种返回
    scheduleList.value = Array.isArray(res) ? res : (res as any)?.data || []
  } catch (error) {
    console.error('加载排课列表失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

// 切换星期筛选
const handleDayFilter = (value: string) => {
  filterDay.value = value
  loadScheduleList()
}

// 创建排课
const handleAdd = () => {
  const url = courseId.value
    ? `/pages/institution/schedule-edit/index?courseId=${courseId.value}`
    : '/pages/institution/schedule-edit/index'
  uni.navigateTo({ url })
}

// 批量创建排课
const handleBatchAdd = () => {
  const url = courseId.value
    ? `/pages/institution/schedule-batch/index?courseId=${courseId.value}`
    : '/pages/institution/schedule-batch/index'
  uni.navigateTo({ url })
}

// 编辑排课
const handleEdit = (id: string) => {
  uni.navigateTo({
    url: `/pages/institution/schedule-edit/index?id=${id}`,
  })
}

// 删除排课
const handleDelete = (id: string) => {
  uni.showModal({
    title: '提示',
    content: '确定要删除这个排课吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await scheduleApi.delete(id)
          uni.showToast({ title: '删除成功', icon: 'success' })
          await loadScheduleList()
        } catch (error: any) {
          uni.showToast({ title: error.message || '删除失败', icon: 'none' })
        }
      }
    },
  })
}

onLoad((options: any) => {
  if (options?.courseId) {
    courseId.value = options.courseId
  }
})

// 每次进入页面刷新数据（从编辑页返回时）
onShow(() => {
  loadScheduleList()
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

.loading {
  display: flex;
  justify-content: center;
  padding-top: 200rpx;
}

.container {
  padding-bottom: 160rpx;
}

.filter-bar {
  background-color: $uni-bg-color;
  padding: 24rpx 32rpx;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.filter-tabs {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
  flex: 1;
}

.filter-tab {
  padding: 10rpx 24rpx;
  font-size: 26rpx;
  color: $uni-text-color-secondary;
  background-color: $uni-bg-color-grey;
  border-radius: 8rpx;
  transition: all 0.3s;

  &.active {
    background-color: $uni-color-primary-lighter;
    color: $uni-color-primary;
  }
}

.batch-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 10rpx 20rpx;
  background-color: $uni-color-primary;
  color: $uni-text-color-inverse;
  border-radius: 8rpx;
  flex-shrink: 0;
  white-space: nowrap;
}

.batch-icon {
  font-size: 24rpx;
}

.batch-text {
  font-size: 24rpx;
}

.schedule-list {
  padding: 24rpx 32rpx;
}

.schedule-card {
  background-color: $uni-bg-color;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.course-title {
  font-size: 32rpx;
  font-weight: bold;
  color: $uni-text-color;
  flex: 1;
  margin-right: 16rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.week-tag {
  padding: 8rpx 20rpx;
  font-size: 24rpx;
  background-color: $uni-color-primary-lighter;
  color: $uni-color-primary;
  border-radius: 8rpx;
  flex-shrink: 0;
}

.card-body {
  margin-bottom: 24rpx;
}

.info-row {
  display: flex;
  align-items: center;
  font-size: 28rpx;
  color: $uni-text-color-secondary;
  margin-bottom: 12rpx;

  &:last-child {
    margin-bottom: 0;
  }

  .info-icon {
    font-size: 26rpx;
    margin-right: 8rpx;
    width: 32rpx;
    text-align: center;
  }

  .value {
    color: $uni-text-color;
  }
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 24rpx;
  border-top: 1rpx solid $uni-border-color-light;
}

.status-badge {
  font-size: 24rpx;
  padding: 6rpx 16rpx;
  border-radius: 8rpx;

  &.status-scheduled {
    background-color: $uni-color-primary-lighter;
    color: $uni-color-primary;
  }

  &.status-in_progress {
    background-color: #e6f7ff;
    color: $uni-color-info;
  }

  &.status-completed {
    background-color: #f6ffed;
    color: $uni-color-success;
  }

  &.status-cancelled {
    background-color: #fafafa;
    color: $uni-text-color-disable;
  }
}

.action-btns {
  display: flex;
  gap: 16rpx;
}

.fab {
  position: fixed;
  right: 32rpx;
  bottom: 32rpx;
  width: 112rpx;
  height: 112rpx;
  background-color: $uni-color-primary;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(82, 196, 26, 0.4);
  z-index: 100;
}

.fab-icon {
  font-size: 64rpx;
  color: $uni-text-color-inverse;
  font-weight: 300;
}
</style>
