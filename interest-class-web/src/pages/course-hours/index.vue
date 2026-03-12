<template>
  <view class="page">
    <!-- 顶部总览卡片 -->
    <view class="summary-card">
      <view class="summary-main">
        <text class="summary-num">{{ totalRemaining }}</text>
        <text class="summary-label">剩余总课时</text>
      </view>
      <view class="summary-sub">
        <view class="sub-item">
          <text class="sub-num">{{ totalCompleted }}</text>
          <text class="sub-label">已完成</text>
        </view>
        <view class="divider"></view>
        <view class="sub-item">
          <text class="sub-num">{{ totalLessons }}</text>
          <text class="sub-label">总课时</text>
        </view>
        <view class="divider"></view>
        <view class="sub-item">
          <text class="sub-num">{{ orders.length }}</text>
          <text class="sub-label">进行中课程</text>
        </view>
      </view>
    </view>

    <!-- 课时列表 -->
    <view v-if="!loading && orders.length > 0" class="course-list">
      <view class="section-title">课时明细</view>
      <view
        v-for="order in orders"
        :key="order.id"
        class="course-item"
        @click="goToOrderDetail(order.id)"
      >
        <!-- 课程信息 -->
        <view class="course-info">
          <view class="course-header">
            <text class="course-name">{{ order.course_name || '未知课程' }}</text>
            <view class="status-tag" :class="getProgressClass(order)">
              <text>{{ getProgressLabel(order) }}</text>
            </view>
          </view>
          <text class="sku-name">{{ order.sku_name || '' }}</text>
          
          <!-- 进度条 -->
          <view class="progress-wrap">
            <view class="progress-bar">
              <view
                class="progress-fill"
                :style="{ width: getProgressPercent(order) + '%' }"
              ></view>
            </view>
            <text class="progress-text">
              {{ order.completed_lessons || 0 }} / {{ order.total_lessons || 0 }} 课时
            </text>
          </view>
        </view>

        <text class="iconfont icon-right item-arrow"></text>
      </view>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="loading-wrap">
      <Loading text="加载中..." />
    </view>

    <!-- 空状态 -->
    <EmptyState
      v-if="!loading && orders.length === 0"
      icon="icon-order"
      text="暂无进行中的课程"
      desc="报名课程后，课时信息将在这里展示"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { orderApi, type Order } from '@/api/order'
import { getToken } from '@/utils/request'
import Loading from '@/components/Loading/index.vue'
import EmptyState from '@/components/EmptyState/index.vue'

const loading = ref(false)
const orders = ref<Order[]>([])

/** 总课时 */
const totalLessons = computed(() =>
  orders.value.reduce((sum, o) => sum + (o.total_lessons || 0), 0),
)

/** 已完成课时 */
const totalCompleted = computed(() =>
  orders.value.reduce((sum, o) => sum + (o.completed_lessons || 0), 0),
)

/** 剩余课时 */
const totalRemaining = computed(() => totalLessons.value - totalCompleted.value)

/** 获取进度百分比 */
const getProgressPercent = (order: Order) => {
  if (!order.total_lessons) return 0
  return Math.round(((order.completed_lessons || 0) / order.total_lessons) * 100)
}

/** 获取进度标签 */
const getProgressLabel = (order: Order) => {
  const percent = getProgressPercent(order)
  if (percent >= 100) return '已完课'
  if (percent > 0) return '学习中'
  return '未开始'
}

/** 获取进度样式 */
const getProgressClass = (order: Order) => {
  const percent = getProgressPercent(order)
  if (percent >= 100) return 'status-completed'
  if (percent > 0) return 'status-learning'
  return 'status-pending'
}

/** 加载订单数据 */
const loadOrders = async () => {
  if (!getToken()) return
  loading.value = true
  try {
    const res = await orderApi.getMyList({ page: 1, pageSize: 100, status: 'confirmed' })
    orders.value = (res?.data || []).filter(
      (o: Order) => (o.total_lessons || 0) > 0,
    )
  } catch (error) {
    console.error('获取课时数据失败:', error)
  } finally {
    loading.value = false
  }
}

/** 跳转订单详情 */
const goToOrderDetail = (orderId: string) => {
  uni.navigateTo({ url: `/pages/order-detail/index?id=${orderId}` })
}

onShow(() => {
  loadOrders()
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
  padding-bottom: 40rpx;
}

/* 顶部总览 */
.summary-card {
  margin: 24rpx 32rpx;
  background: linear-gradient(135deg, $uni-color-primary 0%, $uni-color-primary-dark 100%);
  border-radius: 20rpx;
  padding: 40rpx 32rpx;
  color: #fff;
}

.summary-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32rpx;
}

.summary-num {
  font-size: 72rpx;
  font-weight: 700;
  line-height: 1.2;
}

.summary-label {
  font-size: 26rpx;
  opacity: 0.85;
  margin-top: 4rpx;
}

.summary-sub {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12rpx;
  padding: 20rpx 0;
}

.sub-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.sub-num {
  font-size: 36rpx;
  font-weight: 600;
}

.sub-label {
  font-size: 22rpx;
  opacity: 0.8;
  margin-top: 4rpx;
}

.divider {
  width: 1rpx;
  height: 48rpx;
  background: rgba(255, 255, 255, 0.3);
}

/* 课时列表 */
.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $uni-text-color;
  padding: 24rpx 32rpx 16rpx;
}

.course-list {
  margin: 0;
}

.course-item {
  display: flex;
  align-items: center;
  margin: 0 32rpx 20rpx;
  padding: 28rpx 24rpx;
  background-color: $uni-bg-color;
  border-radius: 16rpx;
}

.course-info {
  flex: 1;
  min-width: 0;
}

.course-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.course-name {
  font-size: 30rpx;
  font-weight: 500;
  color: $uni-text-color;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 16rpx;
}

.sku-name {
  display: block;
  font-size: 24rpx;
  color: $uni-text-color-tertiary;
  margin-bottom: 16rpx;
}

/* 状态标签 */
.status-tag {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 6rpx;
  flex-shrink: 0;

  &.status-completed {
    background-color: rgba(82, 196, 26, 0.1);
    color: $uni-color-success;
  }

  &.status-learning {
    background-color: rgba(24, 144, 255, 0.1);
    color: $uni-color-info;
  }

  &.status-pending {
    background-color: rgba(250, 173, 20, 0.1);
    color: $uni-color-warning;
  }
}

/* 进度条 */
.progress-wrap {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.progress-bar {
  flex: 1;
  height: 12rpx;
  background-color: $uni-bg-color-grey;
  border-radius: 6rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, $uni-color-primary-light, $uni-color-primary);
  border-radius: 6rpx;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 24rpx;
  color: $uni-text-color-secondary;
  flex-shrink: 0;
}

.item-arrow {
  font-size: 24rpx;
  color: $uni-text-color-disable;
  margin-left: 16rpx;
}

/* 加载 & 空状态 */
.loading-wrap {
  display: flex;
  justify-content: center;
  padding: 120rpx 0;
}
</style>
