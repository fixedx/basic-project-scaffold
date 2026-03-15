<template>
  <view class="page">
    <!-- 状态筛选 -->
    <StatusTabs
      v-model="currentStatus"
      :tabs="statusTabs"
      @change="handleStatusChange"
    />

    <!-- 订单列表 -->
    <view class="order-list">
      <!-- 加载中 -->
      <view v-if="loading && orderList.length === 0" class="loading">
        <Loading text="加载中..." />
      </view>

      <!-- 订单卡片 -->
      <template v-else-if="orderList.length > 0">
        <OrderCard
          v-for="order in orderList"
          :key="order.id"
          :order="order"
          role="admin"
          @click="goToDetail(order)"
          @course-click="goToCourse"
        />

        <!-- 加载更多 -->
        <view class="load-more">
          <wd-loadmore :state="loadMoreState" @load="loadMore" />
        </view>
      </template>

      <!-- 空状态 -->
      <EmptyState
        v-if="!loading && orderList.length === 0"
        icon="icon-order"
        text="暂无订单"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow, onLoad, onPullDownRefresh } from '@dcloudio/uni-app'
import { adminApi } from '@/api/admin'
import type { Order } from '@/api/order'
import StatusTabs from '@/components/StatusTabs/index.vue'
import OrderCard from '@/components/OrderCard/index.vue'
import EmptyState from '@/components/EmptyState/index.vue'
import Loading from '@/components/Loading/index.vue'

// 状态标签
const statusTabs = [
  { label: '全部', value: 'all' },
  { label: '待支付', value: 'pending' },
  { label: '待确认', value: 'pending_confirm' },
  { label: '已确认', value: 'confirmed' },
  { label: '退款中', value: 'refund_pending,refunding' },
  { label: '已完成', value: 'completed,refunded,refund_rejected,cancelled' },
]

const loading = ref(true)
const orderList = ref<Order[]>([])
const currentStatus = ref('all')

// 分页
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const hasMore = computed(() => orderList.value.length < total.value)
const loadMoreState = ref<'loading' | 'finished' | 'error'>('loading')

// 时间筛选参数（可从 URL 传入）
const periodFilter = ref('')
const startDateFilter = ref('')
const endDateFilter = ref('')

onLoad((options) => {
  if (options?.status) {
    currentStatus.value = options.status
  }
  if (options?.period) periodFilter.value = options.period
  if (options?.startDate) startDateFilter.value = options.startDate
  if (options?.endDate) endDateFilter.value = options.endDate
  loadOrders()
})

onShow(() => {
  // 返回时刷新
})

// 加载订单列表
const loadOrders = async (append = false) => {
  if (!append) {
    loading.value = true
    page.value = 1
    orderList.value = []
  }

  try {
    const statusParam = currentStatus.value === 'all' ? undefined : currentStatus.value
    const result = await adminApi.getOrders({
      page: page.value,
      pageSize: pageSize.value,
      status: statusParam,
      period: periodFilter.value || undefined,
      startDate: startDateFilter.value || undefined,
      endDate: endDateFilter.value || undefined,
    })

    if (append) {
      orderList.value.push(...(result.data || []))
    } else {
      orderList.value = result.data || []
    }
    total.value = result.total || 0
    loadMoreState.value = hasMore.value ? 'loading' : 'finished'
  } catch (error) {
    console.error('加载订单列表失败:', error)
    loadMoreState.value = 'error'
  } finally {
    loading.value = false
    if (!append) uni.stopPullDownRefresh()
  }
}

onPullDownRefresh(async () => {
  await loadOrders()
})

// 加载更多
const loadMore = () => {
  if (!hasMore.value) return
  page.value++
  loadOrders(true)
}

// 切换状态
const handleStatusChange = () => {
  loadOrders()
}

// 跳转详情
const goToDetail = (order: Order) => {
  uni.navigateTo({
    url: `/pages/admin/order-detail/index?id=${order.id}`,
  })
}

// 跳转课程（管理端跳转到机构详情）
const goToCourse = (courseId: string) => {
  // 管理端不跳转课程编辑，可考虑跳转机构详情
  uni.showToast({ title: '课程ID: ' + courseId, icon: 'none' })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

.order-list {
  padding: 24rpx 24rpx 48rpx;
}

.loading {
  display: flex;
  justify-content: center;
  padding: 100rpx 0;
}

.load-more {
  padding: 24rpx 0;
}
</style>
