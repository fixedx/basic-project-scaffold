<template>
  <view class="page">
    <view v-if="loading && scheduleList.length === 0" class="loading">
      <Loading text="加载中..." />
    </view>

    <view v-else class="container">
      <view class="hero-card">
        <view class="hero-main">
          <view class="hero-copy">
            <text class="hero-kicker">排课管理</text>
          </view>
          <view class="hero-shortcut" @click="handleBatchAdd">
            <text class="iconfont icon-add hero-shortcut__icon"></text>
            <text class="hero-shortcut__text">批量排课</text>
          </view>
        </view>

        <view class="hero-stats">
          <view class="stat-item">
            <text class="stat-value">{{ summary.total }}</text>
            <text class="stat-label">当前排课</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ summary.active }}</text>
            <text class="stat-label">进行中/待开课</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ summary.full }}</text>
            <text class="stat-label">接近满班</text>
          </view>
        </view>
      </view>

      <view class="filter-section">
        <view class="filter-section__header">
          <text class="filter-title">按星期查看</text>
          <text class="filter-subtitle">{{ selectedDayLabel }}</text>
        </view>
        <scroll-view scroll-x class="filter-scroll" show-scrollbar="false">
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
        </scroll-view>
      </view>

      <view v-if="scheduleList.length > 0" class="schedule-list">
        <view
          v-for="schedule in scheduleList"
          :key="schedule.id"
          class="schedule-card"
          @click="handleEdit(schedule.id)"
        >
          <view class="schedule-time">
            <text class="schedule-time__week">{{ getWeekLabel(schedule.day_of_week) }}</text>
            <text class="schedule-time__start">{{ formatTime(schedule.start_time) }}</text>
            <text class="schedule-time__end">{{ formatTime(schedule.end_time) }}</text>
            <view class="schedule-time__line" :class="`status-${schedule.status}`"></view>
          </view>

          <view class="schedule-main">
            <view class="schedule-head">
              <view class="schedule-head__content">
                <text class="course-title">{{ schedule.course?.title || '未知课程' }}</text>
                <text class="course-subtitle">
                  {{ schedule.teacher?.name || '未指定教师' }} · {{ schedule.classroom?.name || '未指定教室' }}
                </text>
              </view>
              <view class="status-badge" :class="`status-${schedule.status}`">
                {{ getStatusLabel(schedule.status) }}
              </view>
            </view>

            <view class="meta-grid">
              <view class="meta-item">
                <text class="iconfont icon-time meta-icon"></text>
                <text class="meta-text">{{ formatTime(schedule.start_time) }} - {{ formatTime(schedule.end_time) }}</text>
              </view>
              <view class="meta-item">
                <text class="iconfont icon-vip meta-icon"></text>
                <text class="meta-text">{{ schedule.teacher?.name || '未指定教师' }}</text>
              </view>
              <view class="meta-item">
                <text class="iconfont icon-location meta-icon"></text>
                <text class="meta-text">{{ schedule.classroom?.name || '未指定教室' }}</text>
              </view>
              <view class="meta-item">
                <text class="iconfont icon-customer meta-icon"></text>
                <text class="meta-text">{{ Number(schedule.booked_count) || 0 }} / {{ Number(schedule.max_students) || 0 }}人</text>
              </view>
            </view>

            <view class="schedule-footer">
              <view class="capacity-pill" :class="{ warning: isNearlyFull(schedule), full: isFull(schedule) }">
                {{ getCapacityLabel(schedule) }}
              </view>
              <view class="action-btns">
                <view class="mini-action" @click.stop="handleEdit(schedule.id)">编辑</view>
                <view
                  class="mini-action mini-action--danger"
                  :class="{ disabled: Number(schedule.booked_count) > 0 }"
                  @click.stop="Number(schedule.booked_count) === 0 && handleDelete(schedule.id)"
                >
                  删除
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view v-else class="empty-wrap">
        <EmptyState icon="icon-calendar" text="暂无排课" />
      </view>
    </view>

    <PageFooter>
      <wd-button plain @click="handleBatchAdd">批量排课</wd-button>
      <wd-button type="primary" @click="handleAdd">新增排课</wd-button>
    </PageFooter>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { scheduleApi } from '@/api'
import type { Schedule } from '@/api/schedule'
import EmptyState from '@/components/EmptyState/index.vue'
import Loading from '@/components/Loading/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'

const courseId = ref('')
const scheduleList = ref<Schedule[]>([])
const loading = ref(false)
const filterDay = ref('')

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

const weekLabels: Record<string, string> = {
  '1': '周一',
  '2': '周二',
  '3': '周三',
  '4': '周四',
  '5': '周五',
  '6': '周六',
  '7': '周日',
}

const selectedDayLabel = computed(() => {
  return dayFilterOptions.find((item) => item.value === filterDay.value)?.label || '全部'
})

const summary = computed(() => {
  const total = scheduleList.value.length
  const active = scheduleList.value.filter((item) => ['scheduled', 'in_progress'].includes(item.status)).length
  const full = scheduleList.value.filter((item) => isNearlyFull(item)).length

  return {
    total,
    active,
    full,
  }
})

const getWeekLabel = (dayOfWeek: string) => weekLabels[dayOfWeek] || '未设置'

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    scheduled: '待开课',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return map[status] || status
}

const formatTime = (dateStr: string) => {
  if (!dateStr) return '--:--'
  const date = new Date(dateStr)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const isFull = (schedule: Schedule) => {
  const bookedCount = Number(schedule.booked_count) || 0
  const maxStudents = Number(schedule.max_students) || 0
  return maxStudents > 0 && bookedCount >= maxStudents
}

const isNearlyFull = (schedule: Schedule) => {
  const bookedCount = Number(schedule.booked_count) || 0
  const maxStudents = Number(schedule.max_students) || 0
  if (maxStudents <= 0) return false
  return bookedCount / maxStudents >= 0.8
}

const getCapacityLabel = (schedule: Schedule) => {
  const bookedCount = Number(schedule.booked_count) || 0
  const maxStudents = Number(schedule.max_students) || 0

  if (maxStudents <= 0) {
    return '未设置名额'
  }

  if (bookedCount <= 0) {
    return '可立即招生'
  }

  if (bookedCount >= maxStudents) {
    return '已满班'
  }

  return `剩余${Math.max(maxStudents - bookedCount, 0)}个名额`
}

const loadScheduleList = async () => {
  try {
    loading.value = true
    const params: Record<string, string> = {}

    if (courseId.value) {
      params.course_id = courseId.value
    }

    if (filterDay.value) {
      params.day_of_week = filterDay.value
    }

    const res = await scheduleApi.getList(params)
    scheduleList.value = Array.isArray(res) ? res : (res as any)?.data || []
  } catch (error) {
    console.error('加载排课列表失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const handleDayFilter = (value: string) => {
  filterDay.value = value
  loadScheduleList()
}

const handleAdd = () => {
  const url = courseId.value
    ? `/pages/institution/schedule-edit/index?courseId=${courseId.value}`
    : '/pages/institution/schedule-edit/index'
  uni.navigateTo({ url })
}

const handleBatchAdd = () => {
  const url = courseId.value
    ? `/pages/institution/schedule-batch/index?courseId=${courseId.value}`
    : '/pages/institution/schedule-batch/index'
  uni.navigateTo({ url })
}

const handleEdit = (id: string) => {
  uni.navigateTo({
    url: `/pages/institution/schedule-edit/index?id=${id}`,
  })
}

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

onShow(() => {
  loadScheduleList()
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, $uni-color-primary-lighter 0, $uni-bg-color-grey 220rpx);
}

.loading {
  display: flex;
  justify-content: center;
  padding-top: 200rpx;
}

.container {
  padding: 24rpx 24rpx 180rpx;
}

.hero-card {
  margin-bottom: 24rpx;
  padding: 28rpx;
  background-color: $uni-bg-color;
  border-radius: 24rpx;
  box-shadow: 0 12rpx 30rpx rgba(82, 196, 26, 0.08);
}

.hero-main {
  display: flex;
  gap: 16rpx;
  justify-content: space-between;
  align-items: flex-start;
}

.hero-copy {
  flex: 1;
}

.hero-kicker {
  display: block;
  margin-bottom: 10rpx;
  font-size: 24rpx;
  color: $uni-color-primary;
}

.hero-title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: $uni-text-color;
}

.hero-desc {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: $uni-text-color-secondary;
}

.hero-shortcut {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 14rpx 18rpx;
  background-color: $uni-color-primary-lighter;
  border-radius: 16rpx;
  color: $uni-color-primary;
  flex-shrink: 0;
}

.hero-shortcut__icon {
  font-size: 24rpx;
}

.hero-shortcut__text {
  font-size: 24rpx;
  font-weight: 600;
}

.hero-stats {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
}

.stat-item {
  flex: 1;
  padding: 20rpx;
  background-color: $uni-bg-color-tertiary;
  border-radius: 18rpx;
}

.stat-value {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: $uni-text-color;
}

.stat-label {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  line-height: 1.5;
  color: $uni-text-color-secondary;
}

.filter-section {
  margin-bottom: 24rpx;
  padding: 24rpx;
  background-color: $uni-bg-color;
  border-radius: 24rpx;
}

.filter-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.filter-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $uni-text-color;
}

.filter-subtitle {
  font-size: 24rpx;
  color: $uni-text-color-secondary;
}

.filter-scroll {
  white-space: nowrap;
}

.filter-tabs {
  display: inline-flex;
  gap: 16rpx;
}

.filter-tab {
  min-width: 104rpx;
  padding: 14rpx 24rpx;
  font-size: 26rpx;
  color: $uni-text-color-secondary;
  background-color: $uni-bg-color-grey;
  border-radius: 999rpx;
  text-align: center;
  transition: all 0.3s;

  &.active {
    background-color: $uni-color-primary;
    color: $uni-text-color-inverse;
    box-shadow: 0 8rpx 18rpx rgba(82, 196, 26, 0.2);
  }
}

.schedule-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.schedule-card {
  display: flex;
  gap: 20rpx;
  padding: 24rpx;
  background-color: $uni-bg-color;
  border-radius: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.05);
}

.schedule-time {
  width: 132rpx;
  padding-right: 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.schedule-time__week {
  font-size: 22rpx;
  color: $uni-color-primary;
  background-color: $uni-color-primary-lighter;
  border-radius: 999rpx;
  padding: 6rpx 16rpx;
}

.schedule-time__start {
  margin-top: 18rpx;
  font-size: 34rpx;
  font-weight: 700;
  color: $uni-text-color;
}

.schedule-time__end {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: $uni-text-color-secondary;
}

.schedule-time__line {
  width: 8rpx;
  flex: 1;
  min-height: 120rpx;
  margin-top: 18rpx;
  border-radius: 999rpx;
  background-color: $uni-border-color-light;

  &.status-scheduled {
    background-color: $uni-color-primary;
  }

  &.status-in_progress {
    background-color: $uni-color-info;
  }

  &.status-completed {
    background-color: $uni-color-success;
  }

  &.status-cancelled {
    background-color: $uni-text-color-disable;
  }
}

.schedule-main {
  flex: 1;
  min-width: 0;
}

.schedule-head {
  display: flex;
  gap: 16rpx;
  justify-content: space-between;
  align-items: flex-start;
}

.schedule-head__content {
  flex: 1;
  min-width: 0;
}

.course-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  line-height: 1.4;
  color: $uni-text-color;
}

.course-subtitle {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: $uni-text-color-secondary;
}

.status-badge {
  padding: 8rpx 18rpx;
  font-size: 22rpx;
  border-radius: 999rpx;
  white-space: nowrap;

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

.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
  margin-top: 20rpx;
}

.meta-item {
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 16rpx 18rpx;
  background-color: $uni-bg-color-tertiary;
  border-radius: 16rpx;
}

.meta-icon {
  margin-right: 10rpx;
  font-size: 24rpx;
  color: $uni-color-primary;
}

.meta-text {
  flex: 1;
  min-width: 0;
  font-size: 24rpx;
  color: $uni-text-color;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.schedule-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16rpx;
  margin-top: 20rpx;
}

.capacity-pill {
  padding: 10rpx 18rpx;
  background-color: $uni-bg-color-grey;
  border-radius: 999rpx;
  font-size: 22rpx;
  color: $uni-text-color-secondary;

  &.warning {
    background-color: #fff7e6;
    color: $uni-color-warning;
  }

  &.full {
    background-color: #fff1f0;
    color: $uni-color-error;
  }
}

.action-btns {
  display: flex;
  gap: 12rpx;
}

.mini-action {
  min-width: 104rpx;
  padding: 12rpx 0;
  border-radius: 999rpx;
  text-align: center;
  font-size: 24rpx;
  color: $uni-color-primary;
  background-color: $uni-color-primary-lighter;

  &.mini-action--danger {
    color: $uni-color-error;
    background-color: #fff1f0;
  }

  &.disabled {
    color: $uni-text-color-disable;
    background-color: #fafafa;
  }
}

.empty-wrap {
  padding: 80rpx 0 40rpx;
  background-color: $uni-bg-color;
  border-radius: 24rpx;
}
</style>
