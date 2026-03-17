<template>
  <view class="page">
    <!-- 状态筛选 -->
    <StatusTabs
      v-if="!commissionOnly"
      v-model="currentStatus"
      :tabs="statusTabs"
      @change="handleStatusChange"
    />

    <view v-if="commissionOnly" class="commission-tip">
      <text class="commission-tip__title">佣金明细</text>
      <text class="commission-tip__desc">仅显示当前机构已确认佣金的订单，金额按实际履约进度计算</text>
    </view>

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
          role="institution"
          @click="goToDetail(order)"
          @course-click="goToCourse"
          @action="handleAction"
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
        :text="commissionOnly ? '暂无佣金明细' : '暂无订单'"
      />
    </view>

    <!-- 退款审批弹窗 -->
    <RefundAuditDialog ref="refundAuditRef" @success="loadOrders" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow, onLoad } from '@dcloudio/uni-app'
import { orderApi, type Order } from '@/api/order'
import { getMyInstitutions } from '@/api/category'
import StatusTabs from '@/components/StatusTabs/index.vue'
import OrderCard from '@/components/OrderCard/index.vue'
import EmptyState from '@/components/EmptyState/index.vue'
import Loading from '@/components/Loading/index.vue'
import RefundAuditDialog from '@/components/RefundAuditDialog/index.vue'
const refundAuditRef = ref<InstanceType<typeof RefundAuditDialog>>()

// 状态标签
const statusTabs = [
  { label: '全部', value: 'all' },
  { label: '待支付', value: 'pending' },
  { label: '待确认', value: 'pending_confirm' },
  { label: '已确认', value: 'confirmed,refund_rejected' },
  { label: '退款中', value: 'refund_pending,refunding' },
  { label: '已完成', value: 'completed,refunded,cancelled' },
]

const loading = ref(true)
const orderList = ref<Order[]>([])
const currentStatus = ref('all')
const commissionOnly = ref(false)

// 分页
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const hasMore = computed(() => orderList.value.length < total.value)
const loadMoreState = ref<'loading' | 'finished' | 'error'>('loading')

// 机构相关
const institutions = ref<any[]>([])
const selectedInstitutionId = ref('')
const institutionColumns = computed(() => institutions.value)

// 时间筛选参数（从 URL 传入）
const periodFilter = ref('')
const startDateFilter = ref('')
const endDateFilter = ref('')

const loadInstitutions = async () => {
    try {
        const result = await getMyInstitutions()
        institutions.value = result || []
        if (institutions.value.length > 0) {
            selectedInstitutionId.value = institutions.value[0].id
        }
    } catch (error) {
        console.error('加载机构列表失败:', error)
    }
}

onLoad((options) => {
  // 先读取 URL 参数
  if (options?.status) {
    currentStatus.value = options.status
  }
  commissionOnly.value = options?.commissionOnly === 'true'
  if (options?.period) periodFilter.value = options.period
  if (options?.startDate) startDateFilter.value = options.startDate
  if (options?.endDate) endDateFilter.value = options.endDate
  // 参数设置完毕后再加载数据
  loadOrders()
})

// 加载订单列表
const loadOrders = async (append = false) => {
  if (!selectedInstitutionId.value) {
     await loadInstitutions(); 
  }
  
  if (!selectedInstitutionId.value) {
     loading.value = false;
     return;
  }

  if (!append) {
    loading.value = true
    page.value = 1
    orderList.value = []
  }

  try {
    const statusParam = currentStatus.value === 'all' ? undefined : currentStatus.value
    const result = await orderApi.getInstitutionList(selectedInstitutionId.value, {
      page: page.value,
      pageSize: pageSize.value,
      status: statusParam,
      period: periodFilter.value || undefined,
      startDate: startDateFilter.value || undefined,
      endDate: endDateFilter.value || undefined,
      commissionOnly: commissionOnly.value || undefined,
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
  }
}

// 加载更多
const loadMore = () => {
  if (!hasMore.value) return
  page.value++
  loadOrders(true)
}

// 切换机构
// Removed manual institution switching since UI is removed
// const handleInstitutionConfirm = ({ value }: any) => {
//   selectedInstitutionId.value = value
//   loadOrders()
// }

// 切换状态
const handleStatusChange = (status: string) => {
  loadOrders()
}

// 跳转详情
const goToDetail = (order: Order) => {
  uni.navigateTo({
    url: `/pages/institution/order-detail/index?id=${order.id}`,
  })
}

// 跳转课程
const goToCourse = (courseId: string) => {
  uni.navigateTo({
    url: `/pages/institution/course-edit/index?id=${courseId}`,
  })
}

// 处理操作
const handleAction = async (action: string, order: Order) => {
  switch (action) {
    case 'confirm':
      handleConfirmOrder(order)
      break
    case 'approve-refund':
    case 'reject-refund':
      handleRefund(order)
      break
  }
}

// 确认订单（在线支付后）
const handleConfirmOrder = (order: Order) => {
  uni.showModal({
    title: '确认订单',
    content: '确认接受该订单吗？确认后学员可以开始上课。',
    success: async (res) => {
      if (res.confirm) {
        try {
          await orderApi.confirm(order.id)
          uni.showToast({ title: '订单已确认', icon: 'success' })
          loadOrders()
        } catch (error: any) {
          uni.showToast({ title: error.message || '操作失败', icon: 'none' })
        }
      }
    }
  })
}

// 处理退款（打开审批弹窗）
const handleRefund = (order: Order) => {
  refundAuditRef.value?.open(order.id)
}

onShow(() => {
  loadInstitutions()
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

.commission-tip {
  margin: 24rpx 24rpx 0;
  padding: 24rpx;
  background: #f6ffed;
  border-radius: 16rpx;
  border: 1rpx solid #b7eb8f;

  &__title {
    display: block;
    font-size: 28rpx;
    font-weight: 600;
    color: #389e0d;
    margin-bottom: 8rpx;
  }

  &__desc {
    display: block;
    font-size: 24rpx;
    color: $uni-text-color-secondary;
  }
}

.institution-selector {
  background-color: $uni-bg-color;
  margin-bottom: 2rpx;
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
  padding: 32rpx 0;
}
</style>