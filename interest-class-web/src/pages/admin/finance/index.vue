<template>
  <view class="page">
    <!-- 时间筛选 -->
    <view class="period-bar">
      <scroll-view scroll-x class="period-scroll">
        <view class="period-list">
          <view
            v-for="p in periods"
            :key="p.value"
            class="period-tag"
            :class="{ active: currentPeriod === p.value }"
            @click="switchPeriod(p.value)"
          >
            {{ p.label }}
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="content">
      <!-- 佣金概览卡片 -->
      <view class="overview-card" @click="goToCommissionOrders()">
        <view class="overview-header">
          <text class="iconfont icon-money-rmb" style="font-size: 36rpx;"></text>
          <text class="overview-title">佣金概览</text>
          <text class="overview-link">查看明细</text>
        </view>
        <view class="amount-row">
          <view class="amount-block">
            <text class="amount-label">{{ periodLabel }}佣金</text>
            <text class="amount-value accent">¥{{ formatAmount(stats.periodPlatformCommission) }}</text>
          </view>
          <view class="amount-divider"></view>
          <view class="amount-block">
            <text class="amount-label">累计佣金</text>
            <text class="amount-value">¥{{ formatAmount(stats.totalPlatformCommission) }}</text>
          </view>
        </view>
      </view>

      <!-- 订单数据卡片 -->
      <view class="section">
        <view class="section-title">订单数据</view>
        <view class="data-grid">
          <view class="data-cell" @click="goToOrders()">
            <text class="data-num">{{ stats.periodOrders || 0 }}</text>
            <text class="data-label">{{ periodLabel }}订单</text>
          </view>
          <view class="data-cell" @click="goToOrders('confirmed,refund_rejected')">
            <text class="data-num">{{ confirmedCount }}</text>
            <text class="data-label">已确认</text>
          </view>
          <view class="data-cell" @click="goToOrders('completed,refunded,cancelled')">
            <text class="data-num">{{ completedCount }}</text>
            <text class="data-label">已完成</text>
          </view>
          <view class="data-cell" @click="goToOrders('refund_pending,refunding')">
            <text class="data-num">{{ refundingCount }}</text>
            <text class="data-label">退款中</text>
          </view>
        </view>
      </view>

      <!-- 近期订单 -->
      <view class="section">
        <view class="section-title">
          近期订单
          <text class="section-action" @click="goToOrders()">查看全部</text>
        </view>

        <view v-if="loading" class="loading-wrap">
          <Loading text="加载中..." />
        </view>

        <template v-else-if="recentOrders.length > 0">
          <view
            v-for="order in recentOrders"
            :key="order.id"
            class="order-item"
            @click="goToOrderDetail(order.id)"
          >
            <view class="order-top">
              <text class="order-course">{{ order.course_name || '未知课程' }}</text>
              <text class="order-status" :class="getStatusClass(order.status)">
                {{ getStatusLabel(order.status) }}
              </text>
            </view>
            <view class="order-mid">
              <text class="order-no">{{ order.order_no }}</text>
              <text class="order-time">{{ formatTime(order.created_at) }}</text>
            </view>
            <view class="order-bot">
              <view class="order-amount-row">
                <text class="order-amount-label">实付</text>
                <text class="order-amount">¥{{ formatAmount(order.paid_amount) }}</text>
              </view>
              <view class="order-amount-row" v-if="(order.recognized_commission_amount ?? 0) > 0">
                <text class="order-amount-label">已确认佣金</text>
                <text class="order-commission">¥{{ formatAmount(order.recognized_commission_amount) }}</text>
              </view>
              <view class="order-amount-row" v-else-if="order.commission_amount">
                <text class="order-amount-label">佣金</text>
                <text class="order-commission">¥{{ formatAmount(order.commission_amount) }}</text>
              </view>
            </view>
          </view>
        </template>

        <EmptyState
          v-else
          icon="icon-order"
          text="暂无订单数据"
        />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { adminApi } from '@/api/admin'
import type { AdminStats } from '@/api/admin'
import type { Order } from '@/api/order'
import Loading from '@/components/Loading/index.vue'
import EmptyState from '@/components/EmptyState/index.vue'

// 时间周期列表
const periods = [
  { label: '今日', value: 'today' },
  { label: '本周', value: 'thisWeek' },
  { label: '本月', value: 'thisMonth' },
  { label: '近3月', value: 'threeMonths' },
  { label: '半年', value: 'halfYear' },
  { label: '全部', value: 'all' },
]

const currentPeriod = ref('thisMonth')
const loading = ref(true)

// 统计数据
const stats = ref<AdminStats>({
  totalInstitutions: 0,
  pendingAuditCount: 0,
  contractReviewCount: 0,
  contractSignedCount: 0,
  rejectedInstitutions: 0,
  totalUsers: 0,
  totalCourses: 0,
  totalOrders: 0,
  totalBookings: 0,
  totalPlatformCommission: 0,
  periodPlatformCommission: 0,
  periodInstitutions: 0,
  periodUsers: 0,
  periodCourses: 0,
  periodOrders: 0,
  periodBookings: 0,
  pendingReview: 0,
  approvedInstitutions: 0,
})

// 近期订单
const recentOrders = ref<Order[]>([])

// 订单状态统计
const confirmedCount = ref(0)
const completedCount = ref(0)
const refundingCount = ref(0)

const periodLabel = computed(() => {
  const found = periods.find(p => p.value === currentPeriod.value)
  return found ? found.label : ''
})

const formatAmount = (val: any) => {
  const num = Number(val) || 0
  return num.toFixed(2)
}

const formatTime = (str: string) => {
  if (!str) return ''
  const d = new Date(str)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${m}-${day} ${h}:${min}`
}

const statusMap: Record<string, string> = {
  pending: '待支付',
  pending_confirm: '待确认',
  confirmed: '已确认',
  refund_pending: '退款待审',
  refunding: '退款中',
  refund_rejected: '退款驳回',
  refunded: '已退款',
  cancelled: '已取消',
  completed: '已完成',
}

const getStatusLabel = (status: string) => statusMap[status] || status

const getStatusClass = (status: string) => {
  if (['confirmed', 'refund_rejected'].includes(status)) return 'status-active'
  if (['completed'].includes(status)) return 'status-success'
  if (['refund_pending', 'refunding'].includes(status)) return 'status-warning'
  if (['refunded', 'cancelled'].includes(status)) return 'status-grey'
  return 'status-pending'
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const [statsRes, ordersRes] = await Promise.all([
      adminApi.getStats({ period: currentPeriod.value as any }),
      adminApi.getOrders({ page: 1, pageSize: 10 }),
    ])
    stats.value = statsRes as any
    recentOrders.value = (ordersRes as any)?.data || []

    // 统计各状态数量
    await loadStatusCounts()
  } catch (error) {
    console.error('加载财务数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 加载各状态订单数量
const loadStatusCounts = async () => {
  try {
    const [confirmedRes, completedRes, refundingRes] = await Promise.all([
      adminApi.getOrders({ page: 1, pageSize: 1, status: 'confirmed,refund_rejected' }),
      adminApi.getOrders({ page: 1, pageSize: 1, status: 'completed,refunded,cancelled' }),
      adminApi.getOrders({ page: 1, pageSize: 1, status: 'refund_pending,refunding' }),
    ])
    confirmedCount.value = (confirmedRes as any)?.total || 0
    completedCount.value = (completedRes as any)?.total || 0
    refundingCount.value = (refundingRes as any)?.total || 0
  } catch (e) {
    // ignore
  }
}

const switchPeriod = (val: string) => {
  currentPeriod.value = val
  loadData()
}

const goToOrders = (status?: string) => {
  const params = status ? `?status=${status}&period=${currentPeriod.value}` : `?period=${currentPeriod.value}`
  uni.navigateTo({ url: `/pages/admin/orders/index${params}` })
}

const goToCommissionOrders = () => {
  uni.navigateTo({
    url: `/pages/admin/orders/index?commissionOnly=true&period=${currentPeriod.value}`,
  })
}

const goToOrderDetail = (id: string) => {
  uni.navigateTo({ url: `/pages/admin/order-detail/index?id=${id}` })
}

onShow(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: #f5f7fa;
}

// 时间周期筛选栏
.period-bar {
  background: #fff;
  padding: 20rpx 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.period-scroll {
  white-space: nowrap;
}

.period-list {
  display: inline-flex;
  gap: 16rpx;
}

.period-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12rpx 28rpx;
  font-size: 26rpx;
  border-radius: 100rpx;
  background-color: #f2f3f5;
  color: #4e5969;
  transition: all 0.3s;
  flex-shrink: 0;

  &.active {
    background-color: rgba($uni-color-primary, 0.1);
    color: $uni-color-primary;
    font-weight: 500;
    border: 2rpx solid $uni-color-primary;
  }
}

.content {
  padding: 24rpx;
}

// 佣金概览卡片
.overview-card {
  background: linear-gradient(135deg, $uni-color-primary, $uni-color-primary-dark);
  border-radius: 24rpx;
  padding: 36rpx 32rpx;
  margin-bottom: 24rpx;
  color: #fff;
  box-shadow: 0 8rpx 24rpx rgba($uni-color-primary, 0.3);
}

.overview-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 28rpx;
}

.overview-link {
  margin-left: auto;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.88);
}

.overview-title {
  font-size: 30rpx;
  font-weight: 600;
}

.amount-row {
  display: flex;
  align-items: center;
}

.amount-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.amount-label {
  font-size: 24rpx;
  opacity: 0.85;
  margin-bottom: 12rpx;
}

.amount-value {
  font-size: 40rpx;
  font-weight: 700;
  font-family: 'DIN Alternate', 'DIN', sans-serif;

  &.accent {
    font-size: 48rpx;
  }
}

.amount-divider {
  width: 1rpx;
  height: 64rpx;
  background: rgba(255, 255, 255, 0.3);
  margin: 0 24rpx;
}

// Section card
.section {
  margin-bottom: 24rpx;
  padding: 32rpx;
  background-color: #fff;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);

  &:last-child {
    margin-bottom: 0;
  }

  &-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #1d2129;
    margin-bottom: 28rpx;
    display: flex;
    align-items: center;
    justify-content: space-between;
    line-height: 1.4;

    &::before {
      content: '';
      width: 8rpx;
      height: 32rpx;
      background: $uni-color-primary;
      border-radius: 4rpx;
      margin-right: 16rpx;
    }
  }

  &-action {
    font-size: 26rpx;
    font-weight: 400;
    color: $uni-color-primary;
  }
}

// 数据网格
.data-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}

.data-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 0;
  border-radius: 16rpx;
  background: #f7f8fa;
  transition: all 0.2s;

  &:active {
    background: #eef0f3;
  }
}

.data-num {
  font-size: 36rpx;
  font-weight: 700;
  color: #1d2129;
  font-family: 'DIN Alternate', 'DIN', sans-serif;
  margin-bottom: 8rpx;
}

.data-label {
  font-size: 22rpx;
  color: #86909c;
}

// 近期订单列表
.loading-wrap {
  display: flex;
  justify-content: center;
  padding: 80rpx 0;
}

.order-item {
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f0f0f0;

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  &:first-child {
    padding-top: 0;
  }
}

.order-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.order-course {
  font-size: 28rpx;
  font-weight: 500;
  color: #1d2129;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 16rpx;
}

.order-status {
  font-size: 24rpx;
  padding: 4rpx 16rpx;
  border-radius: 100rpx;
  flex-shrink: 0;

  &.status-pending {
    background: #fff7e6;
    color: #d46b08;
  }

  &.status-active {
    background: rgba($uni-color-primary, 0.1);
    color: $uni-color-primary;
  }

  &.status-success {
    background: #f6ffed;
    color: #389e0d;
  }

  &.status-warning {
    background: #fff2e8;
    color: #d4380d;
  }

  &.status-grey {
    background: #f5f5f5;
    color: #8c8c8c;
  }
}

.order-mid {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.order-no {
  font-size: 24rpx;
  color: #86909c;
}

.order-time {
  font-size: 24rpx;
  color: #c9cdd4;
}

.order-bot {
  display: flex;
  align-items: center;
  gap: 32rpx;
}

.order-amount-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.order-amount-label {
  font-size: 24rpx;
  color: #86909c;
}

.order-amount {
  font-size: 28rpx;
  font-weight: 600;
  color: #1d2129;
  font-family: 'DIN Alternate', 'DIN', sans-serif;
}

.order-commission {
  font-size: 28rpx;
  font-weight: 600;
  color: $uni-color-primary;
  font-family: 'DIN Alternate', 'DIN', sans-serif;
}
</style>
