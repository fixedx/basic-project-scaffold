<template>
  <view v-if="isReady" class="page">
    <!-- 收益概览 -->
    <view class="stats-card">
      <view class="stats-row">
        <view class="stats-item">
          <text class="stats-value">¥{{ formatPrice(stats?.stats?.totalCashback || 0) }}</text>
          <text class="stats-label">累计收益</text>
        </view>
        <view class="stats-item">
          <text class="stats-value">¥{{ formatPrice(stats?.stats?.pendingCashback || 0) }}</text>
          <text class="stats-label">待解锁</text>
        </view>
        <view class="stats-item">
          <text class="stats-value">¥{{ formatPrice(stats?.stats?.unlockedCashback || 0) }}</text>
          <text class="stats-label">已解锁</text>
        </view>
      </view>
      <view class="stats-divider"></view>
      <view class="stats-row">
        <view class="stats-item">
          <text class="stats-value primary">{{ stats?.stats?.totalInvites || 0 }}</text>
          <text class="stats-label">邀请人数</text>
        </view>
        <view class="stats-item">
          <text class="stats-value primary">{{ stats?.inviteCode?.use_count || 0 }}</text>
          <text class="stats-label">使用次数</text>
        </view>
      </view>
    </view>
    
    <!-- 状态筛选 -->
    <view class="filter-tabs">
      <view 
        v-for="tab in statusTabs" 
        :key="tab.value"
        class="filter-tab"
        :class="{ 'filter-active': currentStatus === tab.value }"
        @click="currentStatus = tab.value; loadOrders()"
      >
        {{ tab.label }}
      </view>
    </view>
    
    <!-- 订单列表 -->
    <view class="order-list">
      <view v-if="loading" class="loading-tip">
        <wd-loading />
        <text>加载中...</text>
      </view>
      
      <view v-else-if="orders.length === 0" class="empty-tip">
        <text class="iconfont icon-empty"></text>
        <text>暂无邀请订单</text>
      </view>
      
      <view 
        v-else
        v-for="order in orders" 
        :key="order.id"
        class="order-card"
      >
        <view class="order-header">
          <text class="order-time">{{ formatDate(order.created_at) }}</text>
          <view 
            class="order-status"
            :class="getStatusClass(order.status)"
          >
            {{ getStatusText(order.status) }}
          </view>
        </view>
        
        <view class="order-content">
          <view class="order-info">
            <text class="order-label">订单金额</text>
            <text class="order-value">¥{{ formatPrice(order.order_amount) }}</text>
          </view>
          <view class="order-info">
            <text class="order-label">返现比例</text>
            <text class="order-value">{{ order.cashback_ratio }}%</text>
          </view>
          <view class="order-info">
            <text class="order-label">让利比例</text>
            <text class="order-value">{{ order.share_ratio }}%</text>
          </view>
        </view>
        
        <view class="order-footer">
          <view class="cashback-info">
            <text class="cashback-label">预计返现</text>
            <text class="cashback-amount">¥{{ formatPrice(order.actual_cashback) }}</text>
          </view>
          
          <view class="progress-section">
            <view class="progress-header">
              <text class="progress-label">完课进度</text>
              <text class="progress-value">{{ order.completed_lessons }}/{{ order.total_lessons }}</text>
            </view>
            <wd-progress 
              :percentage="Math.round((order.completed_lessons / order.total_lessons) * 100)" 
              :show-text="false"
              color="#52c41a"
            />
          </view>
          
          <view class="unlock-info">
            <text class="unlock-label">已解锁</text>
            <text class="unlock-amount">¥{{ formatPrice(order.unlocked_amount) }}</text>
          </view>
        </view>
      </view>
      
      <!-- 加载更多 -->
      <view v-if="hasMore && orders.length > 0" class="load-more" @click="loadMore">
        <text>加载更多</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { inviteApi, type InviteOrder, type InviteStats } from '@/api'
import { useAuthGuard } from '@/composables/useAuthGuard'

const { isReady } = useAuthGuard()

const stats = ref<InviteStats | null>(null)
const orders = ref<InviteOrder[]>([])
const loading = ref(false)
const currentStatus = ref('')
const page = ref(1)
const pageSize = 10
const hasMore = ref(true)

const statusTabs = [
  { label: '全部', value: '' },
  { label: '待完课', value: 'pending,in_progress' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
]

const formatPrice = (price: number) => {
  return (Number(price) || 0).toFixed(2)
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '待完课',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return map[status] || status
}

const getStatusClass = (status: string) => {
  const map: Record<string, string> = {
    pending: 'status-pending',
    in_progress: 'status-progress',
    completed: 'status-completed',
    cancelled: 'status-cancelled',
  }
  return map[status] || ''
}

const loadStats = async () => {
  try {
    stats.value = await inviteApi.getInviteStats()
  } catch (e) {
    console.error('加载统计失败', e)
  }
}

const loadOrders = async () => {
  loading.value = true
  page.value = 1
  try {
    const res = await inviteApi.getInviteOrders({
      status: currentStatus.value || undefined,
      page: page.value,
      pageSize,
    })
    orders.value = res.data || []
    hasMore.value = (res.data?.length || 0) >= pageSize
  } catch (e) {
    console.error('加载订单失败', e)
  } finally {
    loading.value = false
  }
}

const loadMore = async () => {
  if (!hasMore.value) return
  page.value++
  try {
    const res = await inviteApi.getInviteOrders({
      status: currentStatus.value || undefined,
      page: page.value,
      pageSize,
    })
    orders.value = [...orders.value, ...(res.data || [])]
    hasMore.value = (res.data?.length || 0) >= pageSize
  } catch (e) {
    console.error('加载更多失败', e)
    page.value--
  }
}

onMounted(() => {
  loadStats()
  loadOrders()
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
  padding-bottom: 32rpx;
}

.stats-card {
  background: linear-gradient(135deg, $uni-color-primary 0%, $uni-color-primary-dark 100%);
  padding: 32rpx;
  color: #fff;
}

.stats-row {
  display: flex;
  justify-content: space-around;
}

.stats-item {
  text-align: center;
}

.stats-value {
  font-size: 40rpx;
  font-weight: bold;
  display: block;
  
  &.primary {
    color: #fff;
  }
}

.stats-label {
  font-size: 24rpx;
  opacity: 0.8;
  margin-top: 8rpx;
  display: block;
}

.stats-divider {
  height: 1rpx;
  background: rgba(255, 255, 255, 0.2);
  margin: 24rpx 0;
}

.filter-tabs {
  display: flex;
  background: #fff;
  padding: 24rpx;
  gap: 16rpx;
  position: sticky;
  top: 0;
  z-index: 10;
}

.filter-tab {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  font-size: 26rpx;
  color: $uni-text-color-secondary;
  background: $uni-bg-color-grey;
  border-radius: 8rpx;
  
  &.filter-active {
    background: $uni-color-primary-lighter;
    color: $uni-color-primary;
    font-weight: bold;
  }
}

.order-list {
  padding: 24rpx;
}

.loading-tip,
.empty-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 0;
  color: $uni-text-color-secondary;
  gap: 16rpx;
  
  .iconfont {
    font-size: 80rpx;
    opacity: 0.5;
  }
}

.order-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.order-time {
  font-size: 24rpx;
  color: $uni-text-color-secondary;
}

.order-status {
  font-size: 24rpx;
  padding: 4rpx 16rpx;
  border-radius: 4rpx;
  
  &.status-pending,
  &.status-progress {
    background: $uni-color-warning-lighter;
    color: $uni-color-warning;
  }
  
  &.status-completed {
    background: $uni-color-primary-lighter;
    color: $uni-color-primary;
  }
  
  &.status-cancelled {
    background: $uni-bg-color-grey;
    color: $uni-text-color-tertiary;
  }
}

.order-content {
  display: flex;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx solid $uni-border-color-light;
}

.order-info {
  text-align: center;
}

.order-label {
  font-size: 22rpx;
  color: $uni-text-color-secondary;
  display: block;
}

.order-value {
  font-size: 28rpx;
  font-weight: bold;
  color: $uni-text-color;
  margin-top: 4rpx;
  display: block;
}

.order-footer {
  padding-top: 16rpx;
}

.cashback-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.cashback-label {
  font-size: 26rpx;
  color: $uni-text-color-secondary;
}

.cashback-amount {
  font-size: 32rpx;
  font-weight: bold;
  color: $uni-color-error;
}

.progress-section {
  margin-bottom: 16rpx;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.progress-label,
.progress-value {
  font-size: 24rpx;
  color: $uni-text-color-secondary;
}

.unlock-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.unlock-label {
  font-size: 26rpx;
  color: $uni-text-color-secondary;
}

.unlock-amount {
  font-size: 28rpx;
  font-weight: bold;
  color: $uni-color-primary;
}

.load-more {
  text-align: center;
  padding: 24rpx;
  color: $uni-color-primary;
  font-size: 26rpx;
}
</style>
