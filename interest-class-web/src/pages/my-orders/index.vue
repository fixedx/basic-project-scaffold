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
      <OrderCard
        v-for="order in orderList"
        :key="order.id"
        :order="order"
        role="parent"
        @click="goToDetail(order)"
        @course-click="goToCourse"
        @action="handleAction"
      />

      <!-- 加载更多 -->
      <view class="load-more" v-if="orderList.length > 0">
        <text v-if="loading">加载中...</text>
        <text v-else-if="noMore">没有更多了</text>
      </view>

      <!-- 空状态 -->
      <EmptyState
        v-if="!loading && orderList.length === 0"
        icon="icon-order"
        text="暂无订单记录"
      />
    </view>

    <!-- 退款申请弹窗（公共组件） -->
    <RefundDialog ref="refundDialogRef" @success="onRefundSuccess" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onReachBottom, onPullDownRefresh } from '@dcloudio/uni-app'
import { orderApi, type Order } from '@/api/order'
import StatusTabs from '@/components/StatusTabs/index.vue'
import OrderCard from '@/components/OrderCard/index.vue'
import EmptyState from '@/components/EmptyState/index.vue'
import Loading from '@/components/Loading/index.vue'
import RefundDialog from '@/components/RefundDialog/index.vue'

// 状态标签
const statusTabs = [
  { label: '全部', value: '' },
  { label: '待支付', value: 'pending' },
  { label: '待确认', value: 'pending_confirm' },
  { label: '已确认', value: 'confirmed' },
  { label: '退款中', value: 'refund_pending,refunding' },
  { label: '已完成', value: 'completed,refunded,refund_rejected,cancelled' },
]

const currentStatus = ref('')
const orderList = ref<Order[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const noMore = ref(false)

// 退款弹窗引用
const refundDialogRef = ref<InstanceType<typeof RefundDialog> | null>(null)

// 接收页面参数
onLoad((options) => {
  if (options?.type) {
    const typeMap: Record<string, string> = {
      'all': '',
      'unpaid': 'pending',
      'refund': 'refund_pending,refunding',
    }
    currentStatus.value = typeMap[options.type] ?? options.type
  }
  loadOrders()
})

// 加载订单列表
const loadOrders = async (isLoadMore = false) => {
  if (loading.value) return

  loading.value = true
  try {
    const params: any = {
      page: page.value,
      pageSize: pageSize.value,
    }

    if (currentStatus.value) {
      params.status = currentStatus.value
    }

    const res = await orderApi.getMyList(params)

    if (isLoadMore) {
      orderList.value = [...orderList.value, ...res.data]
    } else {
      orderList.value = res.data
    }

    noMore.value = orderList.value.length >= res.total
  } catch (error: any) {
    uni.showToast({
      title: error.message || '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

// 状态切换
const handleStatusChange = (status: string) => {
  page.value = 1
  noMore.value = false
  loadOrders()
}

// 触底加载
onReachBottom(() => {
  if (noMore.value || loading.value) return
  page.value++
  loadOrders(true)
})

// 下拉刷新
onPullDownRefresh(async () => {
  page.value = 1
  noMore.value = false
  await loadOrders()
  uni.stopPullDownRefresh()
})

// 跳转详情
const goToDetail = (order: Order) => {
  uni.navigateTo({
    url: `/pages/order-detail/index?id=${order.id}`,
  })
}

// 跳转课程
const goToCourse = (courseId: string) => {
  uni.navigateTo({
    url: `/pages/course-detail/index?id=${courseId}`,
  })
}

// 处理操作
const handleAction = async (action: string, order: Order) => {
  switch (action) {
    case 'pay':
      uni.navigateTo({
        url: `/pages/order-pay/index?id=${order.id}`,
      })
      break
    case 'cancel':
      handleCancel(order)
      break
    case 'refund':
      refundDialogRef.value?.open(order.id)
      break
    case 'review':
      uni.navigateTo({
        url: `/pages/course-review/index?orderId=${order.id}&courseId=${order.course_id}`,
      })
      break
  }
}

// 取消订单
const handleCancel = (order: Order) => {
  uni.showModal({
    title: '提示',
    content: '确定要取消此订单吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await orderApi.cancel(order.id)
          uni.showToast({
            title: '取消成功',
            icon: 'success',
          })
          page.value = 1
          noMore.value = false
          loadOrders()
        } catch (error: any) {
          uni.showToast({
            title: error.message || '取消失败',
            icon: 'none',
          })
        }
      }
    },
  })
}

// 退款成功回调
const onRefundSuccess = () => {
  page.value = 1
  noMore.value = false
  loadOrders()
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

.order-list {
  padding: 24rpx;
}

.loading {
  padding: 100rpx 0;
  display: flex;
  justify-content: center;
}

.load-more {
  text-align: center;
  padding: 32rpx;
  font-size: 26rpx;
  color: $uni-text-color-tertiary;
}
</style>